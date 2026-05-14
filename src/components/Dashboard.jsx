import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { gsap } from 'gsap';
import { getStats, getPoleHistory } from '../api/dashboard.js';
import {
  CheckCircle2, AlertCircle, Clock, CreditCard,
  TrendingUp, TrendingDown, BarChart3, Sparkles, Loader2,
  ChevronRight, ChevronLeft, Send, Globe, FolderOpen, ArrowUpRight, RefreshCw,
} from 'lucide-react';
import { StatCard, BarChart } from './ui';

const MONTH_NAMES = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const CACHE_VERSION = 'v3'; // bump when API response shape changes

function parseDateStr(s) {
  if (!s) return null;
  const p = s.split(' ')[0].split('/');
  return p.length === 3 ? { month: +p[1], year: +p[2] } : null;
}


function calcEnvoiTotal(envoi) {
  const sub   = envoi.items.reduce((s, it) => s + (parseFloat(it.eur) || 0), 0);
  const frais = Math.round(sub * (envoi.fraisPct || 0) / 100 * 100) / 100;
  return Math.round((sub + frais) * 100) / 100;
}

const PALETTE = ['#10b981','#3b82f6','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#ec4899','#f97316','#14b8a6','#a855f7','#eab308','#0ea5e9'];

function DonutChart({ data, centerLabel, centerValue }) {
  const S = 180, cx = 90, cy = 90, r = 61, sw = 30;
  const circ = 2 * Math.PI * r;
  const total = data.reduce((s, d) => s + Math.max(0, d.value), 0);
  const valid = data.filter(d => d.value > 0);
  const wrapRef = useRef(null);
  const dataSig = data.map(d => `${d.label}${d.value}`).join();

  useEffect(() => {
    if (!wrapRef.current) return;
    const segs = wrapRef.current.querySelectorAll('.ds');
    if (!segs.length) return;
    gsap.fromTo(segs,
      { opacity: 0 },
      { opacity: 1, duration: 0.45, stagger: 0.09, ease: 'power2.out' }
    );
  }, [dataSig]);

  if (total === 0) return (
    <div className="relative flex-shrink-0" style={{ width: S, height: S }}>
      <svg viewBox={`0 0 ${S} ${S}`} width={S} height={S}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={sw} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-xs text-gray-400">Aucune donnée</p>
      </div>
    </div>
  );

  let cumLen = 0;
  const segments = valid.map(d => {
    const rawLen = (d.value / total) * circ;
    const segLen = rawLen > 0 ? Math.max(4, rawLen - 3) : 0;
    const offset = -cumLen;
    cumLen += rawLen;
    return { ...d, segLen, offset };
  });

  return (
    <div ref={wrapRef} className="relative flex-shrink-0" style={{ width: S, height: S }}>
      <svg key={dataSig} viewBox={`0 0 ${S} ${S}`} width={S} height={S} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={sw} />
        {segments.map((seg, i) => (
          <circle
            key={i}
            className="ds"
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={sw - 2}
            strokeDasharray={`${seg.segLen} ${circ}`}
            strokeDashoffset={seg.offset}
            opacity={0}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {centerLabel && <p className="text-xs text-gray-400 font-medium">{centerLabel}</p>}
        {centerValue  && <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-0.5">{centerValue}</p>}
      </div>
    </div>
  );
}

export default function Dashboard({ donors, payments, envois = [], selectedPole, periodMode, viewOffset, setViewOffset, onGoToRelances, onNavigate }) {
  const [tab, setTab]                       = useState('global');
  const tabContentRef = useRef(null);
  const prevTabRef    = useRef(null);
  const TAB_ORDER     = ['global', 'projets', 'sorties'];
  const [drillPole, setDrillPole]           = useState(null);
  const [drillYear, setDrillYear]           = useState(null);
  const [drillMonth, setDrillMonth]         = useState(null);
  const [apiStats, setApiStats]             = useState(null);
  const [statsLoading, setStatsLoading]     = useState(true);
  const [navLoading, setNavLoading]         = useState(false);
  const [refreshing, setRefreshing]         = useState(false);
  const [lastRefresh, setLastRefresh]       = useState(null);
  const hasStatsRef                         = useRef(false);
  const [drillHistory, setDrillHistory]     = useState(null);
  const [drillLoading, setDrillLoading]     = useState(false);

  // Compute the viewed period date from offset
  const viewedDate = useMemo(() => {
    const d = new Date();
    if (periodMode === 'annual') d.setFullYear(d.getFullYear() + viewOffset);
    else { d.setDate(1); d.setMonth(d.getMonth() + viewOffset); }
    return d;
  }, [viewOffset, periodMode]);

  const fetchStats = useCallback((pole, { silent = false, offset = 0, mode = 'monthly' } = {}) => {
    const d = new Date();
    if (mode === 'annual') d.setFullYear(d.getFullYear() + offset);
    else { d.setDate(1); d.setMonth(d.getMonth() + offset); }
    const params = { ...(pole ? { pole } : {}), year: d.getFullYear(), month: d.getMonth() + 1 };
    const cacheKey = `hm_cache_stats_${CACHE_VERSION}${pole ? '_' + pole : ''}_${params.year}_${params.month}`;

    if (!silent) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try { setApiStats(JSON.parse(cached)); setStatsLoading(false); } catch { /* ignore */ }
        setNavLoading(true);
      } else if (!hasStatsRef.current) {
        setStatsLoading(true);
      } else {
        setNavLoading(true);
      }
    }

    return getStats(params)
      .then(s => {
        setApiStats(s);
        hasStatsRef.current = true;
        setStatsLoading(false);
        setNavLoading(false);
        setLastRefresh(new Date());
        localStorage.setItem(cacheKey, JSON.stringify(s));
      })
      .catch(() => { setStatsLoading(false); setNavLoading(false); });
  }, []);

  // ── Fetch stats — stale-while-revalidate ────────────────────────────────
  const prevPeriodModeRef = useRef(periodMode);
  useEffect(() => {
    if (prevPeriodModeRef.current !== periodMode) {
      prevPeriodModeRef.current = periodMode;
      // Reset offset; if already 0, fetch immediately; otherwise wait for the
      // offset state change to re-trigger this effect (avoids double fetch).
      if (viewOffset !== 0) { setViewOffset(0); return; }
    }
    fetchStats(selectedPole, { offset: viewOffset, mode: periodMode });
  }, [selectedPole, viewOffset, periodMode, fetchStats]);

  // ── GSAP slide entre onglets ─────────────────────────────────────────────
  useEffect(() => {
    if (!tabContentRef.current) { prevTabRef.current = tab; return; }
    if (!prevTabRef.current) { prevTabRef.current = tab; return; }
    const dir = TAB_ORDER.indexOf(tab) > TAB_ORDER.indexOf(prevTabRef.current) ? 28 : -28;
    prevTabRef.current = tab;
    gsap.fromTo(tabContentRef.current,
      { opacity: 0, x: dir },
      { opacity: 1, x: 0, duration: 0.26, ease: 'power2.out' }
    );
  }, [tab]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStats(selectedPole, { silent: true, offset: viewOffset, mode: periodMode });
    setRefreshing(false);
  }, [selectedPole, fetchStats, viewOffset, periodMode]);

  // ── Filtered donors by selected pole (for drill-down tabs) ───────────────
  const filteredDonors = useMemo(() =>
    selectedPole ? donors.filter(d => d.pole === selectedPole) : donors,
  [donors, selectedPole]);

  // ── KPIs — prefer API stats (instant), fall back to client-side ──────────
  const isCurrentPeriod    = viewOffset === 0;
  const totalActive        = !isCurrentPeriod && apiStats
    ? (periodMode === 'annual' ? (apiStats.kpis.donorsPaidYear ?? 0) : (apiStats.kpis.donorsPaidMonth ?? 0))
    : (apiStats?.kpis.activeCount ?? filteredDonors.filter(d => d.status === 'ACTIF').length);
  const totalDelayed       = !isCurrentPeriod && apiStats
    ? (periodMode === 'annual' ? (apiStats.kpis.notPaidYear ?? 0) : (apiStats.kpis.notPaidMonth ?? 0))
    : (apiStats?.kpis.delayedCount ?? filteredDonors.filter(d => d.status === 'RETARD').length);
  const totalArrete        = apiStats?.kpis.arresteCount      ?? filteredDonors.filter(d => d.status === 'ARRETE').length;
  const expectedMonthly    = apiStats?.kpis.expectedMonthly   ?? filteredDonors.filter(d => d.status !== 'ARRETE' && d.paymentFrequency === 'mensuel').reduce((s, d) => s + d.amount, 0);
  const delayedAmountCurrent = apiStats?.kpis.delayedAmount ?? filteredDonors.filter(d => d.status === 'RETARD').reduce((s, d) => s + d.amount * d.delayMonths, 0);
  // Pour les périodes passées : montant attendu - montant reçu sur la période
  const delayedAmount      = useMemo(() => {
    if (!apiStats) return delayedAmountCurrent;
    const collecte  = periodMode === 'annual' ? apiStats.financials?.collecteAnnuelle : apiStats.financials?.collecteMensuelle;
    const expected  = periodMode === 'annual' ? expectedMonthly * 12 : expectedMonthly;
    if (collecte == null || !expected) return delayedAmountCurrent;
    const gap = Math.max(0, Math.round(expected - collecte));
    return gap;
  }, [apiStats, periodMode, expectedMonthly, delayedAmountCurrent]);
  const retentionRate      = periodMode === 'annual'
    ? (apiStats?.kpis.fidélitéAnnée ?? apiStats?.kpis.retentionRate ?? 0)
    : (apiStats?.kpis.fidélitéMois  ?? apiStats?.kpis.retentionRate ?? 0);
  const ponctuelsCount     = apiStats?.kpis.ponctuelsCount    ?? filteredDonors.filter(d => d.paymentFrequency === 'ponctuel' && d.status !== 'ARRETE').length;
  const ponctuelsThisMonth = apiStats?.kpis.ponctuelsThisMonth ?? 0;

  const now                = new Date();
  const currentMonthSearch = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  const currentMonthName   = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;

  // ── Pole stats — from API (no payments prop needed) ──────────────────────
  const poleStats = apiStats?.byPoleStats ?? [];

  // ── Drill-down data — lazy fetched when user clicks a pole ───────────────
  const drillRec = drillHistory?.rec ?? {};
  const drillExp = drillHistory ? { [drillPole]: drillHistory.expected } : {};

  const urgentCount = apiStats?.kpis.urgentCount ?? 0;
  const toContact = filteredDonors.filter(d => d.status === 'RETARD' && !d.lastContactDate);

  // ── Monthly/yearly stats — switch based on periodMode ───────────────────
  const monthlyStats = useMemo(() => {
    if (periodMode === 'annual' && apiStats?.yearlyStats?.length) return apiStats.yearlyStats;
    if (apiStats?.monthlyStats?.length) return apiStats.monthlyStats;
    const stats = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(viewedDate.getFullYear(), viewedDate.getMonth() - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const received = payments
        .filter(p => {
          if (p.status !== 'Payé') return false;
          const pd = parseDateStr(p.date);
          return pd && pd.month === m && pd.year === y && (!selectedPole || p.pole === selectedPole);
        })
        .reduce((s, p) => s + p.amount, 0);
      stats.push({ month: MONTH_NAMES[d.getMonth()].slice(0, 3), year: y, received, expected: expectedMonthly });
    }
    return stats;
  }, [apiStats, periodMode, payments, selectedPole, expectedMonthly]);


  // ── Lazy-fetch drill history when a pole is selected ─────────────────────
  useEffect(() => {
    if (!drillPole) { setDrillHistory(null); return; }
    setDrillLoading(true);
    getPoleHistory(drillPole)
      .then(setDrillHistory)
      .catch(() => {})
      .finally(() => setDrillLoading(false));
  }, [drillPole]);

  // ── Drill-down helpers ────────────────────────────────────────────────────
  const getYears = (pole) => Object.keys(drillRec).map(Number).sort((a, b) => b - a);

  const getMonthsForYear = (_pole, year) => {
    const paid = new Set(Object.keys(drillRec[year] || {}).map(Number));
    const today = new Date();
    // Add all months up to today that are within the year
    for (let m = 1; m <= 12; m++) {
      if (year < today.getFullYear() || (year === today.getFullYear() && m <= today.getMonth() + 1)) {
        paid.add(m);
      }
    }
    return [...paid].sort((a, b) => a - b);
  };

  const getDonorsForMonth = (pole, year, month) =>
    donors
      .filter(d => d.pole === pole && d.status !== 'ARRETE' && new Date(d.startDate) <= new Date(year, month - 1, 28))
      .map(d => {
        const paid = payments
          .filter(p => p.donorId === d.id && p.status === 'Payé' && (() => { const x = parseDateStr(p.date); return x?.month === month && x?.year === year; })())
          .reduce((s, p) => s + p.amount, 0);
        return { ...d, paidThisMonth: paid, isPaid: paid >= d.amount };
      });

  // ── Envois summary (global card + sorties tab) ───────────────────────────
  const envoisStats = useMemo(() => {
    const sent    = envois.filter(e => e.status !== 'planifié').sort((a, b) => new Date(b.date) - new Date(a.date));
    const planned = envois.filter(e => e.status === 'planifié').sort((a, b) => new Date(a.date) - new Date(b.date));
    const last         = sent[0] ?? null;
    const lastTotal    = last ? calcEnvoiTotal(last) : 0;
    const totalSent    = sent.reduce((s, e) => s + calcEnvoiTotal(e), 0);
    const nextPlan     = planned[0] ?? null;
    const nextPlanTotal = nextPlan ? calcEnvoiTotal(nextPlan) : 0;
    const plannedTotal = planned.reduce((s, e) => s + calcEnvoiTotal(e), 0);
    const plannedCount = planned.length;
    // Group sent by year-month for timeline
    const monthMap = {};
    sent.forEach(e => {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[key]) monthMap[key] = { key, label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`, date: d, envois: [], total: 0 };
      monthMap[key].envois.push(e);
      monthMap[key].total += calcEnvoiTotal(e);
    });
    const sentGroups = Object.values(monthMap).sort((a, b) => b.date - a.date);
    return { last, lastTotal, totalSent, nextPlan, nextPlanTotal, plannedTotal, plannedCount, planned, sentGroups };
  }, [envois]);

  // ── Financial overview data ──────────────────────────────────────────────
  const financialData = useMemo(() => {
    const cy = viewedDate.getFullYear(), cm = viewedDate.getMonth() + 1;
    const periodLabel = periodMode === 'monthly' ? `${MONTH_NAMES[cm - 1]} ${cy}` : `Année ${cy}`;

    const collecte = apiStats?.financials
      ? (periodMode === 'monthly' ? apiStats.financials.collecteMensuelle : apiStats.financials.collecteAnnuelle)
      : 0;
    const depense = apiStats?.financials
      ? (periodMode === 'monthly' ? apiStats.financials.depenseMensuelle : apiStats.financials.depenseAnnuelle)
      : 0;
    const disponible = collecte - depense;

    // Pie data — per-pole breakdown from API
    let pieData;
    if (!selectedPole && apiStats?.byPoleCollected?.length) {
      const hasMensuel = apiStats.byPoleCollected.some(p => p.mensuel !== undefined);
      const candidates = apiStats.byPoleCollected.map(p => ({
        label: p.name,
        value: (periodMode === 'monthly' && hasMensuel) ? (p.mensuel ?? 0) : (p.annuel ?? 0),
      })).filter(d => d.value > 0).map((d, i) => ({
        ...d,
        color: PALETTE[i % PALETTE.length],
      }));
      // If no per-pole data for this period, fall through to collecte/depense pie
      pieData = candidates.length > 0 ? candidates : null;
    }
    if (!pieData) {
      pieData = [
        { label: 'Collecté', color: '#10b981', value: collecte },
        { label: 'Dépensé',  color: '#f59e0b', value: Math.min(depense, collecte) },
        ...(disponible < 0 ? [{ label: 'Déficit', color: '#ef4444', value: -disponible }] : []),
      ].filter(d => d.value > 0);
    }
    return { collecte, depense, disponible, pieData, periodLabel };
  }, [apiStats, selectedPole, periodMode, viewedDate]);

  // ── Shared tab button style ───────────────────────────────────────────────
  const tabCls = t => `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
    tab === t
      ? 'bg-white shadow-sm text-gray-900'
      : 'text-gray-500 hover:text-gray-700'
  }`;

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">

      {/* ── SYNTHÈSE DU MOIS ───────────────────────────────────────────────── */}
      {(!statsLoading || apiStats) && apiStats && (() => {
        const isAnnual = periodMode === 'annual';
        const periodLabel = financialData.periodLabel;

        // Tendance
        let delta = null, deltaRef = null;
        if (isAnnual) {
          const prevYear = apiStats.financials?.collectePrevYear ?? 0;
          if (prevYear > 0 || financialData.collecte > 0) {
            delta    = financialData.collecte - prevYear;
            deltaRef = `${viewedDate.getFullYear() - 1} : ${prevYear.toLocaleString('fr-FR')} €`;
          }
        } else {
          const cur  = monthlyStats[monthlyStats.length - 1];
          const prev = monthlyStats[monthlyStats.length - 2];
          if (cur && prev) {
            delta    = cur.received - prev.received;
            deltaRef = `${prev.month} : ${prev.received.toLocaleString('fr-FR')} €`;
          }
        }

        // Taux de collecte
        const collectExpected = isAnnual ? expectedMonthly * 12 : expectedMonthly;
        const collectActual   = financialData.collecte;
        const collectRate     = collectExpected > 0 ? Math.round(collectActual / collectExpected * 100) : null;
        const collectDetail   = collectExpected > 0
          ? `${collectActual.toLocaleString('fr-FR')} / ${collectExpected.toLocaleString('fr-FR')} €`
          : '—';

        // Priority actions — urgentCount/arrêtés are current-state only, hide for past periods
        const actions = [];
        if (isCurrentPeriod && urgentCount > 0)
          actions.push({ icon: '🔴', text: `${urgentCount} donateur${urgentCount > 1 ? 's' : ''} en retard sans contact — relance urgente`, nav: 'relances' });
        if (!isAnnual) {
          const silentPoles = poleStats.filter(p => p.expected > 0 && p.receivedThisMonth === 0);
          silentPoles.forEach(p => actions.push({ icon: '⚠️', text: `${p.name.slice(0, 35)} — 0 € reçu ce mois (objectif ${p.expected} €)`, nav: 'donors' }));
        } else {
          const monthsElapsed = isCurrentPeriod ? viewedDate.getMonth() + 1 : 12;
          const weakPoles = poleStats.filter(p => p.expected > 0 && (p.receivedAnnuel ?? 0) < p.expected * monthsElapsed * 0.5);
          weakPoles.slice(0, 2).forEach(p => actions.push({ icon: '⚠️', text: `${p.name.slice(0, 35)} — ${(p.receivedAnnuel ?? 0).toLocaleString('fr-FR')} € reçus (retard cumulé)`, nav: 'donors' }));
        }
        if (isCurrentPeriod && totalArrete > 0)
          actions.push({ icon: '🟠', text: `${totalArrete} donateur${totalArrete > 1 ? 's arrêtés' : ' arrêté'} — campagne de réactivation recommandée`, nav: 'donors' });
        if (collectRate !== null && collectRate < 70)
          actions.push({ icon: '📉', text: `Taux de collecte ${isAnnual ? 'annuel' : 'mensuel'} faible : ${collectRate}% de l'objectif atteint`, nav: 'payments' });
        if (actions.length === 0)
          actions.push({ icon: '✅', text: `Aucune alerte critique ${isAnnual ? 'cette année' : 'ce mois'} — bonne dynamique !`, nav: null });

        return (
          <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden transition-opacity duration-200 ${navLoading ? 'opacity-60' : 'opacity-100'}`}>
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              <h3 className="font-bold text-sm text-gray-800 dark:text-gray-100">
                Synthèse — {isAnnual
                  ? viewedDate.getFullYear()
                  : `${MONTH_NAMES[viewedDate.getMonth()]} ${viewedDate.getFullYear()}`}
              </h3>
              {lastRefresh && (
                <span className="hidden sm:inline text-xs text-gray-400 dark:text-gray-500">
                  · mis à jour {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <div className="ml-auto flex items-center gap-2">
                {navLoading && <Loader2 className="h-3.5 w-3.5 text-indigo-400 animate-spin" />}
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors disabled:opacity-50"
                  title="Actualiser la synthèse"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Metric tiles */}
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-gray-100 dark:divide-gray-700 [&>*:nth-child(odd)]:border-r [&>*:nth-child(odd)]:border-gray-100 dark:[&>*:nth-child(odd)]:border-gray-700 lg:[&>*:nth-child(odd)]:border-r-0">
              {/* Tendance */}
              <div className="px-5 py-4">
                <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mb-1">
                  Tendance vs {isAnnual ? 'an préc.' : 'mois préc.'}
                </p>
                {delta !== null ? (
                  <div className="flex items-center gap-1.5">
                    {delta >= 0 ? <TrendingUp className="h-5 w-5 text-emerald-500 flex-shrink-0" /> : <TrendingDown className="h-5 w-5 text-red-500 flex-shrink-0" />}
                    <span className={`text-xl font-black ${delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {delta >= 0 ? '+' : ''}{delta.toLocaleString('fr-FR')} €
                    </span>
                  </div>
                ) : <span className="text-xl font-black text-gray-300 dark:text-gray-600">—</span>}
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{deltaRef ?? '—'}</p>
              </div>

              {/* Taux de collecte */}
              <div className="px-5 py-4">
                <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mb-1">
                  Objectif {isAnnual ? 'annuel' : 'mensuel'}
                </p>
                <span className={`text-xl font-black ${
                  collectRate === null ? 'text-gray-300 dark:text-gray-600' :
                  collectRate >= 90 ? 'text-emerald-600 dark:text-emerald-400' :
                  collectRate >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
                }`}>{collectRate !== null ? `${collectRate}%` : '—'}</span>
                <div className="mt-1.5 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full">
                  <div className={`h-1.5 rounded-full transition-all ${collectRate >= 90 ? 'bg-emerald-500' : collectRate >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(100, collectRate ?? 0)}%` }} />
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{collectDetail}</p>
              </div>

              {/* Récupérable */}
              <div className="px-5 py-4">
                <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mb-1">Récupérable (relances)</p>
                <span className={`text-xl font-black ${delayedAmount > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {delayedAmount > 0 ? `${delayedAmount.toLocaleString('fr-FR')} €` : '0 €'}
                </span>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {totalDelayed} donateur{totalDelayed > 1 ? 's' : ''} en retard
                </p>
              </div>

              {/* Fidélité */}
              <div className="px-5 py-4">
                <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mb-1">Fidélité</p>
                <span className={`text-xl font-black ${retentionRate >= 75 ? 'text-emerald-600 dark:text-emerald-400' : retentionRate >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                  {retentionRate}%
                </span>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {totalActive} actifs · {totalArrete} arrêtés
                </p>
              </div>
            </div>

            {/* Actions prioritaires */}
            <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-3 bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Actions prioritaires</p>
              <div className="space-y-1.5">
                {actions.slice(0, 3).map((a, i) => (
                  <div key={i} onClick={() => a.nav && onNavigate?.(a.nav)}
                    className={`flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300 ${a.nav ? 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400' : ''} transition-colors`}
                  >
                    <span className="flex-shrink-0">{a.icon}</span>
                    <span>{a.text}</span>
                    {a.nav && <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 ml-auto text-gray-300 dark:text-gray-600" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── KPIs ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        <StatCard
          title={isCurrentPeriod ? "Donateurs Actifs" : "Ont payé"}
          value={totalActive}
          subtitle={`${retentionRate}% de fidélité`}
          extra={isCurrentPeriod && apiStats ? (() => {
            const paid = periodMode === 'annual' ? apiStats.kpis.donorsPaidYear : apiStats.kpis.donorsPaidMonth;
            const label = periodMode === 'annual' ? 'ont payé cette année' : 'ont payé ce mois';
            return paid != null ? `↳ ${paid} ${label}` : null;
          })() : null}
          icon={<CheckCircle2 />} color="green" onClick={() => onNavigate?.('donors')}
        />
        <StatCard title={isCurrentPeriod ? "En Retard" : "N'ont pas payé"} value={totalDelayed} subtitle={`${delayedAmount.toLocaleString('fr-FR')} € à récupérer`} icon={<AlertCircle />}  color="red"    onClick={() => onNavigate?.('relances')} />
        <StatCard title="Attendu / mois"    value={`${expectedMonthly.toLocaleString('fr-FR')} €`} subtitle={`mensuel uniquement`}            icon={<CreditCard />}   color="blue"   onClick={() => onNavigate?.('payments')} />
        <StatCard title="Impayés cumulés"   value={`${delayedAmount.toLocaleString('fr-FR')} €`}   subtitle={`${totalArrete} arrêté${totalArrete > 1 ? 's' : ''}`} icon={<Clock />} color="orange" onClick={() => onNavigate?.('relances')} />
        <StatCard title="Dons ponctuels"    value={`${(periodMode === 'annual' ? (apiStats?.kpis.ponctuelsThisYear ?? 0) : ponctuelsThisMonth).toLocaleString('fr-FR')} €`} subtitle={`${ponctuelsCount} donateur${ponctuelsCount > 1 ? 's' : ''} ponctuels`} icon={<Sparkles />} color="purple" onClick={() => onNavigate?.('donors')} />
      </div>

      {/* ── TABS ───────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto -mx-3 md:mx-0 px-3 md:px-0">
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl w-fit min-w-max">
        <button onClick={() => setTab('global')}  className={tabCls('global')}>
          <span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> Vue globale</span>
        </button>
        <button onClick={() => { setTab('projets'); setDrillPole(null); setDrillYear(null); setDrillMonth(null); }} className={tabCls('projets')}>
          <span className="flex items-center gap-1.5"><FolderOpen className="h-3.5 w-3.5" /> Par projet</span>
        </button>
        <button onClick={() => setTab('sorties')} className={tabCls('sorties')}>
          <span className="flex items-center gap-1.5"><Send className="h-3.5 w-3.5" /> Sorties planifiées</span>
        </button>
      </div>
      </div>

      <div ref={tabContentRef} className="space-y-4 md:space-y-6">
      {/* ══════════════════════════════════════════════════════════════════════
          TAB : VUE GLOBALE
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'global' && (<>

        {/* ── FINANCIAL OVERVIEW ─────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-300 dark:border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
            <BarChart3 className="h-4 w-4 text-gray-400" />
            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">
              Analyse financière —{' '}
              {selectedPole
                ? <span className="text-blue-600">{selectedPole.length > 30 ? selectedPole.slice(0, 28) + '…' : selectedPole}</span>
                : 'Tous les projets'
              }
            </h3>
            <span className="ml-auto text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2.5 py-1 rounded-full">
              {financialData.periodLabel}
            </span>
          </div>

          {/* 3 metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 dark:divide-gray-700">
            {/* Collecté */}
            <div className="p-6 group">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Budget collecté</span>
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-none">
                {financialData.collecte.toLocaleString('fr-FR')} €
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Dons reçus · {financialData.periodLabel}</p>
              <div className="mt-4 h-1.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-full">
                <div className="h-1.5 bg-emerald-500 rounded-full w-full" />
              </div>
            </div>

            {/* Dépenses */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Dépenses terrain</span>
                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                  <Send className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-none">
                {financialData.depense.toLocaleString('fr-FR')} €
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Virements envoyés · {financialData.periodLabel}</p>
              <div className="mt-4 h-1.5 bg-amber-100 dark:bg-amber-900/40 rounded-full">
                <div className="h-1.5 bg-amber-500 rounded-full transition-all"
                  style={{ width: financialData.collecte > 0 ? `${Math.min(100, Math.round(financialData.depense / financialData.collecte * 100))}%` : '0%' }} />
              </div>
              {financialData.collecte > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 font-medium">
                  {Math.round(financialData.depense / financialData.collecte * 100)}% du collecté
                </p>
              )}
            </div>

            {/* Solde */}
            {(() => {
              const pos = financialData.disponible >= 0;
              const pct = financialData.collecte > 0 ? Math.round(Math.abs(financialData.disponible) / financialData.collecte * 100) : 0;
              return (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-xs font-semibold uppercase tracking-wider ${pos ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                      {pos ? 'Solde disponible' : 'Déficit'}
                    </span>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${pos ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-red-100 dark:bg-red-900/40'}`}>
                      {pos
                        ? <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        : <AlertCircle  className="h-4 w-4 text-red-600 dark:text-red-400" />
                      }
                    </div>
                  </div>
                  <p className={`text-3xl font-black tracking-tight leading-none ${pos ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'}`}>
                    {Math.abs(financialData.disponible).toLocaleString('fr-FR')} €
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{pos ? 'Non dépensé ce mois' : 'Dépassement'} · {financialData.periodLabel}</p>
                  <div className={`mt-4 h-1.5 rounded-full ${pos ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-red-100 dark:bg-red-900/40'}`}>
                    <div className={`h-1.5 rounded-full transition-all ${pos ? 'bg-blue-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                  <p className={`text-xs mt-1.5 font-medium ${pos ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                    {pos ? `${pct}% du budget restant` : `${pct}% de dépassement`}
                  </p>
                </div>
              );
            })()}
          </div>

          {/* Donut + répartition par projet */}
          {financialData.pieData.length > 0 && (
            <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-4 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-start">
                <DonutChart
                  data={financialData.pieData}
                  centerLabel={periodMode === 'monthly' ? 'Ce mois' : 'Annuel'}
                  centerValue={`${financialData.collecte.toLocaleString('fr-FR')} €`}
                />
                <div className="flex-1 min-w-0 space-y-2.5">
                  {financialData.pieData.map((d, i) => {
                    const totalAll = financialData.pieData.reduce((s, x) => s + x.value, 0);
                    const rawPct = totalAll > 0 ? d.value / totalAll * 100 : 0;
                    const pct = Math.round(rawPct);
                    const pctLabel = rawPct > 0 && pct === 0 ? '<1%' : `${pct}%`;
                    const barWidth = Math.max(rawPct, rawPct > 0 ? 0.5 : 0);
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                            <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{d.label}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{d.value.toLocaleString('fr-FR')} €</span>
                            <span className="text-xs text-gray-400 w-8 text-right">{pctLabel}</span>
                          </div>
                        </div>
                        <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full">
                          <div className="h-1 rounded-full transition-all" style={{ background: d.color, width: `${barWidth}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Alerts + Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="bg-white rounded-xl shadow border border-gray-300 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-red-100 bg-red-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <h3 className="font-bold text-red-800 text-sm">À relancer ({toContact.length || urgentCount})</h3>
              </div>
              {(toContact.length > 0 || urgentCount > 0) && (
                <button onClick={onGoToRelances} className="text-xs text-red-600 hover:underline font-semibold">Voir tout →</button>
              )}
            </div>
            <div className="divide-y divide-gray-100">
              {toContact.length === 0 && urgentCount === 0
                ? <div className="p-6 text-center text-gray-400 text-sm"><CheckCircle2 className="h-7 w-7 mx-auto mb-2 text-green-300" /> Aucune relance urgente !</div>
                : toContact.length > 0
                ? toContact.slice(0, 5).map(d => (
                  <div
                    key={d.id}
                    onClick={() => onNavigate?.('relances')}
                    className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-red-50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{d.firstName} {d.lastName}</p>
                      <p className="text-xs text-gray-400">{d.delayMonths} mois · {d.amount * d.delayMonths} €</p>
                    </div>
                    <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">{d.delayMonths}m</span>
                  </div>
                ))
                : <div className="p-6 text-center text-gray-400 text-sm cursor-pointer hover:bg-red-50 transition-colors" onClick={() => onNavigate?.('relances')}>
                    <AlertCircle className="h-7 w-7 mx-auto mb-2 text-red-300" />
                    {urgentCount} donateur{urgentCount > 1 ? 's' : ''} sans contact — voir les relances
                  </div>
              }
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-xl shadow border border-gray-300 dark:border-gray-700 p-5">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm mb-5">
              <BarChart3 className="h-4 w-4 text-gray-500" /> Évolution mensuelle (6 mois)
            </h3>
            <BarChart data={monthlyStats} />
          </div>
        </div>

        {/* ── Virements terrain ─────────────────────────────────────────── */}
        <div
          onClick={() => onNavigate?.('envois')}
          className="bg-white rounded-xl shadow border border-gray-300 dark:border-gray-700 overflow-hidden cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group"
        >
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-gray-500" />
              <h3 className="font-bold text-gray-800 text-sm">Virements terrain</h3>
            </div>
            <span className="text-xs text-blue-600 font-semibold group-hover:underline flex items-center gap-1">
              Voir tout <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 dark:divide-gray-700">
            {/* Dernier envoi */}
            <div className="p-5">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2">Dernier envoi</p>
              {envoisStats.last ? (<>
                <p className="text-2xl font-bold text-gray-900">{envoisStats.lastTotal} €</p>
                <p className="text-xs text-gray-500 mt-1">{envoisStats.last.destination} · {envoisStats.last.date}</p>
                <span className={`mt-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${
                  envoisStats.last.method === 'remitly'
                    ? 'bg-violet-50 text-violet-700 border-violet-200'
                    : 'bg-sky-50 text-sky-700 border-sky-200'
                }`}>
                  {envoisStats.last.method === 'remitly' ? 'Remitly' : 'Espèces'}
                </span>
              </>) : (
                <p className="text-sm text-gray-400 mt-1">Aucun envoi</p>
              )}
            </div>
            {/* Prochain planifié */}
            <div className="p-5">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2">Prochain planifié</p>
              {envoisStats.nextPlan ? (<>
                <p className="text-2xl font-bold text-blue-700">{envoisStats.nextPlanTotal} €</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(envoisStats.nextPlan.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <span className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border bg-blue-50 text-blue-700 border-blue-200">
                  À venir
                </span>
              </>) : (
                <p className="text-sm text-gray-400 mt-1">—</p>
              )}
            </div>
            {/* Total envoyé */}
            <div className="p-5">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2">Total envoyé</p>
              <p className="text-2xl font-bold text-gray-900">{envoisStats.totalSent.toFixed(0)} €</p>
              <p className="text-xs text-gray-500 mt-1">{envois.length} envoi{envois.length > 1 ? 's' : ''} enregistré{envois.length > 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        {/* ── KPIs par projet ────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow border border-gray-300 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-gray-500" />
            <h3 className="font-bold text-gray-800 text-sm">Indicateurs par projet</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {poleStats.map((pole, i) => {
              const total = pole.activeCount + pole.delayCount;
              const ret   = total > 0 ? Math.round(pole.activeCount / total * 100) : 100;
              return (
                <div key={i} className="p-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 truncate">{pole.name}</p>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      { bg: 'bg-green-50 hover:bg-green-100 border-green-100', icon: <CheckCircle2 className="h-4 w-4 mx-auto mb-1 text-green-500" />, val: pole.activeCount, label: 'Donateurs actifs', sub: `${ret}% fidélité`, tc: 'text-green-700', sc: 'text-green-500', nav: 'donors' },
                      { bg: 'bg-red-50 hover:bg-red-100 border-red-100',       icon: <AlertCircle  className="h-4 w-4 mx-auto mb-1 text-red-500"   />, val: pole.delayCount,  label: 'En retard',       sub: pole.delayedAmount > 0 ? `${pole.delayedAmount} € à récupérer` : 'Aucun impayé', tc: 'text-red-700', sc: 'text-red-500', nav: 'relances' },
                      { bg: 'bg-blue-50 hover:bg-blue-100 border-blue-100',    icon: <CreditCard   className="h-4 w-4 mx-auto mb-1 text-blue-500"  />, val: `${pole.expected} €`, label: 'Attendu / mois', sub: `${total} donateur${total > 1 ? 's' : ''}`, tc: 'text-blue-700', sc: 'text-blue-500', nav: 'payments' },
                      { bg: 'bg-orange-50 hover:bg-orange-100 border-orange-100', icon: <Clock      className="h-4 w-4 mx-auto mb-1 text-orange-500" />, val: `${pole.delayedAmount} €`, label: 'Impayés cumulés', sub: pole.arreteCount > 0 ? `${pole.arreteCount} arrêté${pole.arreteCount > 1 ? 's' : ''}` : 'Aucun arrêt', tc: 'text-orange-700', sc: 'text-orange-500', nav: 'relances' },
                    ].map((card, ci) => (
                      <div
                        key={ci}
                        onClick={() => onNavigate?.(card.nav)}
                        className={`${card.bg} border rounded-xl p-3 text-center cursor-pointer transition-colors`}
                      >
                        {card.icon}
                        <p className={`text-xl font-bold ${card.tc}`}>{card.val}</p>
                        <p className={`text-xs ${card.tc} font-medium mt-0.5`}>{card.label}</p>
                        <p className={`text-xs ${card.sc} mt-0.5`}>{card.sub}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </>)}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB : PAR PROJET (drill-down)
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'projets' && (
        <div className="space-y-4">

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm">
            <button
              onClick={() => { setDrillPole(null); setDrillYear(null); setDrillMonth(null); }}
              className={`font-medium ${drillPole ? 'text-blue-600 hover:underline' : 'text-gray-900'}`}
            >
              Tous les projets
            </button>
            {drillPole && (<>
              <ChevronRight className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              <button
                onClick={() => { setDrillYear(null); setDrillMonth(null); }}
                className={`font-medium truncate max-w-[180px] ${drillYear ? 'text-blue-600 hover:underline' : 'text-gray-900'}`}
                title={drillPole}
              >
                {drillPole}
              </button>
            </>)}
            {drillYear && (<>
              <ChevronRight className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              <button
                onClick={() => setDrillMonth(null)}
                className={`font-medium ${drillMonth ? 'text-blue-600 hover:underline' : 'text-gray-900'}`}
              >
                {drillYear}
              </button>
            </>)}
            {drillMonth && (<>
              <ChevronRight className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              <span className="font-medium text-gray-900">{MONTH_NAMES[drillMonth - 1]}</span>
            </>)}
          </div>

          {/* ── NIVEAU 0 : liste des projets ─────────────────────────────── */}
          {!drillPole && (
            <div className="bg-white rounded-xl shadow border border-gray-300 dark:border-gray-700 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-500">Cliquez sur un projet pour voir la répartition annuelle, mensuelle et les retardataires.</p>
              </div>
              <div className="divide-y divide-gray-100">
                {poleStats.map((pole, i) => (
                  <button
                    key={i}
                    onClick={() => setDrillPole(pole.name)}
                    className="w-full px-5 py-4 flex items-center gap-4 hover:bg-blue-50 transition-colors text-left group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm group-hover:text-blue-700 truncate">{pole.name}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                        <span>{pole.expected} €/mois attendus</span>
                        <span className="font-bold text-blue-600">{pole.receivedGlobal} € reçus (cumul)</span>
                        {pole.delayedAmount > 0 && <span className="text-orange-600 font-semibold">{pole.delayedAmount} € impayés</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {pole.delayCount > 0 && (
                        <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full border border-red-200">
                          {pole.delayCount} retard{pole.delayCount > 1 ? 's' : ''}
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-500" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── NIVEAU 1 : années pour le projet sélectionné ─────────────── */}
          {drillPole && !drillYear && (drillLoading
            ? <div className="flex items-center justify-center py-12 text-gray-400 gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Chargement…</div>
            : (() => {
            const years = getYears(drillPole);
            const exp = drillExp[drillPole] || 0;
            return (
              <div className="bg-white rounded-xl shadow border border-gray-300 dark:border-gray-700 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <h3 className="font-bold text-gray-800 text-sm">Répartition annuelle — {drillPole}</h3>
                  <span className="text-xs text-gray-400">{exp} €/mois attendus</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {years.length === 0
                    ? <p className="p-8 text-center text-gray-400 text-sm">Aucun paiement enregistré.</p>
                    : years.map(year => {
                      const monthsData = drillRec[year] || {};
                      const totalReceived = Object.values(monthsData).reduce((s, v) => s + v, 0);
                      const nbMonths = Object.keys(monthsData).length;
                      const totalExpected = nbMonths * exp;
                      const rate = totalExpected > 0 ? Math.round(totalReceived / totalExpected * 100) : 0;
                      return (
                        <button
                          key={year}
                          onClick={() => setDrillYear(year)}
                          className="w-full px-5 py-4 flex items-center gap-4 hover:bg-blue-50 transition-colors text-left group"
                        >
                          <span className="text-2xl font-bold text-gray-300 group-hover:text-blue-200 w-16">{year}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1.5">
                              <span className="text-sm font-semibold text-gray-800">{totalReceived} € reçus</span>
                              <span className="text-xs text-gray-400">/ {totalExpected} € attendus ({nbMonths} mois)</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${rate >= 90 ? 'bg-green-500' : rate >= 60 ? 'bg-orange-400' : 'bg-red-500'}`}
                                style={{ width: `${Math.min(rate, 100)}%` }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className={`text-sm font-bold ${rate >= 90 ? 'text-green-600' : rate >= 60 ? 'text-orange-500' : 'text-red-600'}`}>{rate}%</span>
                            <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-500" />
                          </div>
                        </button>
                      );
                    })
                  }
                </div>
              </div>
            );
          })())}

          {/* ── NIVEAU 2 : mois pour le projet+année sélectionnés ────────── */}
          {drillPole && drillYear && !drillMonth && (() => {
            const months = getMonthsForYear(drillPole, drillYear);
            const exp = drillExp[drillPole] || 0;
            return (
              <div className="bg-white rounded-xl shadow border border-gray-300 dark:border-gray-700 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <h3 className="font-bold text-gray-800 text-sm">Détail mensuel — {drillYear}</h3>
                  <span className="text-xs text-gray-400">{exp} €/mois attendus</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                        <th className="px-5 py-3">Mois</th>
                        <th className="px-5 py-3 text-right">Attendu</th>
                        <th className="px-5 py-3 text-right">Reçu</th>
                        <th className="px-5 py-3 text-right">Bilan</th>
                        <th className="px-5 py-3 text-right">Taux</th>
                        <th className="px-5 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {months.map(m => {
                        const received = drillRec[drillYear]?.[m] || 0;
                        const balance  = received - exp;
                        const rate     = exp > 0 ? Math.round(received / exp * 100) : 0;
                        return (
                          <tr key={m} className="hover:bg-blue-50 cursor-pointer transition-colors group" onClick={() => setDrillMonth(m)}>
                            <td className="px-5 py-3.5 font-medium text-gray-800 text-sm">{MONTH_NAMES[m - 1]}</td>
                            <td className="px-5 py-3.5 text-right text-gray-500 text-sm">{exp} €</td>
                            <td className="px-5 py-3.5 text-right font-bold text-blue-700 text-sm">{received} €</td>
                            <td className="px-5 py-3.5 text-right">
                              {balance >= 0
                                ? <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-md"><TrendingUp className="h-3 w-3" />+{balance} €</span>
                                : <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded-md"><TrendingDown className="h-3 w-3" />{balance} €</span>
                              }
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <span className={`text-sm font-bold ${rate >= 90 ? 'text-green-600' : rate >= 60 ? 'text-orange-500' : 'text-red-600'}`}>{rate}%</span>
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 ml-auto" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* ── NIVEAU 3 : retardataires du mois sélectionné ─────────────── */}
          {drillPole && drillYear && drillMonth && (() => {
            const donorsMonth = getDonorsForMonth(drillPole, drillYear, drillMonth);
            const paid        = donorsMonth.filter(d => d.isPaid);
            const unpaid      = donorsMonth.filter(d => !d.isPaid);
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-green-700">{paid.length}</p>
                    <p className="text-xs text-green-600 mt-1">Ont payé</p>
                    <p className="text-xs font-bold text-green-700">{paid.reduce((s, d) => s + d.paidThisMonth, 0)} €</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-red-700">{unpaid.length}</p>
                    <p className="text-xs text-red-600 mt-1">Retardataires</p>
                    <p className="text-xs font-bold text-red-700">{unpaid.reduce((s, d) => s + d.amount, 0)} € manquants</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-blue-700">{donorsMonth.length}</p>
                    <p className="text-xs text-blue-600 mt-1">Donateurs actifs</p>
                    <p className="text-xs font-bold text-blue-700">{(drillExp[drillPole] || 0)} € attendus</p>
                  </div>
                </div>

                {unpaid.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
                    <div className="px-5 py-3 border-b border-red-100 bg-red-50 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <h3 className="font-bold text-red-800 text-sm">Retardataires — {MONTH_NAMES[drillMonth - 1]} {drillYear}</h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {unpaid.map(d => (
                        <div key={d.id} className="px-5 py-3.5 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{d.firstName} {d.lastName}</p>
                            <p className="text-xs text-gray-400">{d.email} · {d.paymentMethod}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-red-600">{d.amount} € non payé</p>
                            <p className="text-xs text-gray-400">{d.paidThisMonth > 0 ? `${d.paidThisMonth} € partiellement payé` : 'Aucun paiement'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {paid.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-green-200 overflow-hidden">
                    <div className="px-5 py-3 border-b border-green-100 bg-green-50 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <h3 className="font-bold text-green-800 text-sm">Ont payé — {MONTH_NAMES[drillMonth - 1]} {drillYear}</h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {paid.map(d => (
                        <div key={d.id} className="px-5 py-3.5 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{d.firstName} {d.lastName}</p>
                            <p className="text-xs text-gray-400">{d.email}</p>
                          </div>
                          <span className="text-sm font-bold text-green-600">{d.paidThisMonth} € ✓</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB : SORTIES PLANIFIÉES
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'sorties' && (
        <div className="space-y-5">

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div
              onClick={() => onNavigate?.('envois')}
              className="bg-blue-950 text-white rounded-xl p-5 cursor-pointer hover:bg-blue-900 transition-colors"
            >
              <p className="text-blue-300 text-xs font-medium uppercase tracking-wider mb-1">Planifiés</p>
              <p className="text-3xl font-bold">{envoisStats.plannedCount}</p>
              <p className="text-blue-400 text-xs mt-1">
                {envoisStats.plannedCount > 0 ? `${Math.round(envoisStats.plannedTotal)} € à envoyer` : 'Aucun virement prévu'}
              </p>
            </div>
            <div
              onClick={() => onNavigate?.('envois')}
              className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm cursor-pointer hover:border-green-300 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Envoyés</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{envoisStats.sentGroups.reduce((s, g) => s + g.envois.length, 0)}</p>
              <p className="text-xs text-gray-400 mt-1">{Math.round(envoisStats.totalSent)} € envoyés au total</p>
            </div>
            <div
              onClick={() => onNavigate?.('envois')}
              className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm cursor-pointer hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-2 mb-1">
                <Send className="h-4 w-4 text-blue-500" />
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Gérer</p>
              </div>
              <p className="text-sm font-semibold text-blue-600">Voir tous les virements</p>
              <p className="text-xs text-gray-400 mt-1">Remitly · Espèces · Planification</p>
            </div>
          </div>

          {/* Planned section */}
          {envoisStats.planned.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border-2 border-dashed border-blue-300 overflow-hidden">
              <div className="px-5 py-3 border-b border-blue-100 bg-blue-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold bg-blue-600 text-white px-2.5 py-0.5 rounded-full">À VENIR</span>
                  <h3 className="font-bold text-sm text-blue-800">{envoisStats.planned.length} virement{envoisStats.planned.length > 1 ? 's' : ''} planifié{envoisStats.planned.length > 1 ? 's' : ''}</h3>
                </div>
                <span className="text-sm font-bold text-blue-700">{Math.round(envoisStats.plannedTotal)} €</span>
              </div>
              <div className="divide-y divide-blue-50">
                {envoisStats.planned.map(e => {
                  const total = calcEnvoiTotal(e);
                  const dateStr = new Date(e.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
                  return (
                    <div
                      key={e.id}
                      onClick={() => onNavigate?.('envois')}
                      className="px-5 py-3.5 flex items-center gap-4 hover:bg-blue-50 cursor-pointer transition-colors group"
                    >
                      <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {e.destination} · {e.method === 'remitly' ? 'Remitly' : 'Espèces'}
                          {e.reference && <span className="text-gray-400 font-mono text-xs ml-2">{e.reference}</span>}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{dateStr} · {e.items.length} poste{e.items.length > 1 ? 's' : ''}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-sm font-bold text-blue-700">{Math.round(total)} €</span>
                        <ArrowUpRight className="h-4 w-4 text-blue-400 group-hover:text-blue-600" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* No envois at all */}
          {envois.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
              <Send className="h-8 w-8 mx-auto mb-3 text-gray-200" />
              <p className="text-gray-400 font-medium text-sm">Aucun virement enregistré</p>
              <button onClick={() => onNavigate?.('envois')} className="mt-3 text-sm text-blue-600 hover:underline font-semibold">
                Créer le premier virement →
              </button>
            </div>
          )}

          {/* History grouped by month */}
          {envoisStats.sentGroups.map(group => (
            <div key={group.key} className="bg-white rounded-xl shadow border border-gray-300 dark:border-gray-700 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold bg-green-600 text-white px-2.5 py-0.5 rounded-full">ENVOYÉ</span>
                  <h3 className="font-bold text-sm text-gray-800">{group.label}</h3>
                  <span className="text-xs text-gray-400">{group.envois.length} virement{group.envois.length > 1 ? 's' : ''}</span>
                </div>
                <span className="text-sm font-bold text-gray-700">{Math.round(group.total)} €</span>
              </div>
              <div className="divide-y divide-gray-100">
                {group.envois.map(e => {
                  const total  = calcEnvoiTotal(e);
                  const dateStr = new Date(e.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
                  return (
                    <div
                      key={e.id}
                      onClick={() => onNavigate?.('envois')}
                      className="px-5 py-3.5 flex items-center gap-4 hover:bg-gray-50 cursor-pointer transition-colors group"
                    >
                      <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {e.destination} · {e.method === 'remitly' ? 'Remitly' : 'Espèces'}
                          {e.reference && <span className="text-gray-400 font-mono text-xs ml-2">{e.reference}</span>}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{dateStr} · {e.items.length} poste{e.items.length > 1 ? 's' : ''}{e.note ? ` · ${e.note}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-sm font-bold text-gray-900">{Math.round(total)} €</span>
                        <CheckCircle2 className="h-4 w-4 text-green-400 group-hover:text-green-600" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>{/* end tabContentRef */}
    </div>
  );
}
