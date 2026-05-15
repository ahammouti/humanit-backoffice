import React, { useState, useMemo } from 'react';
import {
  Sparkles, Copy, Loader2, CheckCircle2, Clock, AlertCircle,
  MessageSquare, Filter, ChevronDown, Phone, Mail, TrendingDown, Trash2, Send,
} from 'lucide-react';
import { SourceBadge, Modal, FormField, Input, Select } from './ui';
import client from '../api/client';

const buildEmail = (donor) =>
`Assalamou Alaikoum wa rahmatullahi wa barakatuh ${donor.firstName},

Nous espérons, insh'Allah, que vous et votre famille vous portez bien.

Nous nous permettons de vous contacter au sujet de votre don mensuel de ${donor.amount} € pour le projet "${donor.pole}" au sein de l'association Humanit'R.

Il semble que votre prélèvement de ce mois-ci n'ait pas pu être effectué — carte expirée, changement de compte ou simple oubli, cela arrive et nous le comprenons tout à fait.

Le Prophète ﷺ a dit : « La sadaqa n'a jamais diminué un bien. » (Sahih Muslim)

Votre soutien est une sadaqa précieuse qui aide concrètement nos frères et sœurs dans le besoin. Si vous souhaitez régulariser votre don, vous pouvez le faire directement sur notre page HelloAsso en quelques clics : https://www.helloasso.com/associations/humanit-r

Si vous traversez une période de difficultés, n'hésitez pas à nous contacter directement — nous trouverons ensemble la meilleure solution, insh'Allah.

Qu'Allah vous récompense du bien pour votre générosité et bénisse vos biens et votre famille.

Wa assalamou alaikoum wa rahmatullahi wa barakatuh,
L'équipe Humanit'R — Pôle Trésorerie`;

