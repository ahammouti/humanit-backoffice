import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  LayoutDashboard, Users, CreditCard, Bell,
  Settings as SettingsIcon, Sparkles, BellRing,
  Search, Moon, Sun, LogOut, Clock, Send,
  Calendar, CalendarDays, Trash2, Menu, X as XIcon, MoreHorizontal,
} from 'lucide-react';

const DASH_PALETTE = ['#10b981','#3b82f6','#f59e0b','#8b5cf6','#ef4444','#06b6d4'];

import { useApp, ROLE_CFG, LOG_ACTIONS } from './contexts/AppContext';
import { NavItem } from './components/ui';
import Login         from './components/Login';
import Dashboard     from './components/Dashboard';
import Donors        from './components/Donors';
import Payments      from './components/Payments';
import Relances      from './components/Relances';
import Settings      from './components/Settings';
import ActivityLog   from './components/ActivityLog';
import GlobalSearch  from './components/GlobalSearch';
import Envois        from './components/Envois';

import * as donorsApi    from './api/donors.js';
import * as paymentsApi  from './api/payments.js';
import * as relancesApi  from './api/relances.js';
import * as envoísApi    from './api/envois.js';
import * as polesApi     from './api/poles.js';
import * as dashboardApi from './api/dashboard.js';

export default function App() {
  const { currentUser, logout, isDark, toggleDark, logAction, activityLog, can } = useApp();

  const [currentTab,   setCurrentTab]   = useState(() => localStorage.getItem('hm_tab') || 'dashboard');
  useEffect(() => { localStorage.setItem('hm_tab', currentTab); }, [currentTab]);
  const [selectedPole, setSelectedPole] = useState(null);
  const [periodMode,   setPeriodMode]   = useState('monthly');

  const [donors,           setDonors]           = useState([]);
  const [donorsTotal,      setDonorsTotal]      = useState(0);
  const [donorsPage,       setDonorsPage]       = useState(1);
  const [donorsTotalPages, setDonorsTotalPages] = useState(1);
  const [payments,      setPayments]      = useState([]);
  const [relances,      setRelances]      = useState([]);
  const [retardDonors,  setRetardDonors]  = useState([]);
  const [polesData,     setPolesData]     = useState([]);
  const [envois,      setEnvois]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [tabLoading,  setTabLoading]  = useState(null);
  const [urgentCount, setUrgentCount] = useState(0);
  const [dashboardKey, setDashboardKey] = useState(0);
  const [donorSearch,     setDonorSearch]     = useState('');
  const [donorStatus,     setDonorStatus]     = useState('all');
  const [donorMinDelay,   setDonorMinDelay]   = useState('');
  const [donorPole,       setDonorPole]       = useState('');
  const [donorFrequency,  setDonorFrequency]  = useState('all');
  const [donorSortBy,     setDonorSortBy]     = useState('lastPayment');
  const [donorSortOrder,  setDonorSortOrder]  = useState('desc');
  const tabLoaded = useRef({});

  const [notifications,   setNotifications]   = useState([]);
  const [showSearch,      setShowSearch]       = useState(false);
  const [searchOpenDonor, setSearchOpenDonor]  = useState(null);
  const [mobileNavOpen,   setMobileNavOpen]    = useState(false);

  // Derived: pole names array for components that expect string[]
  const poles = polesData
    .filter(p => !p.helloassoState || p.helloassoState === 'Public')
    .map(p => p.name);

  // ── INITIAL LOAD — stale-while-revalidate from localStorage cache ──────
  useEffect(() => {
    if (!currentUser) return;
    tabLoaded.current = {};

    // Show cached poles instantly (no spinner if cache exists)
    const cachedPoles = localStorage.getItem('hm_cache_poles');
    if (cachedPoles) {
      try { setPolesData(JSON.parse(cachedPoles)); setLoading(false); } catch { /* ignore */ }
    } else {
      setLoading(true);
    }

    // Show cached urgentCount instantly
    const cachedStats = localStorage.getItem('hm_cache_stats');
    if (cachedStats) {
      try { const s = JSON.parse(cachedStats); setUrgentCount(s.kpis?.urgentCount ?? 0); } catch { /* ignore */ }
    }

    // Revalidate in background — update cache silently
    polesApi.getPoles()
      .then(data => { setPolesData(data); localStorage.setItem('hm_cache_poles', JSON.stringify(data)); })
      .catch(() => addNotification('Erreur chargement des pôles', 'warning'))
      .finally(() => setLoading(false));

    dashboardApi.getStats()
      .then(s => { setUrgentCount(s.kpis?.urgentCount ?? 0); localStorage.setItem('hm_cache_stats', JSON.stringify(s)); })
      .catch(() => {});
  }, [currentUser]);

  // ── LAZY LOAD PER TAB ──────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser || loading) return;
    if (tabLoaded.current[currentTab]) return;
    tabLoaded.current[currentTab] = true;

    const run = async () => {
      if (currentTab === 'donors') {
        await loadDonorsPage(1, { sortBy: donorSortBy, sortOrder: donorSortOrder });
        return;
      }
      setTabLoading(currentTab);
      try {
        if (currentTab === 'payments') {
          const res = await paymentsApi.getPayments({ page: 1, limit: 50 });
          setPayments(res.data);
        } else if (currentTab === 'relances') {
          const [relancesRes, retardRes] = await Promise.all([
            relancesApi.getRelances(),
            donorsApi.getDonors({ status: 'RETARD', limit: 500 }),
          ]);
          setRelances(relancesRes);
          setRetardDonors(retardRes.data ?? []);
          setUrgentCount(retardRes.data?.filter(d => !d.lastContactDate).length ?? 0);
        } else if (currentTab === 'envois') {
          const res = await envoísApi.getEnvois();
          setEnvois(res);
        }
      } catch {
        addNotification('Erreur chargement', 'warning');
      } finally {
        setTabLoading(null);
      }
    };
    run();
  }, [currentTab, currentUser, loading]);

  // Ctrl+K shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch((p) => !p);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const addNotification = useCallback((msg, type = 'success', undoFn = null, duration = 4500) => {
    const id = Date.now() + Math.random();
    setNotifications((prev) => [...prev, { id, msg, type, undoFn }]);
    setTimeout(() => setNotifications((prev) => prev.filter((n) => n.id !== id)), duration);
    return id;
  }, []);

  const dismissNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const loadDonorsPage = useCallback(async (page, overrides = {}) => {
    setTabLoading('donors');
    try {
      const params = { page, limit: 50, ...overrides };
      const res = await donorsApi.getDonors(params);
      setDonors(res.data);
      setDonorsTotal(res.total);
      setDonorsPage(res.page ?? page);
      setDonorsTotalPages(res.pages ?? 1);
    } catch {
      addNotification('Erreur chargement donateurs', 'warning');
    } finally {
      setTabLoading(null);
    }
  }, [addNotification]);

  // ── DONOR SEARCH / FILTER (debounced, server-side) ──────────────────────
  useEffect(() => {
    if (!currentUser || !tabLoaded.current['donors']) return;
    const t = setTimeout(() => {
      const overrides = {};
      if (donorSearch)               overrides.search     = donorSearch;
      if (donorStatus !== 'all')     overrides.status     = donorStatus;
      if (donorMinDelay)             overrides.minDelay   = donorMinDelay;
      if (donorPole)                 overrides.pole       = donorPole;
      if (donorFrequency !== 'all')  overrides.frequency  = donorFrequency;
      overrides.sortBy    = donorSortBy;
      overrides.sortOrder = donorSortOrder;
      loadDonorsPage(1, overrides);
    }, 300);
    return () => clearTimeout(t);
  }, [donorSearch, donorStatus, donorMinDelay, donorPole, donorFrequency, donorSortBy, donorSortOrder]);

  // ── DONOR CRUD ──────────────────────────────────────────────────────────
  const addDonor = useCallback(async (data) => {
    try {
      const donor = await donorsApi.createDonor(data);
      setDonors((prev) => [donor, ...prev]);
      logAction(LOG_ACTIONS.ADD_DONOR, `${data.firstName} ${data.lastName}`, `Pôle : ${data.pole} · ${data.amount} €`);
      addNotification(`✅ ${data.firstName} ${data.lastName} ajouté.`);
    } catch (err) {
      addNotification(err.response?.data?.error ?? 'Erreur ajout donateur', 'warning');
    }
  }, [logAction, addNotification]);

  const updateDonor = useCallback(async (id, updates) => {
    try {
      const donor = await donorsApi.updateDonor(id, updates);
      setDonors((prev) => prev.map((d) => d.id === id ? donor : d));
      // Si passage en ARRETE : notifier + forcer rechargement dashboard
      if (updates.status === 'ARRETE') {
        addNotification('⛔ Donateur marqué comme arrêté. Dashboard mis à jour.', 'warning');
        tabLoaded.current['dashboard'] = false;
        tabLoaded.current['relances'] = false;
        setDashboardKey((k) => k + 1);
        setRetardDonors((prev) => prev.filter((d) => d.id !== id));
        dashboardApi.getStats().then(s => setUrgentCount(s.kpis?.urgentCount ?? 0)).catch(() => {});
      }
    } catch {
      addNotification('Erreur modification donateur', 'warning');
    }
  }, [addNotification]);

  const updateDonorLogged = useCallback(async (id, updates, label) => {
    await updateDonor(id, updates);
    const d = donors.find((d) => d.id === id);
    if (d) logAction(LOG_ACTIONS.UPDATE_DONOR, `${d.firstName} ${d.lastName}`, label ?? '');
  }, [donors, updateDonor, logAction]);

  const bulkUpdateStatus = useCallback(async (ids, status) => {
    try {
      const results = await Promise.allSettled(ids.map(id => donorsApi.updateDonor(id, { status })));
      const succeeded = results.filter(r => r.status === 'fulfilled').map((_, i) => ids[i]);
      setDonors(prev => prev.map(d => succeeded.includes(d.id) ? { ...d, status } : d));
      const label = { ACTIF: '✅', RETARD: '⚠️', ARRETE: '⛔' }[status] ?? '';
      addNotification(`${label} ${succeeded.length} donateur(s) passés en ${status}.`, status === 'ARRETE' ? 'warning' : 'success');
      tabLoaded.current['dashboard'] = false;
      setDashboardKey(k => k + 1);
      dashboardApi.getStats().then(s => setUrgentCount(s.kpis?.urgentCount ?? 0)).catch(() => {});
    } catch {
      addNotification('Erreur modification groupée', 'warning');
    }
  }, [addNotification]);

  const bulkDelete = useCallback(async (ids) => {
    try {
      await Promise.allSettled(ids.map(id => donorsApi.deleteDonor(id)));
      setDonors(prev => prev.filter(d => !ids.includes(d.id)));
      setDonorsTotal(prev => Math.max(0, prev - ids.length));
      addNotification(`🗑 ${ids.length} donateur(s) supprimés.`, 'warning');
      tabLoaded.current['dashboard'] = false;
      setDashboardKey(k => k + 1);
      dashboardApi.getStats().then(s => setUrgentCount(s.kpis?.urgentCount ?? 0)).catch(() => {});
    } catch {
      addNotification('Erreur suppression groupée', 'warning');
    }
  }, [addNotification]);

  const deleteDonor = useCallback(async (id) => {
    const d = donors.find((d) => d.id === id);
    try {
      await donorsApi.deleteDonor(id);
      setDonors((prev) => prev.filter((d) => d.id !== id));
      setDonorsTotal((prev) => Math.max(0, prev - 1));
      if (d) logAction(LOG_ACTIONS.DELETE_DONOR, `${d.firstName} ${d.lastName}`);
      addNotification(
        `${d?.firstName} ${d?.lastName} déplacé en corbeille`,
        'warning',
        async () => {
          try {
            await donorsApi.restoreDonor(id);
            setDonors((prev) => [{ ...d, deletedAt: null }, ...prev]);
            setDonorsTotal((prev) => prev + 1);
            addNotification(`✅ ${d?.firstName} ${d?.lastName} restauré.`);
          } catch {
            addNotification('Erreur restauration', 'warning');
          }
        },
        8000
      );
    } catch {
      addNotification('Erreur suppression donateur', 'warning');
    }
  }, [donors, logAction, addNotification]);

  const [trashedDonors, setTrashedDonors] = useState([]);
  const loadTrash = useCallback(async () => {
    try { setTrashedDonors(await donorsApi.getTrashed()); } catch { /* silencieux */ }
  }, []);
  const restoreDonorFn = useCallback(async (id) => {
    try {
      await donorsApi.restoreDonor(id);
      setTrashedDonors((prev) => prev.filter((d) => d.id !== id));
      tabLoaded.current['donors'] = false;
      loadDonorsPage(donorsPage);
      addNotification('✅ Donateur restauré.');
    } catch { addNotification('Erreur restauration', 'warning'); }
  }, [loadDonorsPage, donorsPage, addNotification]);
  const purgeDonorFn = useCallback(async (id) => {
    try {
      await donorsApi.purgeDonor(id);
      setTrashedDonors((prev) => prev.filter((d) => d.id !== id));
      addNotification('🗑 Suppression définitive effectuée.', 'warning');
    } catch { addNotification('Erreur suppression définitive', 'warning'); }
  }, [addNotification]);

  const rgpdDelete = useCallback(async (donorId) => {
    const d = donors.find((d) => d.id === donorId);
    try {
      await donorsApi.rgpdDelete(donorId);
      setDonors((prev) => prev.filter((d) => d.id !== donorId));
      setPayments((prev) => prev.filter((p) => p.donorId !== donorId));
      setRelances((prev) => prev.filter((r) => r.donorId !== donorId));
      if (d) logAction(LOG_ACTIONS.RGPD_DELETE, `${d.firstName} ${d.lastName}`, 'Suppression complète des données personnelles');
      addNotification('🔒 Données personnelles supprimées (RGPD).', 'warning');
    } catch {
      addNotification('Erreur suppression RGPD', 'warning');
    }
  }, [donors, logAction, addNotification]);

  const rgpdExport = useCallback(async (donorId) => {
    const d = donors.find((d) => d.id === donorId);
    if (!d) return;
    try {
      const data = await donorsApi.rgpdExport(donorId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `rgpd-${d.firstName}-${d.lastName}-${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}.json`;
      a.click();
      logAction(LOG_ACTIONS.RGPD_EXPORT, `${d.firstName} ${d.lastName}`);
      addNotification('📋 Export RGPD téléchargé.');
    } catch {
      addNotification('Erreur export RGPD', 'warning');
    }
  }, [donors, logAction, addNotification]);

  // ── PAYMENT CRUD ────────────────────────────────────────────────────────
  const addPayment = useCallback(async (data) => {
    try {
      const payment = await paymentsApi.createPayment(data);
      setPayments((prev) => [payment, ...prev]);
      // Refresh donor status after payment
      if (data.donorId && data.status === 'Payé') {
        const updated = await donorsApi.getDonor(data.donorId);
        setDonors((prev) => prev.map((d) => d.id === data.donorId ? updated : d));
      }
      logAction(LOG_ACTIONS.ADD_PAYMENT, data.donor, `${data.amount} € · ${data.source}`);
    } catch (err) {
      addNotification(err.response?.data?.error ?? 'Erreur enregistrement paiement', 'warning');
    }
  }, [logAction, addNotification]);

  // ── ENVOI CRUD ──────────────────────────────────────────────────────────
  const addEnvoi = useCallback(async (data) => {
    try {
      const envoi = await envoísApi.createEnvoi(data);
      setEnvois((prev) => [envoi, ...prev]);
      const label = envoi.status === 'planifié'
        ? `📅 Virement planifié — ${envoi.destination}`
        : `✅ Virement enregistré — ${envoi.destination}`;
      addNotification(label);
    } catch {
      addNotification('Erreur création envoi', 'warning');
    }
  }, [addNotification]);

  const updateEnvoi = useCallback(async (id, updates) => {
    try {
      const envoi = await envoísApi.updateEnvoi(id, updates);
      setEnvois((prev) => prev.map((e) => e.id === id ? envoi : e));
      if (updates.status === 'envoyé') addNotification('✅ Virement marqué comme envoyé.');
    } catch {
      addNotification('Erreur mise à jour envoi', 'warning');
    }
  }, [addNotification]);

  // ── RELANCE CRUD ────────────────────────────────────────────────────────
  const addRelance = useCallback(async (data) => {
    try {
      const relance = await relancesApi.createRelance(data);
      setRelances((prev) => [...prev, relance]);
      // Refresh donor contact info in both lists
      const updated = await donorsApi.getDonor(data.donorId);
      setDonors((prev) => prev.map((d) => d.id === data.donorId ? updated : d));
      setRetardDonors((prev) => prev.map((d) => d.id === data.donorId ? updated : d));
      const d = donors.find((d) => d.id === data.donorId);
      if (d) logAction(LOG_ACTIONS.ADD_RELANCE, `${d.firstName} ${d.lastName}`, data.result);
    } catch {
      addNotification('Erreur enregistrement relance', 'warning');
    }
  }, [donors, logAction, addNotification]);

  // ── SYNC COMPLET HELLOASSO ───────────────────────────────────────────────
  const [syncing, setSyncing] = useState(false);

  const handleSyncAll = useCallback(async () => {
    setSyncing(true);
    try {
      // membres : non-fatal (endpoint /members peut être indisponible)
      let membersResult = { created: 0 };
      try { membersResult = await paymentsApi.syncHelloassoMembers(); } catch { /* ignoré */ }

      const paymentsResult = await paymentsApi.syncHelloasso();

      // Invalider le cache de tous les onglets → rechargement au prochain visit
      tabLoaded.current = {};
      const updatedPoles = await polesApi.getPoles();
      setPolesData(updatedPoles);

      // Recharger l'onglet actif immédiatement
      if (currentTab === 'donors') {
        await loadDonorsPage(1);
        tabLoaded.current['donors'] = true;
      } else if (currentTab === 'payments') {
        const res = await paymentsApi.getPayments({ page: 1, limit: 50 });
        setPayments(res.data);
        tabLoaded.current['payments'] = true;
      }

      dashboardApi.getStats().then(s => setUrgentCount(s.kpis?.urgentCount ?? 0)).catch(() => {});

      const parts = [
        (membersResult.created  ?? 0) > 0 && `${membersResult.created} membre(s)`,
        (paymentsResult.imported ?? 0) > 0 && `${paymentsResult.imported} paiement(s)`,
        (paymentsResult.created  ?? 0) > 0 && `${paymentsResult.created} donateur(s)`,
      ].filter(Boolean);
      addNotification(parts.length ? `✅ Sync : ${parts.join(', ')} importé(s).` : 'Déjà à jour.');
      logAction(LOG_ACTIONS.SIMULATE, 'HelloAsso Sync', parts.join(', ') || 'rien de nouveau');
    } catch {
      addNotification('Erreur sync HelloAsso', 'warning');
    }
    setSyncing(false);
  }, [currentTab, logAction, addNotification]);

  // ── RESET DATA (vide la DB sauf users) ──────────────────────────────────
  const handleResetData = useCallback(async () => {
    if (!window.confirm('Supprimer TOUTES les données (donateurs, paiements, pôles) ? Les utilisateurs sont conservés.')) return;
    try {
      await fetch('/api/helloasso/reset', { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('hm_token')}` } });
      tabLoaded.current = {};
      setDonors([]); setDonorsTotal(0); setDonorsPage(1); setDonorsTotalPages(1); setPayments([]); setRelances([]); setEnvois([]); setPolesData([]); setUrgentCount(0); setDashboardKey(k => k + 1);
      addNotification('🗑️ Données supprimées. Lance "Sync HelloAsso" pour tout ré-importer.');
    } catch {
      addNotification('Erreur reset', 'warning');
    }
  }, [addNotification]);

  // Alias pour compatibilité (webhook button)
  const handleSimulateWebhook = handleSyncAll;

  // ── POLES MANAGEMENT ────────────────────────────────────────────────────
  const handleUpdatePoles = useCallback(async (newPoleNames) => {
    const added   = newPoleNames.filter((n) => !poles.includes(n));
    const removed = poles.filter((n) => !newPoleNames.includes(n));

    try {
      for (const name of added) {
        const pole = await polesApi.createPole(name);
        setPolesData((prev) => [...prev, pole]);
      }
      for (const name of removed) {
        const pole = polesData.find((p) => p.name === name);
        if (pole) {
          await polesApi.deletePole(pole.id);
          setPolesData((prev) => prev.filter((p) => p.id !== pole.id));
        }
      }
    } catch (err) {
      addNotification(err.response?.data?.error ?? 'Erreur gestion pôles', 'warning');
      // Reload to restore correct state
      polesApi.getPoles().then(setPolesData).catch(() => {});
    }
  }, [poles, polesData, addNotification]);

  // urgentCount vient du dashboard API (pas besoin de tous les donateurs chargés)

  const handleSearchNavigate = useCallback((tab, donorData) => {
    setCurrentTab(tab);
    if (donorData) setSearchOpenDonor(donorData);
  }, []);

  if (!currentUser) return <Login />;

  const navTo = (tab) => { setCurrentTab(tab); setMobileNavOpen(false); };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 relative overflow-hidden transition-colors duration-200">

      {/* GLOBAL SEARCH */}
      {showSearch && (
        <GlobalSearch
          donors={donors}
          payments={payments}
          relances={relances}
          onNavigate={handleSearchNavigate}
          onClose={() => setShowSearch(false)}
        />
      )}

      {/* TOASTS */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
        {notifications.map((n) => (
          <div key={n.id} className={`px-4 py-3 rounded-xl shadow-2xl font-medium flex items-center gap-2.5 text-white text-sm max-w-sm pointer-events-auto ${n.type === 'warning' ? 'bg-orange-500' : 'bg-green-600'}`}>
            <BellRing className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1">{n.msg}</span>
            {n.undoFn && (
              <button
                onClick={() => { n.undoFn(); dismissNotification(n.id); }}
                className="ml-2 px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold border border-white/30 transition-colors whitespace-nowrap"
              >
                ↩ Annuler
              </button>
            )}
          </div>
        ))}
      </div>

      {/* SIDEBAR OVERLAY (mobile) */}
      {mobileNavOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileNavOpen(false)} />
      )}

      {/* SIDEBAR */}
      <aside className={`w-60 bg-blue-950 text-white flex flex-col shadow-xl flex-shrink-0 fixed md:relative inset-y-0 left-0 z-50 transition-transform duration-300 ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="px-5 py-5 border-b border-blue-900/60 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              Humanit'R <Sparkles className="h-4 w-4 text-blue-300" />
            </h1>
            <p className="text-blue-400 text-xs mt-0.5 font-medium uppercase tracking-widest">Back Office</p>
          </div>
          <button onClick={() => setMobileNavOpen(false)} className="md:hidden p-1.5 text-blue-300 hover:text-white rounded-lg">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto">
          <NavItem icon={<LayoutDashboard />} label="Tableau de bord" active={currentTab === 'dashboard'} onClick={() => navTo('dashboard')} />
          <NavItem icon={<Users />}           label="Donateurs"       active={currentTab === 'donors'}    onClick={() => navTo('donors')} />
          <NavItem icon={<CreditCard />}      label="Paiements"       active={currentTab === 'payments'}  onClick={() => navTo('payments')} />
          <NavItem icon={<Bell />}            label="Relances"        active={currentTab === 'relances'}  onClick={() => navTo('relances')} badge={urgentCount} />
          <NavItem icon={<Send />}            label="Virements"       active={currentTab === 'envois'}    onClick={() => navTo('envois')} />
          {can('viewLog') && (
            <NavItem icon={<Clock />}         label="Journal"         active={currentTab === 'log'}       onClick={() => navTo('log')} />
          )}
          <NavItem icon={<SettingsIcon />}    label="Paramètres"      active={currentTab === 'settings'}  onClick={() => navTo('settings')} />
        </nav>

        <div className="p-4 border-t border-blue-900/60 space-y-2">
          <div className="flex items-center gap-2.5 px-1 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {currentUser.initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{currentUser.name}</p>
              <p className="text-xs text-blue-400">{ROLE_CFG[currentUser.role]?.label}</p>
            </div>
          </div>

          <button
            onClick={handleSyncAll}
            disabled={syncing}
            className="w-full bg-blue-700 hover:bg-blue-600 disabled:opacity-60 text-white text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium"
          >
            <BellRing className="h-3.5 w-3.5" />
            {syncing ? 'Sync en cours…' : 'Sync HelloAsso'}
          </button>
          <button
            onClick={handleResetData}
            className="w-full text-red-400 hover:text-red-300 hover:bg-red-900/30 text-xs py-1.5 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <Trash2 className="h-3 w-3" />
            Réinitialiser les données
          </button>

          <button
            onClick={() => { logAction('🔓 Déconnexion', currentUser.name); logout(); }}
            className="w-full text-blue-400 hover:text-white hover:bg-blue-800 text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 flex flex-col overflow-hidden md:pb-0 pb-16">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm flex-shrink-0 transition-colors duration-200">
          {/* Row 1 — always visible */}
          <div className="px-3 md:px-4 py-2.5 flex items-center gap-2 md:gap-3 min-h-[52px]">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 -ml-1 flex-shrink-0"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100 flex-shrink-0 truncate">
              {currentTab === 'dashboard' && "Vue d'ensemble"}
              {currentTab === 'donors'    && "Donateurs"}
              {currentTab === 'payments'  && "Paiements"}
              {currentTab === 'relances'  && "Relances"}
              {currentTab === 'log'       && "Journal"}
              {currentTab === 'envois'    && "Virements"}
              {currentTab === 'settings'  && "Paramètres"}
            </h2>

            {/* Desktop dashboard controls (inline, center) */}
            {currentTab === 'dashboard' && (
              <div className="hidden md:flex flex-1 items-center justify-center gap-2">
                <select
                  value={selectedPole ?? ''}
                  onChange={e => setSelectedPole(e.target.value || null)}
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm min-w-[180px] max-w-[260px]"
                >
                  <option value="">Tous les projets</option>
                  {polesData.filter(p => !p.helloassoState || p.helloassoState === 'Public').map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
                <div className="w-px h-5 bg-gray-200 dark:bg-gray-600 flex-shrink-0" />
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 gap-0.5 flex-shrink-0">
                  <button onClick={() => setPeriodMode('monthly')} className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${periodMode === 'monthly' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
                    <CalendarDays className="h-3 w-3" /> Mensuel
                  </button>
                  <button onClick={() => setPeriodMode('annual')} className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${periodMode === 'annual' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
                    <Calendar className="h-3 w-3" /> Annuel
                  </button>
                </div>
              </div>
            )}
            <div className="flex-1" />

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setShowSearch(true)}
                className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 rounded-lg text-sm transition-colors"
              >
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">Rechercher</span>
                <kbd className="hidden sm:inline text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 px-1.5 py-0.5 rounded font-mono">Ctrl K</kbd>
              </button>
            <button
              onClick={toggleDark}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 transition-colors"
              title={isDark ? 'Mode clair' : 'Mode sombre'}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {ROLE_CFG[currentUser.role] && (
              <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${ROLE_CFG[currentUser.role].cls}`}>
                {ROLE_CFG[currentUser.role].label}
              </span>
            )}
            </div>
          </div>

          {/* Row 2 — Mobile dashboard controls */}
          {currentTab === 'dashboard' && (
            <div className="md:hidden flex gap-2 px-3 pb-2.5 pt-0.5 border-t border-gray-100 dark:border-gray-700">
              <select
                value={selectedPole ?? ''}
                onChange={e => setSelectedPole(e.target.value || null)}
                className="flex-1 min-w-0 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              >
                <option value="">Tous les projets</option>
                {polesData.filter(p => !p.helloassoState || p.helloassoState === 'Public').map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 gap-0.5 flex-shrink-0">
                <button onClick={() => setPeriodMode('monthly')} className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${periodMode === 'monthly' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
                  <CalendarDays className="h-3 w-3" /> Mens.
                </button>
                <button onClick={() => setPeriodMode('annual')} className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${periodMode === 'annual' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
                  <Calendar className="h-3 w-3" /> Ann.
                </button>
              </div>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
                <p className="text-sm">Chargement…</p>
              </div>
            </div>
          ) : tabLoading === currentTab ? (
            <div className="p-6 space-y-4 animate-pulse">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-14 bg-gray-200 dark:bg-gray-700 rounded-xl" style={{ opacity: 1 - i * 0.12 }} />
              ))}
            </div>
          ) : (
            <>
              {currentTab === 'dashboard' && (
                <Dashboard
                  key={dashboardKey}
                  donors={donors}
                  payments={payments}
                  envois={envois}
                  selectedPole={selectedPole}
                  periodMode={periodMode}
                  onGoToRelances={() => setCurrentTab('relances')}
                  onNavigate={setCurrentTab}
                />
              )}
              {currentTab === 'donors' && (
                <Donors
                  donors={donors} donorsTotal={donorsTotal} donorsPage={donorsPage} donorsTotalPages={donorsTotalPages}
                  onPageChange={(p) => {
                    const overrides = {};
                    if (donorSearch)               overrides.search    = donorSearch;
                    if (donorStatus !== 'all')     overrides.status    = donorStatus;
                    if (donorMinDelay)             overrides.minDelay  = donorMinDelay;
                    if (donorPole)                 overrides.pole      = donorPole;
                    if (donorFrequency !== 'all')  overrides.frequency = donorFrequency;
                    overrides.sortBy    = donorSortBy;
                    overrides.sortOrder = donorSortOrder;
                    loadDonorsPage(p, overrides);
                  }}
                  search={donorSearch} onSearchChange={setDonorSearch}
                  filterStatus={donorStatus} onFilterStatusChange={setDonorStatus}
                  filterDelay={donorMinDelay} onFilterDelayChange={setDonorMinDelay}
                  filterPole={donorPole} onFilterPoleChange={setDonorPole}
                  filterFrequency={donorFrequency} onFilterFrequencyChange={setDonorFrequency}
                  sortBy={donorSortBy} sortOrder={donorSortOrder}
                  onSortChange={(col, order) => { setDonorSortBy(col); setDonorSortOrder(order); }}
                  polesData={polesData}
                  poles={poles}
                  onAdd={addDonor}
                  onUpdate={(id, upd) => updateDonorLogged(id, upd)}
                  onBulkUpdateStatus={bulkUpdateStatus}
                  onBulkDelete={bulkDelete}
                  onDelete={deleteDonor}
                  onAddPayment={(data) => { addPayment(data); addNotification(`✅ Paiement de ${data.amount} € enregistré.`); }}
                  onAddRelance={(data) => { addRelance(data); addNotification('📧 Relance enregistrée.'); }}
                  onRgpdExport={rgpdExport}
                  onRgpdDelete={rgpdDelete}
                  trashedDonors={trashedDonors}
                  onLoadTrash={loadTrash}
                  onRestoreDonor={restoreDonorFn}
                  onPurgeDonor={purgeDonorFn}
                  addNotification={addNotification}
                  can={can}
                  initialOpenDonor={searchOpenDonor}
                  onClearInitialDonor={() => setSearchOpenDonor(null)}
                />
              )}
              {currentTab === 'payments' && (
                <Payments
                  donors={donors} poles={poles}
                  onAdd={async (data) => { await addPayment(data); addNotification(`✅ Paiement de ${data.amount} € enregistré.`); }}
                  can={can}
                />
              )}
              {currentTab === 'relances' && (
                <Relances
                  donors={retardDonors} relances={relances}
                  onAdd={(data) => { addRelance(data); addNotification('📧 Relance enregistrée.'); }}
                  addNotification={addNotification}
                />
              )}
              {currentTab === 'envois' && (
                <Envois envois={envois} onAdd={addEnvoi} onUpdate={updateEnvoi}
                  onRefresh={() => envoísApi.getEnvois().then(setEnvois).catch(() => {})} />
              )}
              {currentTab === 'log' && can('viewLog') && (
                <ActivityLog activityLog={activityLog} />
              )}
              {currentTab === 'settings' && (
                <Settings
                  poles={poles} polesData={polesData} onUpdatePoles={handleUpdatePoles}
                  addNotification={addNotification}
                  can={can}
                />
              )}
            </>
          )}
        </div>
      </main>

      {/* BOTTOM NAV (mobile only) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex safe-area-inset-bottom">
        {[
          { tab: 'dashboard', icon: <LayoutDashboard className="h-5 w-5" />, label: 'Accueil' },
          { tab: 'donors',    icon: <Users           className="h-5 w-5" />, label: 'Donateurs' },
          { tab: 'relances',  icon: <Bell            className="h-5 w-5" />, label: 'Relances', badge: urgentCount },
          { tab: 'payments',  icon: <CreditCard      className="h-5 w-5" />, label: 'Paiements' },
        ].map(({ tab, icon, label, badge }) => (
          <button
            key={tab}
            onClick={() => setCurrentTab(tab)}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative transition-colors ${
              currentTab === tab
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            <div className="relative">
              {icon}
              {badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">{label}</span>
            {currentTab === tab && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />}
          </button>
        ))}
        <button
          onClick={() => setMobileNavOpen(true)}
          className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[10px] font-medium">Plus</span>
        </button>
      </nav>
    </div>
  );
}
