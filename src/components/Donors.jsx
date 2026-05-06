import React, { useState, useEffect, useCallback } from 'react';
import { getDonorPayments, getDonorRelances } from '../api/donors.js';
import {
  Search, Download, Plus, Edit2, Trash2, Eye,
  Sparkles, Copy, Loader2, X, CreditCard, Phone, Mail,
  Calendar, FileText, Clock, CheckCircle2, Shield, AlertTriangle, Ban, RotateCcw, Flame
} from 'lucide-react';
import { StatusBadge, SourceBadge, Modal, FormField, Input, Select } from './ui';

const buildEmail = (donor) =>
`Bonjour ${donor.firstName},

Nous espérons que vous allez bien. Nous nous permettons de vous contacter au sujet de votre engagement généreux envers le projet "${donor.pole}" au sein de l'association Humanit'R.

Il semble que votre prélèvement mensuel de ${donor.amount} € n'ait pas pu être effectué ce mois-ci. Cela arrive parfois — carte bancaire expirée, changement de compte, simple oubli — et nous comprenons tout à fait.

Si vous souhaitez régulariser, rendez-vous sur notre page HelloAsso. Si vous traversez une période difficile, contactez-nous directement.

Votre soutien est précieux pour les bénéficiaires de nos projets.

Cordialement,
L'équipe Humanit'R — Pôle Trésorerie`;

const today = () => new Date().toISOString().split('T')[0];

const EMPTY = {
  firstName: '', lastName: '', email: '', phone: '',
  pole: '', amount: 30, startDate: today(), lastPayment: '',
  status: 'ACTIF', delayMonths: 0, paymentMethod: 'helloasso', notes: '',
  lastContactDate: null, lastContactResult: null,
};

// ── FORMS ─────────────────────────────────────────────────────────────────
function DonorForm({ initial, poles, onSubmit, onClose }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Prénom" required><Input value={form.firstName} onChange={e => set('firstName', e.target.value)} required /></FormField>
        <FormField label="Nom" required><Input value={form.lastName} onChange={e => set('lastName', e.target.value)} required /></FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Email" required><Input type="email" value={form.email} onChange={e => set('email', e.target.value)} required /></FormField>
        <FormField label="Téléphone"><Input type="tel" value={form.phone ?? ''} onChange={e => set('phone', e.target.value)} placeholder="+33 6 ..." /></FormField>
      </div>
      <FormField label="Pôle / Campagne" required>
        <Select value={form.pole} onChange={e => set('pole', e.target.value)} required>
          <option value="">Sélectionner un pôle...</option>
          {poles.map(p => <option key={p} value={p}>{p}</option>)}
        </Select>
      </FormField>
      <div className="grid grid-cols-3 gap-4">
        <FormField label="Montant (€)" required><Input type="number" min="1" value={form.amount} onChange={e => set('amount', Number(e.target.value))} required /></FormField>
        <FormField label="Méthode">
          <Select value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)}>
            <option value="helloasso">HelloAsso</option>
            <option value="virement">Virement</option>
          </Select>
        </FormField>
        <FormField label="Statut">
          <Select value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="ACTIF">ACTIF</option>
            <option value="RETARD">RETARD</option>
            <option value="ARRETE">ARRÊTÉ</option>
          </Select>
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Date d'adhésion"><Input type="date" value={form.startDate ?? ''} onChange={e => set('startDate', e.target.value)} /></FormField>
        <FormField label="Dernier paiement"><Input type="date" value={form.lastPayment?.match(/^\d{4}/) ? form.lastPayment : ''} onChange={e => set('lastPayment', e.target.value)} /></FormField>
      </div>
      <FormField label="Notes internes">
        <textarea className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} placeholder="Informations complémentaires..." />
      </FormField>
      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">Annuler</button>
        <button type="submit" className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          {initial?.id ? 'Enregistrer' : 'Créer le donateur'}
        </button>
      </div>
    </form>
  );
}

