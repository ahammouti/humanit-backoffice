import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

function useCountUp(end, duration = 900) {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    if (!end) { setCurrent(0); return; }
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - (1 - p) ** 3;
      setCurrent(Math.round(end * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [end, duration]);
  return current;
}

export function NavItem({ icon, label, active, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-all border-l-4 ${
        active
          ? 'bg-blue-900 text-white border-blue-400'
          : 'text-blue-300 hover:bg-blue-900/60 hover:text-white border-transparent'
      }`}
    >
      {React.cloneElement(icon, { className: 'h-4 w-4 flex-shrink-0' })}
      <span className="flex-1 text-left">{label}</span>
      {badge > 0 && (
        <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
          {badge}
        </span>
      )}
    </button>
  );
}

export function StatCard({ title, value, subtitle, icon, color = 'blue', onClick }) {
  const colors = {
    blue:   'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800',
    green:  'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border-green-100 dark:border-green-800',
    red:    'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-100 dark:border-red-800',
    orange: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 border-orange-100 dark:border-orange-800',
    purple: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 border-purple-100 dark:border-purple-800',
  };
  const isEur = typeof value === 'string' && value.endsWith(' €');
  const numEnd = typeof value === 'number'
    ? value
    : isEur ? (parseInt(String(value).replace(/[\s ]/g, '')) || 0) : null;
  const animated = useCountUp(numEnd ?? 0);
  const displayValue = numEnd !== null
    ? (typeof value === 'number' ? animated : `${animated.toLocaleString('fr-FR')} €`)
    : value;
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 p-5 rounded-xl shadow border border-gray-300 dark:border-gray-700 transition-all hover:shadow-md ${onClick ? 'cursor-pointer hover:border-blue-400 hover:-translate-y-0.5' : ''}`}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        <div className={`p-2 rounded-lg border ${colors[color] ?? colors.blue}`}>
          {React.cloneElement(icon, { className: 'h-4 w-4' })}
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{displayValue}</p>
      {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>}
      {onClick && <p className="text-xs text-blue-500 mt-2 font-medium opacity-0 group-hover:opacity-100">Voir →</p>}
    </div>
  );
}

export function StatusBadge({ status }) {
  const styles = {
    ACTIF:        'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
    Payé:         'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
    RETARD:       'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
    Refusé:       'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
    ARRETE:       'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600',
    'En attente': 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status] ?? 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600'}`}>
      {status}
    </span>
  );
}

export function SourceBadge({ source }) {
  const cfg = {
    helloasso: { label: 'HelloAsso', cls: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800' },
    virement:  { label: 'Virement',  cls: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800' },
    manuel:    { label: 'Manuel',    cls: 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600' },
  };
  const { label, cls } = cfg[source] ?? cfg.manuel;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${cls}`}>
      {label}
    </span>
  );
}

export function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null;
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div
        className={`bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full ${sizes[size]} flex flex-col max-h-[92vh]`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">{children}</div>
      </div>
    </div>
  );
}

export function BarChart({ data }) {
  const maxVal = Math.max(...data.map(d => Math.max(d.received, d.expected)), 1);
  const sig = data.map(d => `${d.month}${d.received}${d.expected}`).join();
  return (
    <div className="w-full">
      <div className="flex items-end gap-2" style={{ height: 140 }}>
        {data.map((d, i) => (
          <div key={`${sig}-${i}`} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex items-end justify-center gap-0.5" style={{ height: 110 }}>
              <div
                className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-t-sm bar-grow"
                style={{ height: `${(d.expected / maxVal) * 100}%`, animationDelay: `${i * 0.07}s` }}
                title={`Attendu : ${d.expected} €`}
              />
              <div
                className={`flex-1 rounded-t-sm bar-grow ${d.received >= d.expected ? 'bg-emerald-400 dark:bg-emerald-500' : 'bg-blue-500 dark:bg-blue-400'}`}
                style={{ height: `${(d.received / maxVal) * 100}%`, minHeight: d.received > 0 ? 4 : 0, animationDelay: `${i * 0.07 + 0.04}s` }}
                title={`Reçu : ${d.received} €`}
              />
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">{d.month}</span>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{d.received} €</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-3 justify-center">
        <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <span className="w-3 h-2.5 bg-gray-200 dark:bg-gray-600 rounded-sm inline-block" /> Attendu
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <span className="w-3 h-2.5 bg-blue-500 rounded-sm inline-block" /> Reçu
        </span>
      </div>
    </div>
  );
}

export function FormField({ label, required, children, hint }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

export function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 ${className}`}
      {...props}
    />
  );
}

export function Select({ className = '', children, ...props }) {
  return (
    <select
      className={`w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}
