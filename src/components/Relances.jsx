import React, { useState } from 'react';
import { Sparkles, Copy, Loader2, CheckCircle2, Clock, AlertCircle, MessageSquare } from 'lucide-react';
import { StatusBadge, SourceBadge, Modal, FormField, Input, Select } from './ui';

const buildEmail = (donor) =>
`Bonjour ${donor.firstName},

Nous espérons que vous allez bien. Nous nous permettons de vous contacter au sujet de votre engagement généreux envers le projet "${donor.pole}" au sein de l'association Humanit'R.

Il semble que votre prélèvement mensuel de ${donor.amount} € n'ait pas pu être effectué ce mois-ci. Cela arrive parfois — carte bancaire expirée, changement de compte, ou simple oubli — et nous comprenons tout à fait.

Si vous souhaitez régulariser votre situation, vous pouvez le faire directement sur notre page HelloAsso en quelques clics. Si vous traversez une période de difficultés, n'hésitez pas à nous contacter directement, nous trouverons ensemble la meilleure solution.

Votre soutien est précieux pour les bénéficiaires de nos projets, et nous vous en sommes profondément reconnaissants.

Cordialement,
L'équipe Humanit'R — Pôle Trésorerie`;

function EmailModal({ donor, onClose, onMarkSent }) {
  const [text, setText]       = useState('');
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setTimeout(() => {
      if (!cancelled) { setText(buildEmail(donor)); setLoading(false); }
    }, 1400);
    return () => { cancelled = true; };
  }, [donor]);

  const copy = () => {
    navigator.clipboard?.writeText(text).catch(() => {
      const ta = document.createElement('textarea'); ta.value = text;
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    });
  };

  return (
    <div>
      <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm border border-gray-200 dark:border-gray-600">
        <span className="text-gray-500 dark:text-gray-400">Pour : </span>
        <span className="font-bold text-gray-900 dark:text-gray-100">{donor.firstName} {donor.lastName}</span>
        <span className="text-gray-400 dark:text-gray-500 ml-2 text-xs">{donor.email}</span>
        <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          {donor.delayMonths} mois de retard · {donor.amount * donor.delayMonths} € dû
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-blue-600 dark:text-blue-400 gap-3">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm animate-pulse">Rédaction du message...</p>
        </div>
      ) : (
        <>
          <textarea
            className="w-full h-72 p-4 border border-gray-200 dark:border-gray-600 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            value={text}
            onChange={e => setText(e.target.value)}
          />
          <div className="flex gap-3 mt-4 justify-end">
            <button onClick={copy} className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <Copy className="h-4 w-4" /> Copier
            </button>
            <button
              onClick={onMarkSent}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
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
    <form
      onSubmit={e => { e.preventDefault(); onSubmit({ ...form, donorId: donor.id }); }}
      className="space-y-4"
    >
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Enregistrer une action de relance pour <strong className="text-gray-900 dark:text-gray-100">{donor.firstName} {donor.lastName}</strong>
      </p>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Date">
          <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
        </FormField>
        <FormField label="Résultat">
          <Select value={form.result} onChange={e => set('result', e.target.value)}>
            <option value="Envoyé">Email envoyé</option>
            <option value="Répondu">A répondu</option>
            <option value="Sans réponse">Sans réponse</option>
            <option value="Appel effectué">Appel effectué</option>
          </Select>
        </FormField>
      </div>
      <FormField label="Note">
        <textarea
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
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

export default function Relances({ donors, relances, onAdd, addNotification }) {
  const [emailFor, setEmailFor]   = useState(null);
  const [logFor, setLogFor]       = useState(null);
  const [tab, setTab]             = useState('todo');

  const toContact = donors
    .filter(d => d.status === 'RETARD')
    .sort((a, b) => {
      const aUrgent = !a.lastContactDate ? 1 : 0;
      const bUrgent = !b.lastContactDate ? 1 : 0;
      if (aUrgent !== bUrgent) return bUrgent - aUrgent;
      return b.delayMonths - a.delayMonths;
    });

  const contacted = donors.filter(d => d.status === 'RETARD' && d.lastContactDate);

  const handleMarkSent = (donor) => {
    const relance = { donorId: donor.id, date: new Date().toISOString().split('T')[0], result: 'Envoyé', note: 'Email généré et envoyé via le back office.' };
    onAdd(relance);
    setEmailFor(null);
    addNotification(`📧 Relance enregistrée pour ${donor.firstName} ${donor.lastName}`);
  };

  const handleLogSubmit = (data) => {
    onAdd(data);
    setLogFor(null);
    addNotification('✅ Relance enregistrée.');
  };

  const getDaysSinceContact = (dateStr) => {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="p-6">
      <Modal open={!!emailFor} onClose={() => setEmailFor(null)} title="Email de relance IA" size="lg">
        {emailFor && (
          <EmailModal donor={emailFor} onClose={() => setEmailFor(null)} onMarkSent={() => handleMarkSent(emailFor)} />
        )}
      </Modal>

      <Modal open={!!logFor} onClose={() => setLogFor(null)} title="Enregistrer une relance" size="md">
        {logFor && <LogRelanceModal donor={logFor} onSubmit={handleLogSubmit} onClose={() => setLogFor(null)} />}
      </Modal>

      {/* TABS */}
      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab('todo')}
          className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors ${
            tab === 'todo'
              ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          À relancer ({toContact.length})
        </button>
        <button
          onClick={() => setTab('history')}
          className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors ${
            tab === 'history'
              ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          Historique ({relances.length})
        </button>
      </div>

      {/* TODO TAB */}
      {tab === 'todo' && (
        <div className="space-y-3">
          {toContact.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-16 text-center space-y-2">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-300 dark:text-green-600 mb-3" />
              <p className="text-gray-700 dark:text-gray-300 font-semibold">Aucun donateur en retard actif.</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Les donateurs avec un retard important ont été automatiquement passés en <strong>Arrêté</strong>.<br/>
                Tu peux ajuster ce seuil dans <strong>Paramètres → Règles de statut</strong>.
              </p>
            </div>
          ) : toContact.map(donor => {
            const daysSince = getDaysSinceContact(donor.lastContactDate);
            const neverContacted = !donor.lastContactDate;
            return (
              <div key={donor.id} className={`bg-white dark:bg-gray-800 rounded-xl border shadow-sm p-5 flex items-center gap-5 ${
                neverContacted ? 'border-red-200 dark:border-red-800' : 'border-gray-200 dark:border-gray-700'
              }`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${
                  neverContacted
                    ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
                    : 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400'
                }`}>
                  {donor.firstName[0]}{donor.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{donor.firstName} {donor.lastName}</p>
                    <SourceBadge source={donor.paymentMethod} />
                    {neverContacted && (
                      <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-2 py-0.5 rounded-full">
                        Jamais contacté
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{donor.email} · {donor.pole}</p>
                  <div className="flex items-center gap-4 mt-1.5 text-xs">
                    <span className="font-bold text-red-600 dark:text-red-400">
                      {donor.delayMonths} mois de retard · {donor.amount * donor.delayMonths} € dû
                    </span>
                    {!neverContacted && (
                      <span className="text-gray-400 dark:text-gray-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Dernier contact il y a {daysSince}j · {donor.lastContactResult}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => setEmailFor(donor)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 text-xs font-bold rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Email IA
                  </button>
                  <button
                    onClick={() => setLogFor(donor)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-600 transition-colors"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Enregistrer
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* HISTORY TAB */}
      {tab === 'history' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {relances.length === 0 ? (
            <div className="p-12 text-center text-gray-400 dark:text-gray-500 italic">Aucune relance enregistrée.</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                  <th className="px-5 py-3">Donateur</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Résultat</th>
                  <th className="px-5 py-3">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[...relances].reverse().map(r => {
                  const donor = donors.find(d => d.id === r.donorId);
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                          {donor ? `${donor.firstName} ${donor.lastName}` : '—'}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{donor?.email}</p>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {new Date(r.date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          r.result === 'Répondu' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' :
                          r.result === 'Envoyé'  ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' :
                          'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600'
                        }`}>
                          {r.result}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate" title={r.note}>
                        {r.note || <span className="text-gray-300 dark:text-gray-600 italic">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
