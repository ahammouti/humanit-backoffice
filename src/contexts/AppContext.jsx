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

export const THEMES = {
  blue:   { label: 'Bleu nuit',  bg: '#0c1a47', active: '#1e3a8a', hover: 'rgba(30,58,138,0.6)',  border: 'rgba(30,58,138,0.6)',  navBorder: '#60a5fa', btn: '#1d4ed8', btnH: '#2563eb', preview: '#2563eb' },
  violet: { label: 'Violet',     bg: '#2e1065', active: '#4c1d95', hover: 'rgba(76,29,149,0.6)',  border: 'rgba(76,29,149,0.6)',  navBorder: '#a78bfa', btn: '#6d28d9', btnH: '#7c3aed', preview: '#7c3aed' },
  green:  { label: 'Vert forêt', bg: '#022c22', active: '#064e3b', hover: 'rgba(6,78,59,0.6)',    border: 'rgba(6,78,59,0.6)',    navBorder: '#34d399', btn: '#047857', btnH: '#059669', preview: '#059669' },
  rose:   { label: 'Rose',       bg: '#4c0519', active: '#881337', hover: 'rgba(136,19,55,0.6)',  border: 'rgba(136,19,55,0.6)',  navBorder: '#fb7185', btn: '#be123c', btnH: '#e11d48', preview: '#e11d48' },
  slate:  { label: 'Ardoise',    bg: '#0f172a', active: '#1e293b', hover: 'rgba(30,41,59,0.7)',   border: 'rgba(30,41,59,0.7)',   navBorder: '#818cf8', btn: '#4338ca', btnH: '#6366f1', preview: '#6366f1' },
  amber:  { label: 'Ambre',      bg: '#451a03', active: '#78350f', hover: 'rgba(120,53,15,0.6)',  border: 'rgba(120,53,15,0.6)',  navBorder: '#fbbf24', btn: '#b45309', btnH: '#d97706', preview: '#d97706' },
};

export const DARK_BG_PRESETS = {
  gray:  { label: 'Gris classique', bg: '17,24,39',   s1: '31,41,55',   s2: '55,65,81',   preview: '#111827' },
  slate: { label: 'Slate sombre',   bg: '15,23,42',   s1: '30,41,59',   s2: '51,65,85',   preview: '#0f172a' },
  zinc:  { label: 'Zinc',           bg: '9,9,11',     s1: '24,24,27',   s2: '39,39,42',   preview: '#09090b' },
  black: { label: 'Noir pur',       bg: '0,0,0',      s1: '15,15,15',   s2: '30,30,30',   preview: '#000000' },
  warm:  { label: 'Brun chaud',     bg: '28,20,14',   s1: '41,31,22',   s2: '64,52,40',   preview: '#1c140e' },
  navy:  { label: 'Marine profond', bg: '8,14,44',    s1: '15,25,65',   s2: '25,40,90',   preview: '#080e2c' },
};

function hexToRgb(hex) {
  const m = (hex || '#000').match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  return m ? `${parseInt(m[1],16)},${parseInt(m[2],16)},${parseInt(m[3],16)}` : '0,0,0';
}

export const DEFAULT_CUSTOM_SIDEBAR = { bg: '#0c1a47', accent: '#2563eb' };
export const DEFAULT_CUSTOM_DARKBG  = { bg: '#111827', surface: '#1f2937' };

function applyDarkBg(key, custom = null) {
  const r = document.documentElement.style;
  if (key === 'custom' && custom) {
    const bgRgb  = hexToRgb(custom.bg);
    const s1Rgb  = hexToRgb(custom.surface);
    const s2 = custom.surface; // derive s2 slightly lighter
    r.setProperty('--dk-bg', bgRgb);
    r.setProperty('--dk-s1', s1Rgb);
    r.setProperty('--dk-s2', s1Rgb); // approximate
    return;
  }
  const p = DARK_BG_PRESETS[key] ?? DARK_BG_PRESETS.gray;
  r.setProperty('--dk-bg', p.bg);
  r.setProperty('--dk-s1', p.s1);
  r.setProperty('--dk-s2', p.s2);
}

