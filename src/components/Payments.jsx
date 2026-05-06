import React, { useState } from 'react';
import { Plus, Download, Search } from 'lucide-react';
import { StatusBadge, SourceBadge, Modal, FormField, Input, Select } from './ui';

function AddPaymentModal({ donors, poles, onSubmit, onClose }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    donorId: '',
    date: today,
    amount: '',
    pole: '',
    status: 'Payé',
    source: 'virement',
    reference: '',
  });

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleDonorChange = (id) => {
    const d = donors.find(d => d.id === id);
    set('donorId', id);
    if (d) {
      setForm(prev => ({ ...prev, donorId: id, amount: d.amount, pole: d.pole, source: d.paymentMethod }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.donorId || !form.amount) return;
    const donor = donors.find(d => d.id === form.donorId);
    onSubmit({
      ...form,
      amount: Number(form.amount),
      donor: donor ? `${donor.firstName} ${donor.lastName}` : '',
      email: donor?.email ?? '',
      date: new Date(form.date).toLocaleDateString('fr-FR') + ' 00:00',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Donateur" required>
        <Select value={form.donorId} onChange={e => handleDonorChange(e.target.value)} required>
          <option value="">Sélectionner un donateur...</option>
          {donors.filter(d => d.status !== 'ARRETE').map(d => (
            <option key={d.id} value={d.id}>{d.firstName} {d.lastName} — {d.email}</option>
          ))}
        </Select>
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Date" required>
          <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
        </FormField>
        <FormField label="Montant (€)" required>
          <Input type="number" min="1" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="30" required />
        </FormField>
      </div>

      <FormField label="Pôle">
        <Select value={form.pole} onChange={e => set('pole', e.target.value)}>
          <option value="">Sélectionner un pôle...</option>
          {poles.map(p => <option key={p} value={p}>{p}</option>)}
        </Select>
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Source">
          <Select value={form.source} onChange={e => set('source', e.target.value)}>
            <option value="helloasso">HelloAsso</option>
            <option value="virement">Virement</option>
            <option value="manuel">Manuel</option>
          </Select>
        </FormField>
        <FormField label="Statut">
          <Select value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="Payé">Payé</option>
            <option value="Refusé">Refusé</option>
            <option value="En attente">En attente</option>
          </Select>
        </FormField>
      </div>

      <FormField label="Référence / libellé" hint="Optionnel — ex: numéro de virement bancaire">
        <Input value={form.reference} onChange={e => set('reference', e.target.value)} placeholder="VIR-2026-05-001" />
      </FormField>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
          Annuler
        </button>
        <button type="submit" className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          Enregistrer
        </button>
      </div>
    </form>
  );
}

export default function Payments({ payments, donors, poles, onAdd }) {
  const [showModal, setShowModal]       = useState(false);
  const [filterSource, setFilterSource] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch]             = useState('');

  const filtered = payments.filter(p => {
    const matchSource = filterSource === 'all' || p.source === filterSource;
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchSearch = `${p.donor} ${p.email} ${p.reference ?? ''}`.toLowerCase().includes(search.toLowerCase());
    return matchSource && matchStatus && matchSearch;
  });

  const totalPaid    = filtered.filter(p => p.status === 'Payé').reduce((s, p) => s + p.amount, 0);
  const countPaid    = filtered.filter(p => p.status === 'Payé').length;
  const countRefused = filtered.filter(p => p.status === 'Refusé').length;

  const handleExport = () => {
    const headers = ['Date', 'Réf', 'Donateur', 'Email', 'Pôle', 'Montant', 'Source', 'Statut', 'Référence'];
    const rows = filtered.map(p => [p.date, p.id, p.donor, p.email, p.pole, p.amount, p.source, p.status, p.reference ?? '']);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'paiements.csv'; a.click();
  };

  return (
    <div className="p-6">
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Enregistrer un paiement manuel" size="md">
        <AddPaymentModal
          donors={donors}
          poles={poles}
          onSubmit={(data) => { onAdd(data); setShowModal(false); }}
          onClose={() => setShowModal(false)}
        />
      </Modal>

      {/* TOOLBAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Chercher un donateur..."
              className="pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            value={filterSource}
            onChange={e => setFilterSource(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          >
            <option value="all">Toutes sources</option>
            <option value="helloasso">HelloAsso</option>
            <option value="virement">Virement</option>
            <option value="manuel">Manuel</option>
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          >
            <option value="all">Tous statuts</option>
            <option value="Payé">Payé</option>
            <option value="Refusé">Refusé</option>
            <option value="En attente">En attente</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm transition-colors">
            <Download className="h-4 w-4" /> Exporter CSV
          </button>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors">
            <Plus className="h-4 w-4" /> Paiement manuel
          </button>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="flex gap-4 mb-4 text-sm">
        <span className="text-gray-500 dark:text-gray-400">{filtered.length} transaction(s)</span>
        <span className="text-green-600 dark:text-green-400 font-semibold">{countPaid} payé(s) · {totalPaid} €</span>
        {countRefused > 0 && <span className="text-red-500 dark:text-red-400 font-medium">{countRefused} refusé(s)</span>}
      </div>

      {/* TABLE */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Réf.</th>
                <th className="px-4 py-3">Donateur</th>
                <th className="px-4 py-3">Pôle</th>
                <th className="px-4 py-3 text-center">Source</th>
                <th className="px-4 py-3 text-right">Montant</th>
                <th className="px-4 py-3 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{p.date}</td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-400 dark:text-gray-500">#{p.id.slice(0, 8)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{p.donor}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{p.email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-[200px] truncate" title={p.pole}>{p.pole}</td>
                  <td className="px-4 py-3 text-center"><SourceBadge source={p.source} /></td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-gray-100">{p.amount} €</td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={p.status} /></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-12 text-center text-gray-400 dark:text-gray-500 italic">
                    Aucun paiement trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
