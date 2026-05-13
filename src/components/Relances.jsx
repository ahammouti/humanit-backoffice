import React, { useState, useMemo } from 'react';
import {
  Sparkles, Copy, Loader2, CheckCircle2, Clock, AlertCircle,
  MessageSquare, Filter, ChevronDown, Phone, Mail, TrendingDown,
} from 'lucide-react';
import { SourceBadge, Modal, FormField, Input, Select } from './ui';

const buildEmail = (donor) =>
`Bonjour ${donor.firstName},

Nous espérons que vous allez bien. Nous nous permettons de vous contacter au sujet de votre engagement généreux envers le projet "${donor.pole}" au sein de l'association Humanit'R.

Il semble que votre prélèvement mensuel de ${donor.amount} € n'ait pas pu être effectué ce mois-ci. Cela arrive parfois — carte bancaire expirée, changement de compte, ou simple oubli — et nous comprenons tout à fait.

Si vous souhaitez régulariser votre situation, vous pouvez le faire directement sur notre page HelloAsso en quelques clics. Si vous traversez une période de difficultés, n'hésitez pas à nous contacter directement, nous trouverons ensemble la meilleure solution.

Votre soutien est précieux pour les bénéficiaires de nos projets, et nous vous en sommes profondément reconnaissants.

Cordialement,
L'équipe Humanit'R — Pôle Trésorerie`;

function urgencyLevel(delayMonths, neverContacted) {
  if (neverContacted && delayMonths >= 6) return 3;
  if (delayMonths >= 6 || neverContacted) return 2;
  return 1;
}
const URGENCY = {
  3: { bar: 'bg-red-600',    text: 'text-red-600 dark:text-red-400',    badge: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',    card: 'border-l-red-600',    avatar: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',    label: 'Critique' },
  2: { bar: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-400', badge: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800', card: 'border-l-orange-500', avatar: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400', label: 'Urgent' },
  1: { bar: 'bg-yellow-400', text: 'text-yellow-600 dark:text-yellow-400', badge: 'bg-yellow-50 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',   card: 'border-l-yellow-400', avatar: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',  label: 'Modéré' },
};

function EmailModal({ donor, onClose, onMarkSent }) {
  const [text, setText]       = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied]   = useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setTimeout(() => { if (!cancelled) { setText(buildEmail(donor)); setLoading(false); } }, 800);
    return () => { cancelled = true; };
  }, [donor]);

  const copy = () => {
    navigator.clipboard?.writeText(text).catch(() => {
      const ta = document.createElement('textarea'); ta.value = text;
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    });
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-between">
        <div>
          <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">{donor.firstName} {donor.lastName}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{donor.email} · {donor.delayMonths} mois · {donor.amount * donor.delayMonths} € dû</p>
        </div>
        <a href={`mailto:${donor.email}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors">
          <Mail className="h-3.5 w-3.5" /> Ouvrir email
        </a>
      </div>
      {loading ? (
        <div className="flex flex-col items-center justify-center py-10 text-blue-600 dark:text-blue-400 gap-3">
          <Loader2 className="h-7 w-7 animate-spin" />
          <p className="text-sm animate-pulse">Rédaction du message...</p>
        </div>
      ) : (
        <>
          <textarea
            className="w-full h-64 p-4 border border-gray-200 dark:border-gray-600 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            value={text}
            onChange={e => setText(e.target.value)}
          />
          <div className="flex gap-3 mt-4 justify-end">
            <button onClick={copy} className={`flex items-center gap-2 px-4 py-2 border text-sm rounded-lg transition-colors ${copied ? 'border-green-400 text-green-600 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
              {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copié !' : 'Copier'}
            </button>
            <button onClick={onMarkSent} className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
              <CheckCircle2 className="h-4 w-4" /> Marquer comme envoyé
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function LogRelanceModal({ donor, onSubmit, onClose }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ date: today, result: 'Envoyé', note: '' });
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit({ ...form, donorId: donor.id }); }} className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Relance pour <strong className="text-gray-900 dark:text-gray-100">{donor.firstName} {donor.lastName}</strong>
      </p>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Date"><Input type="date" value={form.date} onChange={e => set('date', e.target.value)} /></FormField>
        <FormField label="Résultat">
          <Select value={form.result} onChange={e => set('result', e.target.value)}>
            <option value="Envoyé">Email envoyé</option>
            <option value="Appel effectué">Appel effectué</option>
            <option value="Répondu">A répondu</option>
            <option value="Sans réponse">Sans réponse</option>
            <option value="Promesse de paiement">Promesse de paiement</option>
            <option value="Difficulté financière">Difficulté financière</option>
          </Select>
        </FormField>
      </div>
      <FormField label="Note">
        <textarea
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400"
          placeholder="Détails de la relance..."
          value={form.note}
          onChange={e => set('note', e.target.value)}
        />
      </FormField>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">Annuler</button>
        <button type="submit" className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">Enregistrer</button>
      </div>
    </form>
  );
}