function applyTheme(key, custom = null) {
  const r = document.documentElement.style;
  if (key === 'custom' && custom) {
    const accRgb = hexToRgb(custom.accent);
    r.setProperty('--s-bg',         custom.bg);
    r.setProperty('--s-active',     `rgba(${accRgb},0.55)`);
    r.setProperty('--s-hover',      `rgba(${accRgb},0.25)`);
    r.setProperty('--s-border',     `rgba(${accRgb},0.35)`);
    r.setProperty('--s-nav-border', custom.accent);
    r.setProperty('--s-btn',        custom.accent);
    r.setProperty('--s-btn-h',      custom.accent);
    return;
  }
  const t = THEMES[key] ?? THEMES.blue;
  r.setProperty('--s-bg',         t.bg);
  r.setProperty('--s-active',     t.active);
  r.setProperty('--s-hover',      t.hover);
  r.setProperty('--s-border',     t.border);
  r.setProperty('--s-nav-border', t.navBorder);
  r.setProperty('--s-btn',        t.btn);
  r.setProperty('--s-btn-h',      t.btnH);
}

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hm_user')) || null; }
    catch { return null; }
  });

  const [isDark, setIsDark] = useState(() => localStorage.getItem('hm_dark') === 'true');
  const [accentTheme, setAccentThemeState] = useState(() => localStorage.getItem('hm_theme') || 'blue');
  const [darkBg, setDarkBgState] = useState(() => localStorage.getItem('hm_darkbg') || 'gray');
  const [customSidebar, setCustomSidebarState] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hm_custom_sidebar')) || DEFAULT_CUSTOM_SIDEBAR; }
    catch { return DEFAULT_CUSTOM_SIDEBAR; }
  });
  const [customDarkBg, setCustomDarkBgState] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hm_custom_darkbg')) || DEFAULT_CUSTOM_DARKBG; }
    catch { return DEFAULT_CUSTOM_DARKBG; }
  });
  const [activityLog, setActivityLog] = useState([]);

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('hm_dark', String(isDark));
  }, [isDark]);

  useLayoutEffect(() => {
    applyTheme(accentTheme, customSidebar);
    localStorage.setItem('hm_theme', accentTheme);
  }, [accentTheme, customSidebar]);

  useLayoutEffect(() => {
    applyDarkBg(darkBg, customDarkBg);
    localStorage.setItem('hm_darkbg', darkBg);
  }, [darkBg, customDarkBg]);

  const setAccentTheme = useCallback((key) => setAccentThemeState(key), []);
  const setDarkBg = useCallback((key) => setDarkBgState(key), []);
  const setCustomSidebar = useCallback((val) => {
    setCustomSidebarState(val);
    localStorage.setItem('hm_custom_sidebar', JSON.stringify(val));
  }, []);
  const setCustomDarkBg = useCallback((val) => {
    setCustomDarkBgState(val);
    localStorage.setItem('hm_custom_darkbg', JSON.stringify(val));
  }, []);

  // Verify token on mount — non-blocking, user already shown from localStorage cache
  useEffect(() => {
    const token = localStorage.getItem('hm_token');
    if (!token) return;
    authApi.getMe()
      .then((user) => {
        const enriched = {
          ...user,
          name: `${user.firstName} ${user.lastName}`,
          initials: (user.firstName[0] + user.lastName[0]).toUpperCase(),
        };
        setCurrentUser(enriched);
        localStorage.setItem('hm_user', JSON.stringify(enriched));
        // Activity log is non-critical — fire and forget, don't block
        getActivity({ limit: 300 }).then(setActivityLog).catch(() => {});
      })
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
    <AppContext.Provider value={{ currentUser, login, logout, isDark, toggleDark, accentTheme, setAccentTheme, customSidebar, setCustomSidebar, darkBg, setDarkBg, customDarkBg, setCustomDarkBg, activityLog, logAction, can }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
