import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Download, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { StatusBadge, SourceBadge, Modal, FormField, Input, Select } from './ui';
import * as paymentsApi from '../api/payments.js';

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
    if (d) setForm(prev => ({ ...prev, donorId: id, amount: d.amount, pole: d.pole, source: d.paymentMethod }));
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

const LIMIT = 50;

export default function Payments({ donors, poles, onAdd }) {
  const [showModal, setShowModal]       = useState(false);
  const [filterSource, setFilterSource] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch]             = useState('');
  const [from, setFrom]                 = useState('');
  const [to, setTo]                     = useState('');
  const [page, setPage]                 = useState(1);

  const [payments, setPayments]   = useState([]);
  const [total, setTotal]         = useState(0);
  const [pages, setPages]         = useState(1);
  const [loading, setLoading]     = useState(false);

  const searchTimer = useRef(null);

  const fetchPayments = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, limit: LIMIT };
      if (filterSource !== 'all') params.source = filterSource;
      if (filterStatus !== 'all') params.status = filterStatus;
      if (search.trim())          params.search = search.trim();
      if (from)                   params.from   = from;
      if (to)                     params.to     = to + 'T23:59:59';
      const res = await paymentsApi.getPayments(params);
      setPayments(res.data);
      setTotal(res.total);
      setPages(res.pages);
      setPage(p);
    } catch { /* silencieux */ }
    setLoading(false);
  }, [filterSource, filterStatus, search, from, to]);

  // Refetch quand les filtres (sauf search) changent
  useEffect(() => {
    fetchPayments(1);
  }, [filterSource, filterStatus, from, to]); // eslint-disable-line

  // Search debouncé
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchPayments(1), 400);
    return () => clearTimeout(searchTimer.current);
  }, [search]); // eslint-disable-line

  const goToPage = (p) => {
    if (p < 1 || p > pages) return;
    fetchPayments(p);
  };

  const handleAdd = async (data) => {
    await onAdd(data);
    setShowModal(false);
    fetchPayments(1);
  };

  const totalPaid    = payments.filter(p => p.status === 'Payé').reduce((s, p) => s + p.amount, 0);
  const countPaid    = payments.filter(p => p.status === 'Payé').length;
  const countRefused = payments.filter(p => p.status === 'Refusé').length;

  const handleExport = () => {
    const headers = ['Date', 'Réf', 'Donateur', 'Email', 'Pôle', 'Montant', 'Source', 'Statut', 'Référence'];
    const rows = payments.map(p => [p.date, p.id, p.donor, p.email, p.pole, p.amount, p.source, p.status, p.reference ?? '']);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'paiements.csv'; a.click();
  };

  // Pagination range (max 5 page buttons)
  const pageRange = () => {
    const delta = 2;
    const range = [];
    for (let i = Math.max(1, page - delta); i <= Math.min(pages, page + delta); i++) range.push(i);
    return range;
  };

  return (
    <div className="p-6">
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Enregistrer un paiement manuel" size="md">
        <AddPaymentModal
          donors={donors}
          poles={poles}
          onSubmit={handleAdd}
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
            onChange={e => { setFilterSource(e.target.value); }}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          >
            <option value="all">Toutes sources</option>
            <option value="helloasso">HelloAsso</option>
            <option value="virement">Virement</option>
            <option value="manuel">Manuel</option>
          </select>
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); }}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          >
            <option value="all">Tous statuts</option>
            <option value="Payé">Payé</option>
            <option value="Refusé">Refusé</option>
            <option value="En attente">En attente</option>
          </select>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              title="Du"
            />
            <span className="text-gray-400 text-sm">→</span>
            <input
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              title="Au"
            />
            {(from || to) && (
              <button onClick={() => { setFrom(''); setTo(''); }} className="text-xs text-gray-400 hover:text-red-500 transition-colors">✕</button>
            )}
          </div>
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
        <span className="text-gray-500 dark:text-gray-400">{total} transaction(s) au total</span>
        <span className="text-green-600 dark:text-green-400 font-semibold">{countPaid} payé(s) · {totalPaid} € <span className="font-normal text-gray-400">(cette page)</span></span>
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
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan="7" className="px-4 py-3">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-full" />
                    </td>
                  </tr>
                ))
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center text-gray-400 dark:text-gray-500 italic">
                    Aucun paiement trouvé.
                  </td>
                </tr>
              ) : payments.map(p => (
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
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Page {page} / {pages} — {total} transactions
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {pageRange().map(p => (
                <button
                  key={p}
                  onClick={() => goToPage(p)}
                  className={`w-8 h-8 text-sm rounded-lg transition-colors ${p === page ? 'bg-blue-600 text-white font-semibold' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page === pages}
                className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
