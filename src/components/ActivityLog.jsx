import React, { useState } from 'react';
import { Clock, Search, Download } from 'lucide-react';
import { ROLE_CFG } from '../contexts/AppContext';

const RELATIVE = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)   return `Il y a ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60)   return `Il y a ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24)   return `Il y a ${h}h`;
  const d = Math.floor(h / 24);
  return `Il y a ${d}j`;
};

export default function ActivityLog({ activityLog }) {
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  const filtered = activityLog.filter(e => {
    const matchSearch = `${e.action} ${e.subject} ${e.details} ${e.userName}`.toLowerCase().includes(search.toLowerCase());
    const matchRole   = filterRole === 'all' || e.userRole === filterRole;
    return matchSearch && matchRole;
  });

  const handleExport = () => {
    const headers = ['Date', 'Utilisateur', 'Rôle', 'Action', 'Sujet', 'Détails'];
    const rows = filtered.map(e => [
      new Date(e.timestamp).toLocaleString('fr-FR'),
      e.userName, e.userRole, e.action, e.subject, e.details,
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `journal-activite-${new Date().toLocaleDateString('fr-FR').replace(/\//g,'-')}.csv`;
    a.click();
  };

  return (
    <div className="p-6">
      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
        <div className="flex gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher dans le journal..."
              className="pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tous les rôles</option>
            <option value="admin">Admin</option>
            <option value="tresorier">Trésorier</option>
            <option value="benevole">Bénévole</option>
          </select>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm transition-colors"
        >
          <Download className="h-4 w-4" /> Exporter
        </button>
      </div>

      <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
        {filtered.length} événement{filtered.length !== 1 ? 's' : ''} · Journal des 300 dernières actions
      </p>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-300 dark:border-gray-700 p-16 text-center text-gray-400 dark:text-gray-500">
          <Clock className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Aucune activité enregistrée.</p>
          <p className="text-xs mt-1">Les actions apparaîtront ici en temps réel.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-300 dark:border-gray-700 overflow-hidden">
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.map((entry, i) => {
              const roleCfg = ROLE_CFG[entry.userRole];
              return (
                <div key={entry.id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-300 flex-shrink-0 mt-0.5">
                    {entry.userName.slice(0, 2).toUpperCase()}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{entry.userName}</span>
                      {roleCfg && (
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${roleCfg.cls}`}>
                          {roleCfg.label}
                        </span>
                      )}
                      <span className="text-sm text-gray-700 dark:text-gray-300">{entry.action}</span>
                      {entry.subject && (
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate max-w-[200px]">
                          {entry.subject}
                        </span>
                      )}
                    </div>
                    {entry.details && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{entry.details}</p>
                    )}
                  </div>

                  {/* Time */}
                  <div className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 whitespace-nowrap text-right">
                    <p>{RELATIVE(entry.timestamp)}</p>
                    <p className="mt-0.5">{new Date(entry.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
