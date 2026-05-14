import React, { useState, useMemo } from 'react';
import { Plus, Search, Pencil, Trash2, Check } from 'lucide-react';
import { Modal, FormField, Input, Select } from './ui';

const CURRENT_YEAR = new Date().getFullYear();

const TYPE_LABEL = { actif: 'Actif', bienfaiteur: 'Bienfaiteur', honneur: 'Honneur' };
const TYPE_STYLE = {
  actif:       'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  bienfaiteur: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
  honneur:     'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
};

export default function Members({ members, onAdd, onUpdate, onDelete }) {
  const [search,      setSearch]      = useState('');
  const [filterPaid,  setFilterPaid]  = useState('all');
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editing,     setEditing]     = useState(null);

  const filtered = useMemo(() => {
    let list = members;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        `${m.firstName} ${m.lastName} ${m.email}`.toLowerCase().includes(q)
      );
    }
    if (filterPaid === 'paid')   list = list.filter(m => m.paid && m.year === CURRENT_YEAR);
    if (filterPaid === 'unpaid') list = list.filter(m => !m.paid || m.year < CURRENT_YEAR);
    return list;
  }, [members, search, filterPaid]);

  const ajour    = members.filter(m => m.paid && m.year === CURRENT_YEAR).length;
  const enAttente = members.length - ajour;

  const openAdd  = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (m) => { setEditing(m);   setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const handleSubmit = async (data) => {
    if (editing) await onUpdate(editing.id, data);
    else         await onAdd(data);
    closeModal();
  };

  return (
    <div className="p-3 md:p-6 space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total membres',   val: members.length, cls: 'text-blue-600 dark:text-blue-400' },
          { label: `À jour ${CURRENT_YEAR}`, val: ajour,    cls: 'text-green-600 dark:text-green-400' },
          { label: 'En attente',       val: enAttente,       cls: 'text-orange-600 dark:text-orange-400' },
        ].map((k, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-300 dark:border-gray-700 shadow p-4">
            <p className={`text-2xl font-black ${k.cls}`}>{k.val}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un membre…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterPaid} onChange={e => setFilterPaid(e.target.value)}
          className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Tous</option>
          <option value="paid">À jour</option>
          <option value="unpaid">En attente</option>
        </select>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Ajouter
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-300 dark:border-gray-700 shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Membre</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 hidden sm:table-cell">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Cotisation</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 hidden md:table-cell">Adhésion</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">
                  Aucun membre trouvé
                </td>
              </tr>
            ) : filtered.map(m => {
              const ajour = m.paid && m.year === CURRENT_YEAR;
              return (
                <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-400 flex-shrink-0">
                        {m.firstName[0]}{m.lastName[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{m.firstName} {m.lastName}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${TYPE_STYLE[m.type] ?? TYPE_STYLE.actif}`}>
                      {TYPE_LABEL[m.type] ?? m.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {ajour ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                        <Check className="h-3 w-3" /> À jour {m.year}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800">
                        En attente {CURRENT_YEAR}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500 hidden md:table-cell">
                    {new Date(m.joinDate).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openEdit(m)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDelete(m.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen} onClose={closeModal}
        title={editing ? 'Modifier le membre' : 'Nouveau membre'}
        size="md"
      >
        <MemberForm initial={editing} onSubmit={handleSubmit} onClose={closeModal} />
      </Modal>
    </div>
  );
}

function MemberForm({ initial, onSubmit, onClose }) {
  const [form, setForm] = useState({
    firstName: initial?.firstName ?? '',
    lastName:  initial?.lastName  ?? '',
    email:     initial?.email     ?? '',
    phone:     initial?.phone     ?? '',
    type:      initial?.type      ?? 'actif',
    year:      initial?.year      ?? CURRENT_YEAR,
    paid:      initial?.paid      ?? false,
    notes:     initial?.notes     ?? '',
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit({ ...form, year: Number(form.year) }); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Prénom" required>
          <Input value={form.firstName} onChange={e => set('firstName', e.target.value)} required />
        </FormField>
        <FormField label="Nom" required>
          <Input value={form.lastName} onChange={e => set('lastName', e.target.value)} required />
        </FormField>
      </div>
      <FormField label="Email" required>
        <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} required />
      </FormField>
      <FormField label="Téléphone">
        <Input value={form.phone} onChange={e => set('phone', e.target.value)} />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Type de membre">
          <Select value={form.type} onChange={e => set('type', e.target.value)}>
            <option value="actif">Actif</option>
            <option value="bienfaiteur">Bienfaiteur</option>
            <option value="honneur">Honneur</option>
          </Select>
        </FormField>
        <FormField label="Année cotisation">
          <Input type="number" value={form.year} onChange={e => set('year', e.target.value)} min={2020} max={2035} />
        </FormField>
      </div>
      <label className="flex items-center gap-2.5 cursor-pointer">
        <input
          type="checkbox" checked={form.paid} onChange={e => set('paid', e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-700 dark:text-gray-300">Cotisation payée pour {form.year}</span>
      </label>
      <FormField label="Notes">
        <textarea
          value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
        />
      </FormField>
      <div className="flex gap-2 justify-end pt-1">
        <button type="button" onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          Annuler
        </button>
        <button type="submit"
          className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          {initial ? 'Enregistrer' : 'Ajouter'}
        </button>
      </div>
    </form>
  );
}
