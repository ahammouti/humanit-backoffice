import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Moon, Sun, Users, Shield, PlayCircle, AlertTriangle, CheckCircle, Palette } from 'lucide-react';
import { useApp, ROLE_CFG, THEMES, DARK_BG_PRESETS } from '../contexts/AppContext';
import { fetchSettings, updateSettings } from '../api/settings.js';
import client from '../api/client.js';

const STATUS_STYLE = {
  ACTIF:   'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  RETARD:  'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  ARRETE:  'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};
const StatusBadge = ({ status }) => (
  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[status] ?? ''}`}>
    {status}
  </span>
);

const STATIC_USERS = [
  { id: 'u1', email: 'admin@humanit.fr',      name: 'Admin Humanit',      role: 'admin',     initials: 'AH' },
  { id: 'u2', email: 'tresorier@humanit.fr',  name: 'Trésorier Humanit',  role: 'tresorier', initials: 'TH' },
  { id: 'u3', email: 'benevole@humanit.fr',   name: 'Bénévole Humanit',   role: 'benevole',  initials: 'BH' },
];

export default function Settings({ poles, polesData = [], onUpdatePoles, addNotification, can }) {
  const { isDark, toggleDark, accentTheme, setAccentTheme, darkBg, setDarkBg } = useApp();
  const [newPole, setNewPole]   = useState('');
  const [dueDay, setDueDay]     = useState(15);
  const [autoArreteMonths, setAutoArreteMonths] = useState(12);
  const [autoArreteSaving, setAutoArreteSaving] = useState(false);
  const [simDate, setSimDate]   = useState(() => new Date().toISOString().slice(0, 10));
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  useEffect(() => {
    fetchSettings().then(s => {
      if (s.dueDay) setDueDay(s.dueDay);
      if (s.autoArreteMonths) setAutoArreteMonths(s.autoArreteMonths);
    }).catch(() => {});
  }, []);

  const handleAddPole = () => {
    const t = newPole.trim();
    if (!t || poles.includes(t)) return;
    onUpdatePoles([...poles, t]);
    setNewPole('');
    addNotification(`✅ Pôle "${t}" ajouté.`);
  };

  const handleDeletePole = (pole) => {
    onUpdatePoles(poles.filter(p => p !== pole));
    addNotification(`Pôle supprimé.`, 'warning');
  };

  return (
    <div className="p-6 max-w-2xl space-y-8">

      {/* APPEARANCE */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-300 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex items-center gap-2">
          <Palette className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <h3 className="font-bold text-gray-800 dark:text-gray-200">Apparence</h3>
        </div>
        <div className="p-5 space-y-5">

          {/* Mode sombre */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800 dark:text-gray-200 text-sm">Mode sombre</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Basculer entre le thème clair et sombre</p>
            </div>
            <button
              onClick={toggleDark}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${isDark ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 flex items-center justify-center ${isDark ? 'translate-x-6' : 'translate-x-0'}`}>
                {isDark ? <Moon className="h-3 w-3 text-blue-600" /> : <Sun className="h-3 w-3 text-gray-400" />}
              </span>
            </button>
          </div>

          {/* Couleur d'accentuation */}
          <div>
            <p className="font-medium text-gray-800 dark:text-gray-200 text-sm mb-3">Couleur du thème</p>
            <div className="grid grid-cols-3 gap-2.5">
              {Object.entries(THEMES).map(([key, t]) => (
                <button
                  key={key}
                  onClick={() => { setAccentTheme(key); addNotification(`Thème "${t.label}" appliqué.`); }}
                  className={`relative flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all text-left ${
                    accentTheme === key
                      ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700/50'
                  }`}
                >
                  {/* Sidebar preview mini */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg overflow-hidden shadow-sm" style={{ backgroundColor: t.bg }}>
                    <div className="h-2 mt-1.5 mx-1 rounded-sm" style={{ backgroundColor: t.active }} />
                    <div className="h-1.5 mt-1 mx-1 rounded-sm opacity-50" style={{ backgroundColor: t.navBorder }} />
                    <div className="h-1.5 mt-0.5 mx-1 rounded-sm opacity-30" style={{ backgroundColor: t.navBorder }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{t.label}</p>
                    <div className="w-4 h-1.5 rounded-full mt-1" style={{ backgroundColor: t.preview }} />
                  </div>
                  {accentTheme === key && (
                    <div className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full bg-blue-500 dark:bg-blue-400 flex items-center justify-center">
                      <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 8 8"><path d="M1.5 4l2 2 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Fond mode sombre */}
          <div>
            <p className="font-medium text-gray-800 dark:text-gray-200 text-sm mb-1">Fond mode sombre</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Couleur de l'arrière-plan en mode sombre</p>
            <div className="grid grid-cols-3 gap-2.5">
              {Object.entries(DARK_BG_PRESETS).map(([key, p]) => (
                <button
                  key={key}
                  onClick={() => { setDarkBg(key); addNotification(`Fond "${p.label}" appliqué.`); }}
                  className={`relative flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all text-left ${
                    darkBg === key
                      ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700/50'
                  }`}
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg border border-gray-400 overflow-hidden shadow-sm flex flex-col gap-0.5 p-1" style={{ backgroundColor: p.preview }}>
                    <div className="flex-1 rounded-sm opacity-50" style={{ backgroundColor: `rgb(${p.s1})` }} />
                    <div className="h-1.5 rounded-sm opacity-30" style={{ backgroundColor: `rgb(${p.s2})` }} />
                  </div>
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{p.label}</p>
                  {darkBg === key && (
                    <div className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full bg-blue-500 dark:bg-blue-400 flex items-center justify-center">
                      <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 8 8"><path d="M1.5 4l2 2 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* POLES */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-300 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <h3 className="font-bold text-gray-800 dark:text-gray-200">Pôles / Campagnes</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            État synchronisé depuis HelloAsso à chaque sync. Projets archivés masqués des formulaires.
          </p>
        </div>
        <div className="p-5 space-y-2">
          {polesData.length > 0
            ? polesData.map(p => {
                const archived = p.helloassoState && p.helloassoState !== 'Public';
                return (
                  <div key={p.id ?? p.name} className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${archived ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 opacity-60' : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{p.name}</span>
                      {p.helloassoState && p.helloassoState !== 'Public' && (
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300 flex-shrink-0">
                          {p.helloassoState}
                        </span>
                      )}
                    </div>
                    {can('edit') && !archived && (
                      <button onClick={() => handleDeletePole(p.name)} className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })
            : poles.map(pole => (
                <div key={pole} className="flex items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{pole}</span>
                  {can('edit') && (
                    <button onClick={() => handleDeletePole(pole)} className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))
          }
          {can('edit') && (
            <div className="flex gap-2 pt-2">
              <input
                type="text"
                placeholder="Nouveau pôle..."
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                value={newPole}
                onChange={e => setNewPole(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddPole()}
              />
              <button
                onClick={handleAddPole}
                disabled={!newPole.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Plus className="h-4 w-4" /> Ajouter
              </button>
            </div>
          )}
        </div>
      </section>

      {/* SIMULATION */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-300 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex items-center gap-2">
          <PlayCircle className="h-4 w-4 text-blue-500" />
          <div>
            <h3 className="font-bold text-gray-800 dark:text-gray-200">Simuler les statuts</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Visualise les statuts de tes donateurs à une date donnée</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Simuler au</label>
              <input
                type="date"
                value={simDate}
                onChange={e => { setSimDate(e.target.value); setSimResult(null); }}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={async () => {
                setSimLoading(true);
                try {
                  const { data } = await client.get(`/helloasso/simulate?asOf=${simDate}`);
                  setSimResult(data);
                } catch { /* ignore */ } finally {
                  setSimLoading(false);
                }
              }}
              disabled={simLoading}
              className="mt-5 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {simLoading ? '...' : <><PlayCircle className="h-4 w-4" /> Simuler</>}
            </button>
          </div>

          {simResult && (
            <div className="space-y-3">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{simResult.summary.actif}</div>
                  <div className="text-xs text-green-700 dark:text-green-500 font-medium">ACTIF</div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{simResult.summary.retard}</div>
                  <div className="text-xs text-orange-700 dark:text-orange-500 font-medium">RETARD</div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">{simResult.summary.arrete}</div>
                  <div className="text-xs text-red-700 dark:text-red-500 font-medium">ARRÊTÉ</div>
                </div>
              </div>

              {simResult.summary.changes > 0 && (
                <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  {simResult.summary.changes} donateur(s) changeraient de statut
                </div>
              )}
              {simResult.summary.changes === 0 && (
                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2">
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  Aucun changement de statut à cette date
                </div>
              )}

              {/* Table */}
              <div className="overflow-auto max-h-72 rounded-lg border border-gray-300 dark:border-gray-700">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-gray-600 dark:text-gray-300">Donateur</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-600 dark:text-gray-300">Dernier paiement</th>
                      <th className="text-center px-3 py-2 font-semibold text-gray-600 dark:text-gray-300">Statut actuel</th>
                      <th className="text-center px-3 py-2 font-semibold text-gray-600 dark:text-gray-300">Statut simulé</th>
                      <th className="text-center px-3 py-2 font-semibold text-gray-600 dark:text-gray-300">Retard</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {simResult.donors
                      .slice()
                      .sort((a, b) => (b.willChange - a.willChange) || (b.delayMonths - a.delayMonths))
                      .map(d => (
                      <tr key={d.id} className={d.willChange ? 'bg-amber-50 dark:bg-amber-900/10' : ''}>
                        <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200">{d.name}</td>
                        <td className="px-3 py-2 text-gray-500 dark:text-gray-400">
                          {d.lastPayment ? d.lastPayment.split('-').reverse().join('/') : '—'}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <StatusBadge status={d.currentStatus} />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <StatusBadge status={d.simulatedStatus} />
                        </td>
                        <td className="px-3 py-2 text-center text-gray-600 dark:text-gray-400">
                          {d.simulatedStatus === 'RETARD' ? `${d.delayMonths} mois` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* AUTOMATION */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-300 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <h3 className="font-bold text-gray-800 dark:text-gray-200">Règles de statut</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Logique appliquée automatiquement à chaque chargement du tableau de bord</p>
        </div>
        <div className="p-5 space-y-5">
          {/* Retard rule — fixed */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 p-4 text-sm text-gray-700 dark:text-gray-300 space-y-2">
            <p className="font-semibold text-gray-800 dark:text-gray-200">Passage en RETARD — règle fixe</p>
            <ul className="space-y-1.5 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-green-500 font-bold mt-0.5">✓</span>
                <span><strong>ACTIF</strong> : a payé ce mois ou le mois dernier</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500 font-bold mt-0.5">!</span>
                <span><strong>RETARD</strong> : dernier paiement il y a 2 mois ou plus — <em>1 mois de retard par mensualité manquée</em></span>
              </li>
            </ul>
            <p className="text-xs text-gray-400 dark:text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-600">
              Les paiements "En attente" comptent comme payés pour ce calcul.
            </p>
          </div>

          {/* Auto-ARRETE — configurable */}
          {can('manageUsers') && (
            <div className="rounded-lg border border-red-200 dark:border-red-800 overflow-hidden">
              <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
                <p className="font-semibold text-red-800 dark:text-red-300 text-sm">Passage automatique en ARRÊTÉ</p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                  Tout donateur mensuel dépassant ce seuil de retard est automatiquement arrêté. Tu peux toujours arrêter manuellement avant ce seuil.
                </p>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Seuil d'arrêt automatique
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="3" max="24" step="1"
                        value={autoArreteMonths}
                        onChange={e => setAutoArreteMonths(Number(e.target.value))}
                        className="flex-1 accent-red-600"
                      />
                      <span className="text-sm font-bold text-red-700 dark:text-red-400 w-24 text-right">
                        {autoArreteMonths} mois
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>3 mois</span>
                      <span>24 mois</span>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-xs text-gray-600 dark:text-gray-400">
                  Avec ce seuil : tout donateur mensuel sans paiement depuis <strong className="text-red-700 dark:text-red-400">{autoArreteMonths} mois ou plus</strong> sera automatiquement mis en ARRÊTÉ au prochain chargement du tableau de bord.
                </div>
                <button
                  onClick={async () => {
                    setAutoArreteSaving(true);
                    try {
                      await updateSettings({ autoArreteMonths });
                      addNotification(`✅ Seuil d'arrêt automatique mis à jour : ${autoArreteMonths} mois`);
                    } catch {
                      addNotification('Erreur lors de la sauvegarde', 'error');
                    } finally {
                      setAutoArreteSaving(false);
                    }
                  }}
                  disabled={autoArreteSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  <Save className="h-4 w-4" />
                  {autoArreteSaving ? 'Sauvegarde...' : 'Appliquer'}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* USER MANAGEMENT (admin only) */}
      {can('manageUsers') && (
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-300 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <h3 className="font-bold text-gray-800 dark:text-gray-200">Gestion des utilisateurs</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {STATIC_USERS.map(user => {
              const cfg = ROLE_CFG[user.role];
              return (
                <div key={user.id} className="px-5 py-4 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-sm font-bold text-blue-700 dark:text-blue-300 flex-shrink-0">
                    {user.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{user.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{user.email}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${cfg?.cls}`}>
                    {cfg?.label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/10">
            <p className="text-xs text-blue-600 dark:text-blue-400">
              La gestion complète des utilisateurs (ajout/suppression) sera disponible après connexion au backend.
            </p>
          </div>
        </section>
      )}

      {/* RGPD */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-300 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex items-center gap-2">
          <Shield className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <h3 className="font-bold text-gray-800 dark:text-gray-200">RGPD & Données personnelles</h3>
        </div>
        <div className="p-5 space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <p>
            Conformément au RGPD, chaque donateur a le droit d'accéder à ses données, de les exporter, ou de demander leur suppression.
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">→</span>
              <span><strong className="text-gray-700 dark:text-gray-300">Export des données</strong> : disponible sur la fiche de chaque donateur (bouton RGPD). Génère un fichier JSON avec toutes les données.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5">→</span>
              <span><strong className="text-gray-700 dark:text-gray-300">Droit à l'oubli</strong> : supprime le donateur, ses paiements et ses relances. Action irréversible.</span>
            </li>
          </ul>
          <p className="text-xs text-gray-400 dark:text-gray-500 pt-2 border-t border-gray-100 dark:border-gray-700">
            Toutes les actions RGPD sont tracées dans le journal d'activité.
          </p>
        </div>
      </section>

      {/* ROADMAP */}
      <section className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-5">
        <h3 className="font-bold text-blue-800 dark:text-blue-300 text-sm mb-2">Prochaines étapes</h3>
        <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1.5">
          <li>• <strong>Connexion HelloAsso</strong> — synchronisation automatique des dons</li>
          <li>• <strong>Import relevé bancaire</strong> — détection automatique des virements</li>
          <li>• <strong>Reçus fiscaux Cerfa</strong> — génération automatique + envoi par email</li>
          <li>• <strong>Envoi d'emails réel</strong> — via Brevo / Mailjet</li>
          <li>• <strong>Rapport mensuel PDF</strong> — pour le conseil d'administration</li>
        </ul>
      </section>
    </div>
  );
}
