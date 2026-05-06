import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Users, CreditCard, Bell, X, ArrowRight } from 'lucide-react';

const highlight = (text, query) => {
  if (!query || !text) return String(text ?? '');
  const idx = String(text).toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return String(text);
  return (
    <>
      {String(text).slice(0, idx)}
      <mark className="bg-yellow-200 dark:bg-yellow-800 text-inherit rounded-sm px-0.5">
        {String(text).slice(idx, idx + query.length)}
      </mark>
      {String(text).slice(idx + query.length)}
    </>
  );
};

export default function GlobalSearch({ donors, payments, relances, onNavigate, onClose }) {
  const [query, setQuery]     = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef              = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const q = query.trim().toLowerCase();

  const donorResults = q.length < 2 ? [] : donors.filter(d =>
    `${d.firstName} ${d.lastName} ${d.email} ${d.phone ?? ''} ${d.pole}`.toLowerCase().includes(q)
  ).slice(0, 5).map(d => ({
    type: 'donor', id: d.id, icon: <Users className="h-4 w-4 text-blue-500" />,
    primary: `${d.firstName} ${d.lastName}`,
    secondary: d.email,
    tag: d.status,
    data: d,
  }));

  const paymentResults = q.length < 2 ? [] : payments.filter(p =>
    `${p.donor} ${p.email} ${p.reference ?? ''} ${p.amount}`.toLowerCase().includes(q)
  ).slice(0, 4).map(p => ({
    type: 'payment', id: p.id, icon: <CreditCard className="h-4 w-4 text-green-500" />,
    primary: p.donor,
    secondary: `${p.amount} € · ${p.date}`,
    tag: p.status,
    data: p,
  }));

  const relanceResults = q.length < 2 ? [] : relances.filter(r => {
    const donor = donors.find(d => d.id === r.donorId);
    return donor && `${donor.firstName} ${donor.lastName} ${r.note ?? ''}`.toLowerCase().includes(q);
  }).slice(0, 3).map(r => {
    const donor = donors.find(d => d.id === r.donorId);
    return {
      type: 'relance', id: r.id, icon: <Bell className="h-4 w-4 text-orange-500" />,
      primary: donor ? `${donor.firstName} ${donor.lastName}` : '—',
      secondary: `Relance du ${new Date(r.date).toLocaleDateString('fr-FR')} · ${r.result}`,
      tag: r.result,
      data: r,
    };
  });

  const allResults = [...donorResults, ...paymentResults, ...relanceResults];

  const handleSelect = useCallback((result) => {
    if (result.type === 'donor')   onNavigate('donors', result.data);
    if (result.type === 'payment') onNavigate('payments', null);
    if (result.type === 'relance') onNavigate('relances', null);
    onClose();
  }, [onNavigate, onClose]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') setSelected(p => Math.min(p + 1, allResults.length - 1));
      if (e.key === 'ArrowUp')   setSelected(p => Math.max(p - 1, 0));
      if (e.key === 'Enter' && allResults[selected]) handleSelect(allResults[selected]);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [allResults, selected, handleSelect, onClose]);

  const groups = [
    { label: 'Donateurs',  results: donorResults },
    { label: 'Paiements',  results: paymentResults },
    { label: 'Relances',   results: relanceResults },
  ].filter(g => g.results.length > 0);

  let globalIdx = 0;

  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-start justify-center pt-[12vh] px-4" onClick={onClose}>
      <div
        className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-200 dark:border-gray-700">
          <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Chercher un donateur, paiement, relance..."
            className="flex-1 text-sm bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 dark:text-gray-400 px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {q.length < 2 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
              Tapez au moins 2 caractères pour rechercher
            </div>
          ) : allResults.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
              Aucun résultat pour « {query} »
            </div>
          ) : (
            <div className="py-2">
              {groups.map(group => (
                <div key={group.label}>
                  <p className="px-4 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    {group.label}
                  </p>
                  {group.results.map(result => {
                    const idx = globalIdx++;
                    const isSelected = idx === selected;
                    return (
                      <button
                        key={result.id}
                        onClick={() => handleSelect(result)}
                        onMouseEnter={() => setSelected(idx)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-900/30'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <div className="flex-shrink-0 p-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
                          {result.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {highlight(result.primary, query)}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                            {highlight(result.secondary, query)}
                          </p>
                        </div>
                        {result.tag && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">{result.tag}</span>
                        )}
                        {isSelected && <ArrowRight className="h-3 w-3 text-blue-400 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-700 flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
          <span className="flex items-center gap-1">
            <kbd className="bg-gray-100 dark:bg-gray-700 px-1 rounded border border-gray-300 dark:border-gray-600">↑↓</kbd> naviguer
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-gray-100 dark:bg-gray-700 px-1 rounded border border-gray-300 dark:border-gray-600">↵</kbd> sélectionner
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-gray-100 dark:bg-gray-700 px-1 rounded border border-gray-300 dark:border-gray-600">Esc</kbd> fermer
          </span>
        </div>
      </div>
    </div>
  );
}