function AddPaymentForm({ donor, poles, onSubmit, onClose }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ date: today, amount: donor.amount, pole: donor.pole, status: 'Payé', source: donor.paymentMethod, reference: '' });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit({ ...form, amount: Number(form.amount), donorId: donor.id, donor: `${donor.firstName} ${donor.lastName}`, email: donor.email, date: new Date(form.date).toLocaleDateString('fr-FR') + ' 00:00' }); }} className="space-y-4">
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm border border-blue-100 dark:border-blue-800 text-blue-800 dark:text-blue-300">
        Paiement pour : <strong>{donor.firstName} {donor.lastName}</strong>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Date" required><Input type="date" value={form.date} onChange={e => set('date', e.target.value)} required /></FormField>
        <FormField label="Montant (€)" required><Input type="number" min="1" value={form.amount} onChange={e => set('amount', e.target.value)} required /></FormField>
      </div>
      <FormField label="Pôle"><Select value={form.pole} onChange={e => set('pole', e.target.value)}>{poles.map(p => <option key={p} value={p}>{p}</option>)}</Select></FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Source"><Select value={form.source} onChange={e => set('source', e.target.value)}><option value="helloasso">HelloAsso</option><option value="virement">Virement</option><option value="manuel">Manuel</option></Select></FormField>
        <FormField label="Statut"><Select value={form.status} onChange={e => set('status', e.target.value)}><option value="Payé">Payé</option><option value="Refusé">Refusé</option><option value="En attente">En attente</option></Select></FormField>
      </div>
      <FormField label="Référence" hint="Optionnel — numéro de virement, etc."><Input value={form.reference} onChange={e => set('reference', e.target.value)} placeholder="VIR-2026-05-001" /></FormField>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Annuler</button>
        <button type="submit" className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">Enregistrer</button>
      </div>
    </form>
  );
}