function urgencyLevel(delayMonths, neverContacted) {
  // Plus on intervient tôt, plus on a de chance de récupérer le donateur
  if (neverContacted && delayMonths <= 2) return 3; // À contacter maintenant
  if (neverContacted || delayMonths <= 3) return 2; // Urgent
  return 1;                                          // Retard ancien — difficile
}
const URGENCY = {
  3: { bar: 'bg-red-600',    text: 'text-red-600 dark:text-red-400',    badge: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',    card: 'border-l-red-600',    avatar: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',    label: 'À contacter maintenant' },
  2: { bar: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-400', badge: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800', card: 'border-l-orange-500', avatar: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400', label: 'Urgent' },
  1: { bar: 'bg-gray-400',   text: 'text-gray-500 dark:text-gray-400',   badge: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600',     card: 'border-l-gray-400',   avatar: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',    label: 'Retard ancien' },
};

const buildWhatsApp = (donor) => {
  const pole   = typeof donor.pole === 'object' ? donor.pole?.name : (donor.pole ?? '?');
  const amount = donor.amount ?? '?';
  return (
    `Assalamou Alaikoum ${donor.firstName} 🤲\n\n` +
    `Votre don mensuel de ${amount} € pour le projet "${pole}" (Humanit'R) n'a pas pu être traité ce mois-ci.\n\n` +
    `"La sadaqa n'a jamais diminué un bien." — Sahih Muslim\n\n` +
    `Vous pouvez régulariser sur HelloAsso ou nous répondre directement insh'Allah.\n\n` +
    `Qu'Allah vous récompense — Humanit'R Trésorerie 🌙`
  );
};

function WhatsAppModal({ donor, onClose, onSent, addNotification, onPhoneUpdate }) {
  const [text, setText]       = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [phone, setPhone]     = useState(donor.phone?.replace(/\D/g, '') || '');
  const [editPhone, setEditPhone] = useState(!donor.phone);

  React.useEffect(() => {
    let cancelled = false;
    setTimeout(() => { if (!cancelled) { setText(buildWhatsApp(donor)); setLoading(false); } }, 600);
    return () => { cancelled = true; };
  }, [donor]);

  const send = async () => {
    setSending(true);
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      // Si numéro modifié, sauvegarder dans la fiche donateur
      if (cleanPhone && cleanPhone !== (donor.phone?.replace(/\D/g, '') || '')) {
        await client.put(`/donors/${donor.id}`, { phone: cleanPhone });
        onPhoneUpdate?.(donor.id, cleanPhone);
      }
      const { data } = await client.post(`/relances/${donor.id}/notify`, { message: text });
      const r = data.results;
      const lines = [];
      if (r.whatsappSent) lines.push(`✅ WhatsApp → +${cleanPhone}`);
      else lines.push('⚠️ WhatsApp non envoyé (vérifier connexion WhatsApp)');
      r.errors?.forEach(e => lines.push(`❌ ${e}`));
      addNotification(lines.join(' | '));
      if (data.relance) onSent(data.relance);
      onClose();
    } catch (e) {
      addNotification(e?.response?.data?.error ?? 'Erreur envoi WhatsApp', 'warning');
    } finally { setSending(false); }
  };

  return (
    <div>
      <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between mb-2">
          <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">{donor.firstName} {donor.lastName}</p>
          <span className="flex items-center gap-1.5 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold rounded-lg border border-green-200 dark:border-green-800">
            <Send className="h-3 w-3" /> WhatsApp
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Numéro :</span>
          {editPhone ? (
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="ex: 33649452312"
              autoFocus
              className="flex-1 text-sm px-2 py-1 border border-green-400 dark:border-green-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          ) : (
            <>
              <span className="text-sm font-medium text-green-600 dark:text-green-400">+{phone}</span>
              <button onClick={() => setEditPhone(true)} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline">modifier</button>
            </>
          )}
        </div>
        {!phone && <p className="mt-1.5 text-xs text-orange-500 dark:text-orange-400">Saisis le numéro sans espaces (avec indicatif, ex: 33649452312)</p>}
      </div>
      {loading ? (
        <div className="flex flex-col items-center justify-center py-10 text-green-600 dark:text-green-400 gap-3">
          <Loader2 className="h-7 w-7 animate-spin" />
          <p className="text-sm animate-pulse">Rédaction du message...</p>
        </div>
      ) : (
        <>
          <textarea
            className="w-full h-52 p-4 border border-gray-200 dark:border-gray-600 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500 leading-relaxed bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            value={text}
            onChange={e => setText(e.target.value)}
          />
          <div className="flex gap-3 mt-4 justify-end">
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Annuler
            </button>
            <button onClick={send} disabled={sending}
              className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending ? 'Envoi...' : 'Envoyer WhatsApp'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

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

const GRACE_DAYS = 30;
const isActionable = (d) =>
  !d.lastContactDate ||
  (Date.now() - new Date(d.lastContactDate).getTime()) / 86_400_000 >= GRACE_DAYS;

const FILTERS = [
  { id: 'all',    label: 'Tous' },
  { id: 'never',  label: 'Jamais contactés' },
  { id: 'high',   label: '6+ mois' },
  { id: 'recent', label: 'Récemment relancés' },
];

export default function Relances({ donors, relances, onAdd, onRemove, addNotification, onUpdateDonor }) {
  const [emailFor, setEmailFor]   = useState(null);
  const [waFor, setWaFor]         = useState(null);
  const [logFor, setLogFor]       = useState(null);
  const [tab, setTab]             = useState('todo');
  const [filter, setFilter]       = useState('all');
  const [sortBy, setSortBy]       = useState('recovery');

  const toContact = useMemo(() => {
    const retard = donors.filter(d => d.status === 'RETARD');
    let list;
    if (filter === 'all')         list = retard.filter(isActionable);
    else if (filter === 'never')  list = retard.filter(d => !d.lastContactDate);
    else if (filter === 'high')   list = retard.filter(d => d.delayMonths >= 6);
    else if (filter === 'recent') list = retard.filter(d => !isActionable(d));
    else list = retard;
    return list.sort((a, b) => {
      if (sortBy === 'recovery') {
        // Jamais contactés d'abord, puis délai croissant (récents = plus récupérables)
        const aNever = !a.lastContactDate ? 0 : 1;
        const bNever = !b.lastContactDate ? 0 : 1;
        if (aNever !== bNever) return aNever - bNever;
        return a.delayMonths - b.delayMonths;
      }
      if (sortBy === 'delay')  return b.delayMonths - a.delayMonths;
      if (sortBy === 'amount') return (b.amount * b.delayMonths) - (a.amount * a.delayMonths);
      return 0;
    });
  }, [donors, filter, sortBy]);

  const allRetard = donors.filter(d => d.status === 'RETARD');
  const actionable   = allRetard.filter(isActionable);
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
      <Modal open={!!waFor} onClose={() => setWaFor(null)} title="Message WhatsApp" size="lg">
        {waFor && <WhatsAppModal donor={waFor} onClose={() => setWaFor(null)} onSent={(relance) => { onAdd(relance); }} addNotification={addNotification} onPhoneUpdate={(id, phone) => onUpdateDonor?.({ id, phone })} />}
      </Modal>
      <Modal open={!!logFor} onClose={() => setLogFor(null)} title="Enregistrer une relance" size="md">
        {logFor && <LogRelanceModal donor={logFor} onSubmit={(data) => { onAdd(data); setLogFor(null); addNotification('✅ Relance enregistrée.'); }} onClose={() => setLogFor(null)} />}
      </Modal>

      {/* STATS HEADER */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        {[
          { icon: <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />, bg: 'bg-red-100 dark:bg-red-900/40', val: allRetard.length, label: criticalCount > 0 ? `${criticalCount} critiques` : 'En retard' },
          { icon: <TrendingDown className="h-4 w-4 text-orange-600 dark:text-orange-400" />, bg: 'bg-orange-100 dark:bg-orange-900/40', val: `${totalDue.toLocaleString('fr-FR')} €`, label: 'Impayés' },
          { icon: <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />, bg: 'bg-yellow-100 dark:bg-yellow-900/40', val: neverCount, label: 'Jamais contactés' },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-300 dark:border-gray-700 shadow p-3 md:p-4 flex items-center gap-2 md:gap-4">
            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${s.bg}`}>{s.icon}</div>
            <div className="min-w-0">
              <p className="text-lg md:text-2xl font-black text-gray-900 dark:text-white truncate">{s.val}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
            <button onClick={() => setTab('todo')} className={`px-3 md:px-5 py-1.5 md:py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'todo' ? 'bg-white dark:bg-gray-800 shadow text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
              À relancer ({actionable.length})
            </button>
            <button onClick={() => setTab('history')} className={`px-3 md:px-5 py-1.5 md:py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'history' ? 'bg-white dark:bg-gray-800 shadow text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
              Historique ({relances.length})
            </button>
          </div>
          {tab === 'todo' && (
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0">
              <option value="recovery">Récupérabilité</option>
              <option value="delay">Délai ↓</option>
              <option value="amount">Montant dû</option>
            </select>
          )}
        </div>
        {tab === 'todo' && (
          <div className="flex gap-1 flex-wrap">
            {FILTERS.map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors border ${filter === f.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:border-blue-400'}`}>
                {f.label}
              </button>
            ))}
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

                <div className="flex-1 px-3 md:px-4 py-3 min-w-0">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${U.avatar}`}>
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
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <div className="flex items-center gap-2 min-w-[120px] flex-1 max-w-[180px]">
                          <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full">
                            <div className={`h-1.5 rounded-full ${U.bar}`} style={{ width: `${Math.min(100, donor.delayMonths / maxDelay * 100)}%` }} />
                          </div>
                          <span className={`text-xs font-bold ${U.text} whitespace-nowrap`}>{donor.delayMonths}m · {(donor.amount * donor.delayMonths).toLocaleString('fr-FR')} €</span>
                        </div>
                        {!never && daysSince !== null && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {daysSince}j
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1.5 flex-shrink-0 items-center">
                      <button onClick={() => setWaFor(donor)}
                        className="p-1.5 md:px-3 md:py-1.5 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 rounded-lg border border-green-200 dark:border-green-800 transition-colors"
                        title="Envoyer message WhatsApp">
                        <Send className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setEmailFor(donor)}
                        className="p-1.5 md:px-3 md:py-1.5 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors"
                        title="Email IA">
                        <Sparkles className="h-3.5 w-3.5" />
                      </button>
                      <a href={`mailto:${donor.email}`}
                        className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 transition-colors" title="Ouvrir email">
                        <Mail className="h-4 w-4" />
                      </a>
                      <QuickLogDropdown donor={donor} onQuickLog={handleQuickLog} onFullLog={() => setLogFor(donor)} />
                    </div>
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
                  <div key={r.id ?? i} className="px-4 py-2.5 flex items-center gap-3 group">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
                    <div className="flex-1 flex items-center gap-3 flex-wrap">
                      <span className="text-xs text-gray-400 dark:text-gray-500 w-20 flex-shrink-0">
                        {new Date(r.date).toLocaleDateString('fr-FR')}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${resultStyle(r.result)}`}>
                        {r.result}
                      </span>
                      {r.note && <span className="text-xs text-gray-500 dark:text-gray-400 italic">{r.note}</span>}
                    </div>
                    {onRemove && r.id && (
                      <button
                        onClick={() => onRemove(r.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-all rounded"
                        title="Annuler cette relance"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
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
