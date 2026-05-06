import React, { createContext, useContext, useState, useCallback, useEffect, useLayoutEffect } from 'react';
import * as authApi from '../api/auth.js';
import { logAction as logActionApi } from '../api/activity.js';
import { getActivity } from '../api/activity.js';

export const ROLE_CFG = {
  admin:     { label: 'Admin',      cls: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700' },
  tresorier: { label: 'Trésorier',  cls: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700' },
  benevole:  { label: 'Bénévole',   cls: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700' },
};

export const PERMS = {
  admin:     { edit: true,  delete: true,  addPayment: true,  manageUsers: true,  viewLog: true  },
  tresorier: { edit: true,  delete: false, addPayment: true,  manageUsers: false, viewLog: true  },
  benevole:  { edit: false, delete: false, addPayment: false, manageUsers: false, viewLog: false },
};

export const LOG_ACTIONS = {
  LOGIN:        '🔐 Connexion',
  LOGOUT:       '🔓 Déconnexion',
  ADD_DONOR:    '➕ Donateur ajouté',
  UPDATE_DONOR: '✏️ Donateur modifié',
  DELETE_DONOR: '🗑️ Donateur supprimé',
  ADD_PAYMENT:  '💳 Paiement enregistré',
  ADD_RELANCE:  '📧 Relance enregistrée',
  EXPORT_CSV:   '📊 Export CSV',
  RGPD_EXPORT:  '📋 Export RGPD',
  RGPD_DELETE:  '🔒 Suppression RGPD',
  SIMULATE:     '🔔 Don simulé',
};

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hm_user')) || null; }
    catch { return null; }
  });

  const [isDark, setIsDark] = useState(() => localStorage.getItem('hm_dark') === 'true');
  const [activityLog, setActivityLog] = useState([]);

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('hm_dark', String(isDark));
  }, [isDark]);

  // Verify token and load activity on mount
  useEffect(() => {
    const token = localStorage.getItem('hm_token');
    if (!token) return;
    authApi.getMe()
      .then((user) => {
        // Ensure name/initials compat
        const enriched = {
          ...user,
          name: `${user.firstName} ${user.lastName}`,
          initials: (user.firstName[0] + user.lastName[0]).toUpperCase(),
        };
        setCurrentUser(enriched);
        localStorage.setItem('hm_user', JSON.stringify(enriched));
        return getActivity({ limit: 300 });
      })
      .then((logs) => logs && setActivityLog(logs))
      .catch(() => {
        localStorage.removeItem('hm_token');
        localStorage.removeItem('hm_user');
        setCurrentUser(null);
      });
  }, []);

  const login = useCallback(async (email, password) => {
    const { token, user } = await authApi.login(email, password);
    localStorage.setItem('hm_token', token);
    const enriched = {
      ...user,
      name: `${user.firstName} ${user.lastName}`,
      initials: (user.firstName[0] + user.lastName[0]).toUpperCase(),
    };
    setCurrentUser(enriched);
    localStorage.setItem('hm_user', JSON.stringify(enriched));

    // Load activity log after login
    getActivity({ limit: 300 }).then(setActivityLog).catch(() => {});

    return enriched;
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setActivityLog([]);
    localStorage.removeItem('hm_token');
    localStorage.removeItem('hm_user');
  }, []);

  const toggleDark = useCallback(() => setIsDark((p) => !p), []);

  const logAction = useCallback((action, subject, details = '') => {
    if (!currentUser) return;

    // Optimistic local update
    setActivityLog((prev) => [{
      id: Date.now().toString() + Math.random(),
      timestamp: new Date().toISOString(),
      userName: currentUser.name,
      userRole: currentUser.role,
      action, subject, details,
    }, ...prev].slice(0, 300));

    // Persist to API (fire and forget)
    logActionApi(action, subject, details).catch(() => {});
  }, [currentUser]);

  const can = useCallback((perm) => {
    if (!currentUser) return false;
    return PERMS[currentUser.role]?.[perm] ?? false;
  }, [currentUser]);

  return (
    <AppContext.Provider value={{ currentUser, login, logout, isDark, toggleDark, activityLog, logAction, can }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