// ── DONOR DETAIL DRAWER ──────────────────────────────────────────────────────
function DonorDetail({ donor, poles, onClose, onEdit, onAddPayment, onAddRelance, onUpdateNotes, onRgpdExport, onRgpdDelete, can, addNotification }) {
  const [notes, setNotes]             = useState(donor.notes ?? '');
  const [notesDirty, setNotesDirty]   = useState(false);
  const [emailText, setEmailText]     = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [showEmail, setShowEmail]     = useState(false);
  const [showAddPmt, setShowAddPmt]   = useState(false);
  const [showRgpd, setShowRgpd]       = useState(false);
  const [rgpdConfirm, setRgpdConfirm] = useState('');
  const [donorPayments, setDonorPayments] = useState([]);
  const [donorRelances, setDonorRelances] = useState([]);
  const [detailLoading, setDetailLoading] = useState(true);

  useEffect(() => {
    setDetailLoading(true);
    Promise.all([getDonorPayments(donor.id), getDonorRelances(donor.id)])
      .then(([pmts, rels]) => {
        setDonorPayments(pmts.data ?? pmts);
        setDonorRelances(rels);
      })
      .catch(() => {})
      .finally(() => setDetailLoading(false));
  }, [donor.id]);

  const handleGenerateEmail = async () => {
    setShowEmail(true); setEmailLoading(true); setEmailText('');
    await new Promise(r => setTimeout(r, 1400));
    setEmailText(buildEmail(donor)); setEmailLoading(false);
  };

  const copy = (text) => {
    navigator.clipboard?.writeText(text).catch(() => {
      const ta = document.createElement('textarea'); ta.value = text;
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    });
    addNotification('✅ Copié !');
  };

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-xl bg-white dark:bg-gray-800 shadow-2xl flex flex-col overflow-hidden">

        {/* HEADER */}
        <div className="px-6 py-5 border-b border-blue-800 bg-gradient-to-r from-blue-950 to-indigo-900 text-white flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-bold text-xl">
                {donor.firstName[0]}{donor.lastName[0]}
              </div>
              <div>
                <h2 className="text-xl font-bold">{donor.firstName} {donor.lastName}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={donor.status} />
                  <SourceBadge source={donor.paymentMethod} />
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg"><X className="h-5 w-5" /></button>
          </div>
          {donor.status === 'RETARD' && (
            <div className="mt-3 bg-red-500/20 border border-red-400/30 rounded-lg px-3 py-2 text-sm font-medium text-red-200">
              ⚠️ {donor.delayMonths} mois de retard — {donor.amount * donor.delayMonths} € dus
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* ACTIONS */}
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex gap-2 flex-wrap">
            {can('edit') && (
              <button onClick={() => onEdit(donor)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm">
                <Edit2 className="h-3.5 w-3.5" /> Modifier
              </button>
            )}
            {can('addPayment') && (
              <button onClick={() => setShowAddPmt(p => !p)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 shadow-sm">
                <CreditCard className="h-3.5 w-3.5" /> Paiement
              </button>
            )}
            {donor.status === 'RETARD' && (
              <button onClick={handleGenerateEmail} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-400 text-xs font-bold rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50">
                <Sparkles className="h-3.5 w-3.5" /> Email IA
              </button>
            )}
            <button onClick={() => setShowRgpd(p => !p)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 text-xs rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 ml-auto">
              <Shield className="h-3.5 w-3.5" /> RGPD
            </button>
          </div>

          {/* ADD PAYMENT */}
          {showAddPmt && (
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/10">
              <AddPaymentForm donor={donor} poles={poles}
                onSubmit={(d) => { onAddPayment(d); setShowAddPmt(false); }}
                onClose={() => setShowAddPmt(false)}
              />
            </div>
          )}

          {/* EMAIL DRAFT */}
          {showEmail && (
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-sm mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-500" /> Brouillon d'email IA
              </h4>
              {emailLoading ? (
                <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400 py-4">
                  <Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm animate-pulse">Génération...</span>
                </div>
              ) : (
                <>
                  <textarea className="w-full h-52 p-3 border border-gray-200 dark:border-gray-600 rounded-lg text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200" value={emailText} onChange={e => setEmailText(e.target.value)} />
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => copy(emailText)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700"><Copy className="h-3.5 w-3.5" /> Copier</button>
                    <button onClick={() => { onAddRelance({ donorId: donor.id, date: new Date().toISOString().split('T')[0], result: 'Envoyé', note: 'Email généré via le back office.' }); setShowEmail(false); addNotification('📧 Relance enregistrée.'); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700"><CheckCircle2 className="h-3.5 w-3.5" /> Marquer envoyé</button>
                    <button onClick={() => setShowEmail(false)} className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Fermer</button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* RGPD PANEL */}
          {showRgpd && (
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-red-50 dark:bg-red-900/10">
              <h4 className="font-semibold text-red-800 dark:text-red-400 text-sm mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4" /> Gestion RGPD
              </h4>
              <div className="space-y-3">
                <button onClick={() => { onRgpdExport(donor.id); }} className="w-full flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                  <FileText className="h-4 w-4 text-blue-500" /> Exporter toutes mes données (JSON)
                </button>
                <div className="p-3 bg-white dark:bg-gray-700 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" /> Droit à l'oubli — action irréversible
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Supprime définitivement le donateur, tous ses paiements et toutes ses relances.
                  </p>
                  <input
                    type="text"
                    placeholder={`Tapez "${donor.lastName}" pour confirmer`}
                    className="w-full border border-red-300 dark:border-red-700 rounded-lg px-3 py-1.5 text-xs mb-2 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    value={rgpdConfirm}
                    onChange={e => setRgpdConfirm(e.target.value)}
                  />
                  <button
                    onClick={() => { if (rgpdConfirm === donor.lastName) { onRgpdDelete(donor.id); onClose(); } }}
                    disabled={rgpdConfirm !== donor.lastName}
                    className="w-full px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Supprimer définitivement
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* INFO */}
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h4 className="font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-3">Informations</h4>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-400"><Mail className="h-4 w-4 text-gray-400 flex-shrink-0" /><a href={`mailto:${donor.email}`} className="text-blue-600 dark:text-blue-400 hover:underline">{donor.email}</a></div>
              {donor.phone && <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-400"><Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />{donor.phone}</div>}
              <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-400"><CreditCard className="h-4 w-4 text-gray-400 flex-shrink-0" />{donor.amount} €/mois · {donor.pole}</div>
              {donor.startDate && <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-400"><Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />Membre depuis le {new Date(donor.startDate).toLocaleDateString('fr-FR')}</div>}
              {donor.lastPayment && <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-400"><Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />Dernier paiement : {donor.lastPayment.split('-').reverse().join('/')}</div>}
              {donor.lastContactDate && <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-400"><FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />Dernier contact : {new Date(donor.lastContactDate).toLocaleDateString('fr-FR')} — {donor.lastContactResult}</div>}
              {(donor.helloassoOrderId || donor.helloassoMemberId) && (
                <div className="flex items-center gap-2.5 text-gray-400 dark:text-gray-500 text-xs font-mono">
                  <span className="text-gray-300 dark:text-gray-600 text-base">#</span>
                  {donor.helloassoOrderId && <span title="N° commande HelloAsso">Cmd {donor.helloassoOrderId}</span>}
                  {donor.helloassoOrderId && donor.helloassoMemberId && <span>·</span>}
                  {donor.helloassoMemberId && <span title="N° membre HelloAsso">Mbr {donor.helloassoMemberId}</span>}
                </div>
              )}
            </div>
          </div>

          {/* PAYMENT HISTORY */}
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h4 className="font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-3">Paiements ({donorPayments.length})</h4>
            {donorPayments.length === 0 ? <p className="text-sm text-gray-400 dark:text-gray-500 italic">Aucun paiement.</p> : (
              <div className="space-y-2">
                {donorPayments.slice(0, 8).map(p => (
                  <div key={p.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-700 dark:text-gray-300 font-medium">{p.date}</span>
                      <SourceBadge source={p.source} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 dark:text-gray-100">{p.amount} €</span>
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RELANCES */}
          {donorRelances.length > 0 && (
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h4 className="font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-3">Relances ({donorRelances.length})</h4>
              <div className="space-y-2">
                {donorRelances.map(r => (
                  <div key={r.id} className="p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{new Date(r.date).toLocaleDateString('fr-FR')}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${r.result === 'Répondu' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600'}`}>{r.result}</span>
                    </div>
                    {r.note && <p className="text-gray-500 dark:text-gray-400 text-xs">{r.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NOTES */}
          <div className="px-5 py-4">
            <h4 className="font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-3">Notes internes</h4>
            <textarea className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-28 resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" placeholder="Ajouter une note..." value={notes} onChange={e => { setNotes(e.target.value); setNotesDirty(true); }} />
            {notesDirty && (
              <button onClick={() => { onUpdateNotes(notes); setNotesDirty(false); addNotification('Notes sauvegardées.'); }} className="mt-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold">Sauvegarder</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function Donors({ donors, donorsTotal = 0, donorsPage = 1, donorsTotalPages = 1, onPageChange, search = '', onSearchChange, filterStatus = 'all', onFilterStatusChange, filterDelay = '', onFilterDelayChange, filterPole = '', onFilterPoleChange, polesData = [], poles, onAdd, onUpdate, onBulkUpdateStatus, onBulkDelete, onDelete, onAddPayment, onAddRelance, onRgpdExport, onRgpdDelete, trashedDonors = [], onLoadTrash, onRestoreDonor, onPurgeDonor, addNotification, can, initialOpenDonor, onClearInitialDonor }) {
  const [filterMethod, setFilterMethod] = useState('all');
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [editingDonor, setEditingDonor]   = useState(null);
  const [isAdding, setIsAdding]           = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [selectedIds, setSelectedIds]     = useState(new Set());
  const [showTrash, setShowTrash]         = useState(false);
  const [purgeConfirm, setPurgeConfirm]   = useState(null);

  useEffect(() => {
    if (initialOpenDonor) {
      setSelectedDonor(initialOpenDonor);
      onClearInitialDonor?.();
    }
  }, [initialOpenDonor]);

  // Réinitialiser sélection au changement de page/filtre
  useEffect(() => { setSelectedIds(new Set()); }, [donors]);

  // search + status are server-side; only filterMethod is local
  const filtered = filterMethod === 'all' ? donors : donors.filter(d => d.paymentMethod === filterMethod);

  const allIds       = filtered.map(d => d.id);
  const allSelected  = allIds.length > 0 && allIds.every(id => selectedIds.has(id));
  const someSelected = allIds.some(id => selectedIds.has(id)) && !allSelected;

  const toggleOne = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(allIds));

  const selectedList = [...selectedIds];
  const handleBulkStatus = (status) => {
    const label = { ACTIF: 'ACTIF', RETARD: 'RETARD', ARRETE: 'ARRÊTÉ' }[status];
    if (!window.confirm(`Passer ${selectedList.length} donateur(s) en ${label} ?`)) return;
    onBulkUpdateStatus?.(selectedList, status);
    setSelectedIds(new Set());
  };
  const handleBulkDelete = () => {
    if (!window.confirm(`Supprimer définitivement ${selectedList.length} donateur(s) ?`)) return;
    onBulkDelete?.(selectedList);
    setSelectedIds(new Set());
  };
  const handleBulkExport = () => {
    const selected = filtered.filter(d => selectedIds.has(d.id));
    const headers = ['Prénom','Nom','Email','Téléphone','Pôle','Montant €','Méthode','Statut','Retard (mois)','Dernier paiement'];
    const rows = selected.map(d => [d.firstName, d.lastName, d.email, d.phone ?? '', d.pole, d.amount, d.paymentMethod, d.status, d.delayMonths, d.lastPayment ?? '']);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })); a.download = `selection_${selected.length}.csv`; a.click();
    addNotification(`📊 ${selected.length} donateur(s) exportés.`);
  };

  const handleExport = () => {
    const headers = ['Prénom','Nom','Email','Téléphone','Pôle','Montant €','Méthode','Statut','Retard (mois)','Dernier paiement'];
    const rows = donors.map(d => [d.firstName, d.lastName, d.email, d.phone ?? '', d.pole, d.amount, d.paymentMethod, d.status, d.delayMonths, d.lastPayment ?? '']);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'donateurs.csv'; a.click();
    addNotification('📊 Export CSV téléchargé.');
  };

  const getLiveDonor = (id) => donors.find(d => d.id === id);

  return (
    <div className="p-6">
      {/* DETAIL DRAWER */}
      {selectedDonor && getLiveDonor(selectedDonor.id) && (
        <DonorDetail
          donor={getLiveDonor(selectedDonor.id)}
          poles={poles}
          onClose={() => setSelectedDonor(null)}
          onEdit={(d) => { setEditingDonor(d); setSelectedDonor(null); }}
          onAddPayment={(data) => { onAddPayment(data); }}
          onAddRelance={onAddRelance}
          onUpdateNotes={(notes) => onUpdate(selectedDonor.id, { notes })}
          onRgpdExport={onRgpdExport}
          onRgpdDelete={onRgpdDelete}
          can={can}
          addNotification={addNotification}
        />
      )}

      {/* ADD/EDIT MODAL */}
      <Modal open={isAdding || !!editingDonor} onClose={() => { setIsAdding(false); setEditingDonor(null); }} title={editingDonor ? `Modifier — ${editingDonor.firstName} ${editingDonor.lastName}` : 'Nouveau donateur'} size="lg">
        <DonorForm
          initial={editingDonor ?? EMPTY} poles={poles}
          onSubmit={(data) => { if (editingDonor) { onUpdate(editingDonor.id, data); addNotification('✅ Donateur mis à jour.'); } else onAdd(data); setIsAdding(false); setEditingDonor(null); }}
          onClose={() => { setIsAdding(false); setEditingDonor(null); }}
        />
      </Modal>

      {/* DELETE CONFIRM */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Confirmer la suppression" size="sm">
        {deleteConfirm && (
          <div>
            <p className="text-gray-700 dark:text-gray-300 mb-6">Supprimer <strong>{deleteConfirm.firstName} {deleteConfirm.lastName}</strong> ? Cette action est irréversible.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Annuler</button>
              <button onClick={() => { onDelete(deleteConfirm.id); setDeleteConfirm(null); }} className="px-5 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">Supprimer</button>
            </div>
          </div>
        )}
      </Modal>

      {/* TRASH MODAL */}
      <Modal open={showTrash} onClose={() => setShowTrash(false)} title={`Corbeille (${trashedDonors.length})`} size="lg">
        {trashedDonors.length === 0 ? (
          <p className="text-center text-gray-400 dark:text-gray-500 italic py-8">La corbeille est vide.</p>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {trashedDonors.map(d => (
              <div key={d.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{d.firstName} {d.lastName}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{d.email} · {d.pole} · supprimé le {new Date(d.deletedAt).toLocaleDateString('fr-FR')}</p>
                </div>
                <button
                  onClick={() => onRestoreDonor?.(d.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold rounded-lg border border-green-200 dark:border-green-700 hover:bg-green-200 dark:hover:bg-green-900/50 flex-shrink-0"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Restaurer
                </button>
                {can('delete') && (
                  purgeConfirm === d.id ? (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-xs text-red-600 dark:text-red-400 font-medium">Confirmer ?</span>
                      <button onClick={() => { onPurgeDonor?.(d.id); setPurgeConfirm(null); }} className="px-2 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700">Oui</button>
                      <button onClick={() => setPurgeConfirm(null)} className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg">Non</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setPurgeConfirm(d.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-semibold rounded-lg border border-red-200 dark:border-red-700 hover:bg-red-200 dark:hover:bg-red-900/50 flex-shrink-0"
                    >
                      <Flame className="h-3.5 w-3.5" /> Définitif
                    </button>
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* TOOLBAR */}
      <div className="flex flex-col gap-3 mb-5">
        {/* Ligne 1 : sélecteur projet + actions */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <select
              value={filterPole}
              onChange={e => onFilterPoleChange?.(e.target.value)}
              className="flex-1 max-w-xs border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm font-medium bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            >
              <option value="">Tous les projets</option>
              {polesData.filter(p => !p.helloassoState || p.helloassoState === 'Public').map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
            {filterPole && (
              <button onClick={() => onFilterPoleChange?.('')} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline whitespace-nowrap">
                Tous les projets
              </button>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {can('delete') && (
              <button
                onClick={() => { onLoadTrash?.(); setShowTrash(true); }}
                className="relative flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm"
              >
                <Trash2 className="h-4 w-4" /> Corbeille
                {trashedDonors.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center">{trashedDonors.length}</span>
                )}
              </button>
            )}
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm">
              <Download className="h-4 w-4" /> Exporter
            </button>
            {can('edit') && (
              <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm">
                <Plus className="h-4 w-4" /> Nouveau donateur
              </button>
            )}
          </div>
        </div>
        {/* Ligne 2 : recherche + filtres secondaires */}
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Nom, email, n° commande HelloAsso…"
              className="pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-72 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              value={search}
              onChange={e => onSearchChange?.(e.target.value)}
            />
          </div>
          <select value={filterStatus} onChange={e => onFilterStatusChange?.(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm">
            <option value="all">Tous les statuts</option>
            <option value="ACTIF">Actifs</option>
            <option value="RETARD">En retard</option>
            <option value="ARRETE">Arrêtés</option>
          </select>
          <select value={filterDelay} onChange={e => onFilterDelayChange?.(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm">
            <option value="">Tout retard</option>
            <option value="3">Retard ≥ 3 mois</option>
            <option value="6">Retard ≥ 6 mois</option>
            <option value="12">Retard ≥ 12 mois</option>
          </select>
          <select value={filterMethod} onChange={e => setFilterMethod(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm">
            <option value="all">Toutes méthodes</option>
            <option value="helloasso">HelloAsso</option>
            <option value="virement">Virement</option>
          </select>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-3 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
          <span className="text-sm font-semibold text-blue-800 dark:text-blue-300 mr-1">
            {selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}
          </span>
          <span className="text-xs text-blue-600 dark:text-blue-400 mr-2">Statut :</span>
          <button onClick={() => handleBulkStatus('ACTIF')}  className="flex items-center gap-1 px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold rounded-lg border border-green-200 dark:border-green-700 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors">
            <CheckCircle2 className="h-3.5 w-3.5" /> Actif
          </button>
          <button onClick={() => handleBulkStatus('RETARD')} className="flex items-center gap-1 px-2.5 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-semibold rounded-lg border border-yellow-200 dark:border-yellow-700 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors">
            <AlertTriangle className="h-3.5 w-3.5" /> Retard
          </button>
          <button onClick={() => handleBulkStatus('ARRETE')} className="flex items-center gap-1 px-2.5 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-semibold rounded-lg border border-orange-200 dark:border-orange-700 hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors">
            <Ban className="h-3.5 w-3.5" /> Arrêté
          </button>
          <div className="w-px h-5 bg-blue-200 dark:bg-blue-700 mx-1" />
          <button onClick={handleBulkExport} className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
            <Download className="h-3.5 w-3.5" /> Exporter
          </button>
          {can('delete') && (
            <button onClick={handleBulkDelete} className="flex items-center gap-1 px-2.5 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-semibold rounded-lg border border-red-200 dark:border-red-700 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors">
              <Trash2 className="h-3.5 w-3.5" /> Supprimer
            </button>
          )}
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-blue-500 dark:text-blue-400 hover:underline flex items-center gap-1">
            <X className="h-3 w-3" /> Annuler
          </button>
        </div>
      )}

      <p className="text-sm text-gray-400 dark:text-gray-500 mb-3">
        {donorsTotal} donateur{donorsTotal !== 1 ? 's' : ''} au total · {filtered.length} affiché{filtered.length !== 1 ? 's' : ''} sur cette page
      </p>

      {/* TABLE */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                <th className="pl-4 pr-2 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected; }}
                    onChange={toggleAll}
                    className="rounded border-gray-300 dark:border-gray-600 text-orange-600 focus:ring-orange-500 cursor-pointer"
                    title="Tout sélectionner"
                  />
                </th>
                <th className="px-4 py-3">Donateur</th>
                <th className="px-4 py-3">Pôle</th>
                <th className="px-4 py-3 text-right">€/mois</th>
                <th className="px-4 py-3 text-center">Méthode</th>
                <th className="px-4 py-3 text-center">Statut</th>
                <th className="px-4 py-3 text-center">Retard</th>
                <th className="px-4 py-3">Dernier don</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map(donor => (
                <tr key={donor.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors ${selectedIds.has(donor.id) ? 'bg-orange-50/50 dark:bg-orange-900/10' : ''}`}>
                  <td className="pl-4 pr-2 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(donor.id)}
                      onChange={() => toggleOne(donor.id)}
                      className="rounded border-gray-300 dark:border-gray-600 text-orange-600 focus:ring-orange-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-left" onClick={() => setSelectedDonor(donor)}>
                      <p className="font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{donor.firstName} {donor.lastName}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{donor.email}</p>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-[160px]"><span className="truncate block" title={donor.pole}>{donor.pole}</span></td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-gray-100">{donor.amount} €</td>
                  <td className="px-4 py-3 text-center"><SourceBadge source={donor.paymentMethod} /></td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={donor.status} /></td>
                  <td className="px-4 py-3 text-center">
                    {donor.delayMonths > 0
                      ? <span className="inline-flex items-center justify-center w-7 h-7 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-bold rounded-full text-xs border border-red-200 dark:border-red-800">{donor.delayMonths}</span>
                      : <span className="text-gray-300 dark:text-gray-600">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{donor.lastPayment ? donor.lastPayment.split('-').reverse().join('/') : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-0.5">
                      <button onClick={() => setSelectedDonor(donor)} className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"><Eye className="h-4 w-4" /></button>
                      {can('edit') && <button onClick={() => setEditingDonor(donor)} className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"><Edit2 className="h-4 w-4" /></button>}
                      {can('delete') && <button onClick={() => setDeleteConfirm(donor)} className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan="9" className="p-12 text-center text-gray-400 dark:text-gray-500 italic">Aucun donateur trouvé.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAGINATION */}
      {donorsTotalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600 dark:text-gray-400">
          <span>Page {donorsPage} sur {donorsTotalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange?.(donorsPage - 1)}
              disabled={donorsPage <= 1}
              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >← Précédent</button>
            <button
              onClick={() => onPageChange?.(donorsPage + 1)}
              disabled={donorsPage >= donorsTotalPages}
              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >Suivant →</button>
          </div>
        </div>
      )}
    </div>
  );
}