const FILTERS = [
  { id: 'all',    label: 'Tous' },
  { id: 'never',  label: 'Jamais contactés' },
  { id: 'high',   label: '6+ mois' },
  { id: 'recent', label: 'Récemment relancés' },
];

export default function Relances({ donors, relances, onAdd, addNotification }) {
  const [emailFor, setEmailFor] = useState(null);
  const [logFor, setLogFor]     = useState(null);
  const [tab, setTab]           = useState('todo');
  const [filter, setFilter]     = useState('all');
  const [sortBy, setSortBy]     = useState('delay');

  const toContact = useMemo(() => {
    let list = donors.filter(d => d.status === 'RETARD');
    if (filter === 'never')  list = list.filter(d => !d.lastContactDate);
    if (filter === 'high')   list = list.filter(d => d.delayMonths >= 6);
    if (filter === 'recent') list = list.filter(d => d.lastContactDate);
    return list.sort((a, b) => {
      if (sortBy === 'delay')  return b.delayMonths - a.delayMonths;
      if (sortBy === 'amount') return (b.amount * b.delayMonths) - (a.amount * a.delayMonths);
      if (sortBy === 'never')  return (!a.lastContactDate ? -1 : 1);
      return 0;
    });
  }, [donors, filter, sortBy]);

  const allRetard = donors.filter(d => d.status === 'RETARD');
  const neverCount   = allRetard.filter(d => !d.lastContactDate).length;
  const totalDue     = allRetard.reduce((s, d) => s + d.amount * d.delayMonths, 0);
  const criticalCount = allRetard.filter(d => urgencyLevel(d.delayMonths, !d.lastContactDate) === 3).length;

  const handleMarkSent = (donor) => {
    onAdd({ donorId: donor.id, date: new Date().toISOString().split('T')[0], result: 'Envoyé', note: 'Email généré via le back office.' });
    setEmailFor(null);
    addNotification(`📧 Relance enregistrée pour ${donor.firstName} ${donor.lastName}`);
  };

  const handleQuickLog = (donor, result) => {
    onAdd({ donorId: donor.id, date: new Date().toISOString().split('T')[0], result, note: '' });
    addNotification(`✅ Relance "${result}" enregistrée.`);
  };

  const getDaysSince = (dateStr) => {
    if (!dateStr) return null;
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  };

  // History: group by donor
  const historyByDonor = useMemo(() => {
    const map = {};
    for (const r of relances) {
      if (!map[r.donorId]) map[r.donorId] = [];
      map[r.donorId].push(r);
    }
    return Object.entries(map)
      .map(([donorId, logs]) => ({
        donor: donors.find(d => d.id === donorId),
        logs: [...logs].sort((a, b) => new Date(b.date) - new Date(a.date)),
      }))
      .sort((a, b) => new Date(b.logs[0]?.date) - new Date(a.logs[0]?.date));
  }, [relances, donors]);

  const resultStyle = (r) => ({
    'Répondu':              'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
    'Promesse de paiement': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    'Envoyé':               'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
    'Appel effectué':       'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
    'Sans réponse':         'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600',
    'Difficulté financière':'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  })[r] ?? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600';

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-5">
      <Modal open={!!emailFor} onClose={() => setEmailFor(null)} title="Email de relance" size="lg">
        {emailFor && <EmailModal donor={emailFor} onClose={() => setEmailFor(null)} onMarkSent={() => handleMarkSent(emailFor)} />}
      </Modal>
      <Modal open={!!logFor} onClose={() => setLogFor(null)} title="Enregistrer une relance" size="md">
        {logFor && <LogRelanceModal donor={logFor} onSubmit={(data) => { onAdd(data); setLogFor(null); addNotification('✅ Relance enregistrée.'); }} onClose={() => setLogFor(null)} />}
      </Modal>

      {/* STATS HEADER */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-300 dark:border-gray-700 shadow p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-2xl font-black text-gray-900 dark:text-white">{allRetard.length}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{criticalCount > 0 ? `dont ${criticalCount} critiques` : 'En retard de paiement'}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-300 dark:border-gray-700 shadow p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center flex-shrink-0">
            <TrendingDown className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <p className="text-2xl font-black text-gray-900 dark:text-white">{totalDue.toLocaleString('fr-FR')} €</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Total impayés à récupérer</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-300 dark:border-gray-700 shadow p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center flex-shrink-0">
            <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <p className="text-2xl font-black text-gray-900 dark:text-white">{neverCount}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Jamais contactés</p>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
          <button onClick={() => setTab('todo')} className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'todo' ? 'bg-white dark:bg-gray-800 shadow text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
            À relancer ({allRetard.length})
          </button>
          <button onClick={() => setTab('history')} className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'history' ? 'bg-white dark:bg-gray-800 shadow text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
            Historique ({relances.length})
          </button>
        </div>

        {tab === 'todo' && (
          <div className="flex items-center gap-2">
            {/* Filter chips */}
            <div className="flex gap-1">
              {FILTERS.map(f => (
                <button key={f.id} onClick={() => setFilter(f.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors border ${filter === f.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:border-blue-400'}`}>
                  {f.label}
                </button>
              ))}
            </div>
            {/* Sort */}
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="delay">Tri : délai</option>
              <option value="amount">Tri : montant dû</option>
              <option value="never">Tri : jamais contactés</option>
            </select>
          </div>
        )}
      </div>

      {/* TODO TAB */}
      {tab === 'todo' && (
        <div className="space-y-2.5">
          {toContact.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-300 dark:border-gray-700 p-16 text-center space-y-2">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-300 dark:text-green-600 mb-3" />
              <p className="text-gray-700 dark:text-gray-300 font-semibold">Aucun donateur dans ce filtre.</p>
            </div>
          ) : toContact.map(donor => {
            const never   = !donor.lastContactDate;
            const lvl     = urgencyLevel(donor.delayMonths, never);
            const U       = URGENCY[lvl];
            const daysSince = getDaysSince(donor.lastContactDate);
            const lastRelance = relances.filter(r => r.donorId === donor.id).sort((a, b) => new Date(b.date) - new Date(a.date))[0];
            const maxDelay = 12;

            return (
              <div key={donor.id} className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-300 dark:border-gray-700 shadow overflow-hidden flex border-l-4 ${U.card}`}>
                {/* Left: delay bar */}
                <div className="w-1.5 flex-shrink-0" />

                <div className="flex-1 px-4 py-3.5 flex items-center gap-4 min-w-0">
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${U.avatar}`}>
                    {donor.firstName[0]}{donor.lastName[0]}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{donor.firstName} {donor.lastName}</p>
                      <SourceBadge source={donor.paymentMethod} />
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${U.badge}`}>
                        {never ? 'Jamais contacté' : U.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{donor.email} · {donor.pole}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex items-center gap-2 flex-1 max-w-[180px]">
                        <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full">
                          <div className={`h-1.5 rounded-full ${U.bar}`} style={{ width: `${Math.min(100, donor.delayMonths / maxDelay * 100)}%` }} />
                        </div>
                        <span className={`text-xs font-bold ${U.text}`}>{donor.delayMonths}m · {(donor.amount * donor.delayMonths).toLocaleString('fr-FR')} €</span>
                      </div>
                      {!never && daysSince !== null && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {daysSince}j · {lastRelance?.result ?? '—'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0 items-center">
                    <button onClick={() => setEmailFor(donor)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 text-xs font-bold rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors">
                      <Sparkles className="h-3.5 w-3.5" /> Email IA
                    </button>
                    <a href={`mailto:${donor.email}`}
                      className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 transition-colors" title="Ouvrir email">
                      <Mail className="h-4 w-4" />
                    </a>
                    <QuickLogDropdown donor={donor} onQuickLog={handleQuickLog} onFullLog={() => setLogFor(donor)} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* HISTORY TAB */}
      {tab === 'history' && (
        <div className="space-y-3">
          {historyByDonor.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-300 dark:border-gray-700 p-12 text-center text-gray-400 italic">
              Aucune relance enregistrée.
            </div>
          ) : historyByDonor.map(({ donor, logs }) => (
            <div key={donor?.id ?? logs[0].donorId} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-300 dark:border-gray-700 shadow overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-400 flex-shrink-0">
                  {donor ? `${donor.firstName[0]}${donor.lastName[0]}` : '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                    {donor ? `${donor.firstName} ${donor.lastName}` : 'Donateur inconnu'}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{donor?.email} · {logs.length} relance{logs.length > 1 ? 's' : ''}</p>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(logs[0].date).toLocaleDateString('fr-FR')}</span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {logs.map((r, i) => (
                  <div key={r.id ?? i} className="px-4 py-2.5 flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 mt-1.5 flex-shrink-0" />
                    <div className="flex-1 flex items-center gap-3 flex-wrap">
                      <span className="text-xs text-gray-400 dark:text-gray-500 w-20 flex-shrink-0">
                        {new Date(r.date).toLocaleDateString('fr-FR')}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${resultStyle(r.result)}`}>
                        {r.result}
                      </span>
                      {r.note && <span className="text-xs text-gray-500 dark:text-gray-400 italic">{r.note}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuickLogDropdown({ donor, onQuickLog, onFullLog }) {
  const [open, setOpen] = useState(false);
  const QUICK = ['Email envoyé', 'Appel effectué', 'Sans réponse', 'Répondu'];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(p => !p)}
        className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-600 transition-colors"
      >
        <MessageSquare className="h-3.5 w-3.5" /> Log <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 w-48">
            {QUICK.map(q => (
              <button key={q} onClick={() => { onQuickLog(donor, q); setOpen(false); }}
                className="w-full text-left px-4 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                {q}
              </button>
            ))}
            <div className="border-t border-gray-100 dark:border-gray-700 mt-1 pt-1">
              <button onClick={() => { onFullLog(); setOpen(false); }}
                className="w-full text-left px-4 py-2 text-xs text-blue-600 dark:text-blue-400 font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                Enregistrement complet…
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
