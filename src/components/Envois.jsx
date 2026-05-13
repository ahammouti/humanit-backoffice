import React, { useState, useMemo } from 'react';
import {
  Send, Plus, Trash2, ChevronDown, ChevronUp, Printer,
  MessageCircle, ExternalLink, CheckCircle2, Clock,
  Edit2, X, Globe, Banknote, AlertCircle, Phone,
  ArrowUpRight, Copy, Settings2, FileText, Sparkles, Loader2,
  TrendingUp, Calendar, CalendarDays, CalendarClock,
  RefreshCw, Pencil, AlertTriangle, CheckSquare, Info,
} from 'lucide-react';
import { Modal, FormField, Input, Select } from './ui';
import { syncRemitly as syncRemitlyApi } from '../api/envois.js';

const MONTH_NAMES = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtNum(n) {
  return Math.round(n || 0).toLocaleString('fr-FR');
}

function calcTotals(items, fraisPct) {
  const subtotalEur = items.reduce((s, it) => s + (parseFloat(it.eur) || 0), 0);
  const totalFcfa   = items.reduce((s, it) => s + (parseFloat(it.fcfa) || 0), 0);
  const fraisEur    = Math.round(subtotalEur * (fraisPct || 0) / 100 * 100) / 100;
  const totalEur    = Math.round((subtotalEur + fraisEur) * 100) / 100;
  return { subtotalEur, fraisEur, totalEur, totalFcfa };
}

function buildWhatsAppMsg(envoi) {
  const { subtotalEur, fraisEur, totalEur, totalFcfa } = calcTotals(envoi.items, envoi.fraisPct);
  const lines = [`Ce que nous devons t'envoyer en urgence c'est :\n`];
  envoi.items.forEach(it => {
    const prefix = it.emoji ? `${it.emoji} ` : '';
    lines.push(`${prefix}${it.label} ${fmtNum(it.fcfa)} FCFA (${fmtNum(it.eur)}€)\n`);
  });
  lines.push(
    `Total`,
    `${fmtNum(subtotalEur)}€ +${envoi.fraisPct}% (frais) = ${fmtNum(totalEur)}€ à envoyer`,
    `${fmtNum(totalFcfa)} FCFA`,
  );
  if (envoi.reference) lines.push('', `Réf : ${envoi.reference}`);
  if (envoi.note)      lines.push('', `📝 ${envoi.note}`);
  return lines.join('\n');
}

function printReceipt(envoi) {
  const { subtotalEur, fraisEur, totalEur, totalFcfa } = calcTotals(envoi.items, envoi.fraisPct);
  const dateStr = new Date(envoi.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const itemRows = envoi.items.map(it => `
    <tr>
      <td>${it.label}</td>
      <td class="r">${fmtNum(it.fcfa)} FCFA</td>
      <td class="r">${fmtNum(it.eur)} €</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html lang="fr"><head>
    <meta charset="UTF-8"><title>Reçu — Humanit'R</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Segoe UI',Arial,sans-serif;padding:40px;color:#1e293b;font-size:14px}
      .hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:20px;border-bottom:2px solid #1e3a5f;margin-bottom:28px}
      .logo{font-size:22px;font-weight:800;color:#1e3a5f}
      .logo small{display:block;font-size:10px;font-weight:500;color:#64748b;letter-spacing:1px;text-transform:uppercase;margin-top:2px}
      .ref{text-align:right;font-size:12px;color:#64748b}
      .ref strong{display:block;font-size:16px;color:#1e3a5f;margin-bottom:4px}
      .meta{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px;padding:16px;background:#f8fafc;border-radius:8px}
      .meta label{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.5px}
      .meta span{display:block;font-size:13px;font-weight:600;margin-top:2px}
      .badge{display:inline-block;padding:2px 8px;border-radius:100px;font-size:11px;font-weight:700}
      .b-r{background:#f0f9ff;color:#0369a1;border:1px solid #bae6fd}
      .b-e{background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0}
      table{width:100%;border-collapse:collapse;margin-bottom:0}
      thead tr{background:#f8fafc}
      th{padding:9px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#64748b;border-bottom:1px solid #e2e8f0}
      td{padding:9px 12px;border-bottom:1px solid #f1f5f9}
      .r{text-align:right;font-variant-numeric:tabular-nums}
      .sub td{font-weight:600;border-top:2px solid #e2e8f0;background:#f8fafc}
      .tot td{font-size:15px;font-weight:800;color:#1e3a5f;background:#eff6ff}
      .fcfa td{font-size:13px;color:#0369a1;background:#f0f9ff}
      .note{margin-top:20px;padding:12px 16px;background:#f8fafc;border-left:4px solid #1e3a5f;border-radius:0 8px 8px 0;font-size:13px;color:#475569}
      .foot{margin-top:36px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #f1f5f9;padding-top:14px}
      @media print{body{padding:20px}@page{margin:12mm}}
    </style>
  </head><body>
    <div class="hdr">
      <div class="logo">Humanit'R<small>Back Office</small></div>
      <div class="ref">
        <strong>Reçu de virement</strong>
        ${envoi.reference ? `Réf : ${envoi.reference}<br>` : ''}${dateStr}
      </div>
    </div>
    <div class="meta">
      <div><label>Méthode</label><span><span class="badge ${envoi.method === 'remitly' ? 'b-r' : 'b-e'}">${envoi.method === 'remitly' ? 'Remitly' : 'Espèces'}</span></span></div>
      <div><label>Destination</label><span>${envoi.destination}</span></div>
      <div><label>Date</label><span>${dateStr}</span></div>
    </div>
    <table>
      <thead><tr><th>Libellé</th><th class="r">Montant FCFA</th><th class="r">Montant EUR</th></tr></thead>
      <tbody>${itemRows}</tbody>
      <tfoot>
        <tr class="sub"><td colspan="2">Sous-total</td><td class="r">${fmtNum(subtotalEur)} €</td></tr>
        <tr><td colspan="2">+ Frais (${envoi.fraisPct}%)</td><td class="r">${fmtNum(fraisEur)} €</td></tr>
        <tr class="tot"><td colspan="2"><strong>Total envoyé (EUR)</strong></td><td class="r"><strong>${fmtNum(totalEur)} €</strong></td></tr>
        <tr class="fcfa"><td colspan="2">= Équivalent FCFA</td><td class="r">${fmtNum(totalFcfa)} FCFA</td></tr>
      </tfoot>
    </table>
    ${envoi.note ? `<div class="note"><strong>Note :</strong> ${envoi.note}</div>` : ''}
    <div class="foot">Document généré le ${new Date().toLocaleDateString('fr-FR')} · Humanit'R Back Office</div>
    <script>window.onload=function(){window.print()}<\/script>
  </body></html>`;

  const w = window.open('', '_blank', 'width=860,height=700');
  if (!w) { alert("Autorisez les popups pour imprimer le reçu."); return; }
  w.document.write(html);
  w.document.close();
}

// ── Sub-components ──────────────────────────────────────────────────────────

function MethodBadge({ method }) {
  return method === 'remitly'
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-full">Remitly</span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold bg-green-50 text-green-700 border border-green-200 rounded-full"><Banknote className="h-3 w-3" />Espèces</span>;
}

function EnvoiCard({ envoi, expanded, onToggle, onWhatsApp, onMarkSent, onEdit, onMarkDone }) {
  const { subtotalEur, fraisEur, totalEur, totalFcfa } = calcTotals(envoi.items, envoi.fraisPct);
  const isPlanned  = envoi.status === 'planifié';
  const isEnCours  = envoi.status === 'en_cours';
  const dateStr = new Date(envoi.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  const borderCls = isEnCours
    ? 'border-2 border-orange-300 dark:border-orange-700'
    : isPlanned
      ? 'border-2 border-dashed border-blue-300'
      : 'border border-gray-200';

  return (
    <div className={`bg-white rounded-xl shadow-sm overflow-hidden ${borderCls}`}>
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
          isEnCours ? 'bg-orange-50 border border-orange-200' :
          isPlanned ? 'bg-blue-50 border border-blue-200' :
          envoi.method === 'remitly' ? 'bg-blue-50 border border-blue-100' : 'bg-green-50 border border-green-100'
        }`}>
          {isEnCours  ? <AlertTriangle className="h-5 w-5 text-orange-500" /> :
           isPlanned  ? <CalendarClock className="h-5 w-5 text-blue-500" /> :
           envoi.method === 'remitly' ? <Globe className="h-5 w-5 text-blue-600" /> : <Banknote className="h-5 w-5 text-green-600" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {isEnCours
              ? <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200 rounded-full"><AlertTriangle className="h-3 w-3" />En cours</span>
              : isPlanned
                ? <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-full"><CalendarClock className="h-3 w-3" />Planifié</span>
                : <MethodBadge method={envoi.method} />
            }
            <span className="text-xs font-semibold text-gray-500">{envoi.destination}</span>
            {envoi.reference && <span className="text-xs text-gray-400 font-mono">{envoi.reference}</span>}
            {isEnCours && <span className="text-xs text-orange-500 font-medium">— Détails à remplir</span>}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{dateStr} · {isEnCours ? 'Import Remitly' : `${envoi.items.length} poste${envoi.items.length > 1 ? 's' : ''}`}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`font-bold text-base ${isEnCours ? 'text-orange-700' : isPlanned ? 'text-blue-700' : 'text-gray-900'}`}>{fmtNum(isEnCours && envoi.remitlyData ? envoi.remitlyData.amountSentEur : totalEur)} €</p>
          <p className="text-xs text-blue-600 font-medium">{fmtNum(isEnCours && envoi.remitlyData ? envoi.remitlyData.amountReceivedFcfa : totalFcfa)} FCFA</p>
        </div>
        <div className="flex-shrink-0 ml-1">
          {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100">
          {/* Remitly raw data banner for en_cours */}
          {isEnCours && envoi.remitlyData && (
            <div className="px-5 py-3 bg-orange-50 border-b border-orange-100 flex items-start gap-3">
              <Info className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-orange-800">
                <p className="font-semibold mb-1">Données importées depuis Remitly</p>
                <div className="flex flex-wrap gap-x-6 gap-y-0.5 text-xs">
                  <span>Envoyé : <strong>{fmtNum(envoi.remitlyData.amountSentEur)} €</strong></span>
                  <span>Reçu : <strong>{fmtNum(envoi.remitlyData.amountReceivedFcfa)} FCFA</strong></span>
                  <span>Taux : <strong>{envoi.remitlyData.exchangeRate} FCFA/€</strong></span>
                  {envoi.remitlyData.feesEur && <span>Frais Remitly : <strong>{envoi.remitlyData.feesEur} €</strong></span>}
                </div>
                <p className="mt-1.5 text-orange-600">Cliquez sur "Renseigner les détails" pour décrire la répartition des fonds.</p>
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                  <th className="px-5 py-2.5">Libellé</th>
                  <th className="px-5 py-2.5 text-right">FCFA</th>
                  <th className="px-5 py-2.5 text-right">EUR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {envoi.items.map(it => (
                  <tr key={it.id}>
                    <td className="px-5 py-2.5 text-sm text-gray-700">{it.emoji && <span className="mr-1">{it.emoji}</span>}{it.label}</td>
                    <td className="px-5 py-2.5 text-sm text-right text-gray-500 font-mono">{fmtNum(it.fcfa)}</td>
                    <td className="px-5 py-2.5 text-sm text-right font-semibold text-gray-800">{fmtNum(it.eur)} €</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="text-sm">
                <tr className="bg-gray-50 border-t border-gray-200">
                  <td className="px-5 py-2 text-gray-500">Sous-total</td><td></td>
                  <td className="px-5 py-2 text-right font-semibold text-gray-700">{fmtNum(subtotalEur)} €</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-5 py-2 text-gray-500">+ Frais ({envoi.fraisPct}%)</td><td></td>
                  <td className="px-5 py-2 text-right text-orange-600 font-semibold">+{fmtNum(fraisEur)} €</td>
                </tr>
                <tr className={`border-t-2 ${isPlanned ? 'bg-blue-50 border-blue-200' : 'bg-blue-50 border-blue-200'}`}>
                  <td className="px-5 py-2.5 font-bold text-blue-900">Total {isPlanned ? 'prévu' : 'envoyé'}</td>
                  <td className="px-5 py-2.5 text-right text-sm text-blue-600 font-semibold">{fmtNum(totalFcfa)} FCFA</td>
                  <td className="px-5 py-2.5 text-right font-bold text-blue-900 text-base">{fmtNum(totalEur)} €</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {envoi.note && (
            <div className="px-5 py-3 bg-amber-50 border-t border-amber-100 text-sm text-amber-800">
              <span className="font-semibold">Note :</span> {envoi.note}
            </div>
          )}

          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex items-center gap-3 flex-wrap">
            {isEnCours ? (
              <>
                <button
                  onClick={() => onEdit?.(envoi)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  <Pencil className="h-4 w-4" /> Renseigner les détails
                </button>
                <button
                  onClick={() => onMarkDone?.(envoi.id)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  <CheckSquare className="h-4 w-4" /> Marquer terminé
                </button>
              </>
            ) : isPlanned ? (
              <>
                <button
                  onClick={() => onEdit?.(envoi)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg transition-colors"
                >
                  <Pencil className="h-4 w-4" /> Modifier
                </button>
                <button
                  onClick={() => onMarkSent?.(envoi.id)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4" /> Marquer comme envoyé
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onEdit?.(envoi)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg transition-colors"
                >
                  <Pencil className="h-4 w-4" /> Modifier
                </button>
                <button
                  onClick={() => printReceipt(envoi)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  <Printer className="h-4 w-4" /> Imprimer / PDF
                </button>
                <button
                  onClick={() => onWhatsApp(envoi)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  <MessageCircle className="h-4 w-4" /> Envoyer à Harouna
                </button>
                {envoi.method === 'remitly' && (
                  <a href="https://www.remitly.com" target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 text-sm font-semibold rounded-lg transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" /> Ouvrir Remitly
                  </a>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

const emptyForm = () => ({
  status: 'envoyé',
  method: 'remitly',
  destination: 'Cameroun',
  date: new Date().toISOString().split('T')[0],
  reference: '',
  fraisPct: 2,
  exchangeRate: 656,
  note: '',
  items: [{ id: Date.now(), emoji: '', label: '', eur: '', fcfa: '' }],
});

function formFromEnvoi(envoi) {
  return {
    status:       envoi.status === 'en_cours' ? 'envoyé' : envoi.status,
    method:       envoi.method,
    destination:  envoi.destination,
    date:         envoi.date,
    reference:    envoi.reference || '',
    fraisPct:     envoi.fraisPct ?? 0,
    exchangeRate: envoi.exchangeRate || 656,
    note:         envoi.note || '',
    items: envoi.items?.length > 0
      ? envoi.items.map(it => ({ ...it }))
      : [{ id: Date.now(), emoji: '', label: '', eur: envoi.remitlyData?.amountSentEur || '', fcfa: envoi.remitlyData?.amountReceivedFcfa || '' }],
  };
}

export default function Envois({ envois, onAdd, onUpdate, onRefresh }) {
  const [filter,       setFilter]      = useState('all');
  const [expandedId,   setExpandedId]  = useState(null);
  const [showCreate,   setShowCreate]  = useState(false);
  const [editId,       setEditId]      = useState(null);
  const [form,         setForm]        = useState(emptyForm);
  const [harounaPhone, setHarounaPhone] = useState(() => localStorage.getItem('harouna_wa') || '');
  const [editPhone,    setEditPhone]   = useState(false);
  const [phoneInput,   setPhoneInput]  = useState('');
  const [showPreview,  setShowPreview] = useState(false);
  const [previewMsg,   setPreviewMsg]  = useState('');
  const [syncing,      setSyncing]     = useState(false);
  const [syncBanner,   setSyncBanner]  = useState(null);

  const openEdit = (envoi) => {
    setForm(formFromEnvoi(envoi));
    setEditId(envoi.id);
    setShowCreate(true);
  };

  const openWhatsAppPreview = (envoi) => {
    setPreviewMsg(buildWhatsAppMsg(envoi));
    setShowPreview(true);
  };

  const sendWhatsApp = () => {
    if (!harounaPhone) { alert("Configurez le numéro WhatsApp de Harouna."); return; }
    const clean = harounaPhone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(previewMsg)}`, '_blank');
    setShowPreview(false);
  };

  const syncRemitly = async () => {
    setSyncing(true);
    setSyncBanner(null);
    try {
      const result = await syncRemitlyApi();
      setSyncBanner({ added: result.imported, skipped: result.total - result.imported });
      if (result.imported > 0 && onRefresh) onRefresh();
    } catch {
      setSyncBanner({ added: 0, skipped: 0, error: true });
    }
    setSyncing(false);
    setTimeout(() => setSyncBanner(null), 6000);
  };

  const [loadingAI, setLoadingAI] = useState(false);

  const polishWithAI = async () => {
    setLoadingAI(true);
    await new Promise(r => setTimeout(r, 1400));
    // Parse current message to extract envoi context, then reformat
    const lines = previewMsg.split('\n').filter(l => l.trim());
    const itemLines = lines.filter(l => /FCFA/.test(l));
    const totalLine = lines.find(l => /à envoyer/.test(l)) || '';
    const fcfaLine  = lines.find((l, i) => /FCFA/.test(l) && i === lines.length - 1 && !/€/.test(l)) || '';
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const polished = [
      `Salam 'alaykum frère Harouna,`,
      ``,
      `Voici le récapitulatif de l'envoi du ${dateStr} :`,
      ``,
      ...itemLines,
      ``,
      `━━━━━━━━━━━━━━━━━━━`,
      totalLine,
      fcfaLine,
      `━━━━━━━━━━━━━━━━━━━`,
      ``,
      `Merci de confirmer dès réception. Barakallahu fik 🤲`,
      ``,
      `— Équipe Humanit'R`,
    ].join('\n');
    setPreviewMsg(polished);
    setLoadingAI(false);
  };

  const filtered = useMemo(() => {
    const list = filter === 'all' ? envois : envois.filter(e => e.method === filter);
    return [...list].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [envois, filter]);

  // En cours (imported from Remitly, pending details)
  const enCours = useMemo(() => filtered.filter(e => e.status === 'en_cours')
    .sort((a, b) => new Date(b.date) - new Date(a.date)), [filtered]);

  // Planned envois
  const planned = useMemo(() => filtered.filter(e => e.status === 'planifié'), [filtered]);

  // Sent envois grouped by year → month (excludes en_cours + planifié)
  const groupedByYear = useMemo(() => {
    const sent = filtered.filter(e => e.status === 'envoyé');
    const yearMap = {};
    sent.forEach(e => {
      const d = new Date(e.date);
      const y = d.getFullYear();
      const m = d.getMonth();
      const mk = `${y}-${String(m + 1).padStart(2, '0')}`;
      if (!yearMap[y]) yearMap[y] = { year: y, totalEur: 0, months: {} };
      if (!yearMap[y].months[mk]) yearMap[y].months[mk] = { month: m, year: y, label: `${MONTH_NAMES[m]} ${y}`, envois: [], totalEur: 0 };
      const tot = calcTotals(e.items, e.fraisPct).totalEur;
      yearMap[y].months[mk].envois.push(e);
      yearMap[y].months[mk].totalEur += tot;
      yearMap[y].totalEur += tot;
    });
    return Object.values(yearMap)
      .sort((a, b) => b.year - a.year)
      .map(y => ({ ...y, months: Object.values(y.months).sort((a, b) => b.month - a.month) }));
  }, [filtered]);

  const stats = useMemo(() => {
    const now   = new Date();
    const cy    = now.getFullYear();
    const cm    = now.getMonth();
    const byYear  = envois.filter(e => new Date(e.date).getFullYear() === cy);
    const byMonth = envois.filter(e => { const d = new Date(e.date); return d.getFullYear() === cy && d.getMonth() === cm; });

    const sum = (arr) => arr.reduce((s, e) => s + calcTotals(e.items, e.fraisPct).totalEur, 0);

    return {
      totalEur:       sum(envois),
      totalCount:     envois.length,
      annualEur:      sum(byYear),
      annualCount:    byYear.length,
      monthlyEur:     sum(byMonth),
      monthlyCount:   byMonth.length,
      remitlyAll:     envois.filter(e => e.method === 'remitly').length,
      remitlyMonth:   byMonth.filter(e => e.method === 'remitly').length,
      especesAll:     envois.filter(e => e.method === 'especes').length,
      especesMonth:   byMonth.filter(e => e.method === 'especes').length,
      // keep for filter tabs
      remitlyCount:   envois.filter(e => e.method === 'remitly').length,
      especesCount:   envois.filter(e => e.method === 'especes').length,
      currentMonth:   now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      currentYear:    cy,
    };
  }, [envois]);

  // ── Phone config ──────────────────────────────────────────────────────────
  const savePhone = () => {
    localStorage.setItem('harouna_wa', phoneInput);
    setHarounaPhone(phoneInput);
    setEditPhone(false);
  };

  // ── Form helpers ──────────────────────────────────────────────────────────
  const addItem = () => {
    setForm(f => ({ ...f, items: [...f.items, { id: Date.now(), emoji: '', label: '', eur: '', fcfa: '' }] }));
  };

  const removeItem = (id) => {
    setForm(f => ({ ...f, items: f.items.filter(it => it.id !== id) }));
  };

  const updateItem = (id, field, value) => {
    setForm(f => ({
      ...f,
      items: f.items.map(it => {
        if (it.id !== id) return it;
        const updated = { ...it, [field]: value };
        if (field === 'eur' && value !== '') {
          updated.fcfa = String(Math.round((parseFloat(value) || 0) * f.exchangeRate));
        }
        return updated;
      }),
    }));
  };

  const handleSubmit = () => {
    const validItems = form.items.filter(it => it.label.trim() && (it.eur || it.fcfa));
    if (validItems.length === 0) return;
    const payload = {
      status:      form.status,
      date:        form.date,
      method:      form.method,
      destination: form.destination,
      reference:   form.reference,
      fraisPct:    parseFloat(form.fraisPct) || 0,
      exchangeRate: parseFloat(form.exchangeRate) || 656,
      items: validItems.map(it => ({
        id: it.id, emoji: it.emoji || '', label: it.label,
        eur: parseFloat(it.eur) || 0, fcfa: parseFloat(it.fcfa) || 0,
      })),
      note: form.note,
    };
    if (editId) {
      onUpdate?.(editId, payload);
      setEditId(null);
    } else {
      onAdd({ id: `env${Date.now()}`, ...payload });
    }
    setForm(emptyForm());
    setShowCreate(false);
  };

  const { subtotalEur: fSubtotal, fraisEur: fFrais, totalEur: fTotal, totalFcfa: fFcfa } =
    calcTotals(form.items, form.fraisPct);

  const tabCls = (t) => `px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
    filter === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
  }`;

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Virements & Envois terrain</h2>
          <p className="text-sm text-gray-500 mt-0.5">Gérez les envois vers Harouna (Remitly ou espèces)</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sync Remitly */}
          <button
            onClick={syncRemitly}
            disabled={syncing}
            className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Synchronisation…' : 'Sync Remitly'}
          </button>
          {/* Harouna phone config */}
          {editPhone ? (
            <div className="flex items-center gap-2">
              <input
                type="tel"
                value={phoneInput}
                onChange={e => setPhoneInput(e.target.value)}
                placeholder="+237 6XX XX XX XX"
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={savePhone} className="px-3 py-1.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700">
                Enregistrer
              </button>
              <button onClick={() => setEditPhone(false)} className="px-3 py-1.5 text-gray-500 hover:text-gray-700">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setPhoneInput(harounaPhone); setEditPhone(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm rounded-lg transition-colors"
            >
              <Phone className="h-3.5 w-3.5" />
              {harounaPhone
                ? <span className="font-mono">{harounaPhone}</span>
                : <span className="text-orange-600 font-semibold">Configurer WhatsApp Harouna</span>
              }
              <Edit2 className="h-3 w-3 opacity-50" />
            </button>
          )}
          <button
            onClick={() => { setForm({ ...emptyForm(), status: 'planifié' }); setShowCreate(true); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-blue-300 hover:bg-blue-50 text-blue-700 text-sm font-semibold rounded-lg transition-colors shadow-sm"
          >
            <CalendarClock className="h-4 w-4" /> Planifier
          </button>
          <button
            onClick={() => { setForm(emptyForm()); setShowCreate(true); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" /> Virement effectué
          </button>
        </div>
      </div>

      {/* ── SYNC BANNER ────────────────────────────────────────────────────── */}
      {syncBanner && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border ${syncBanner.added > 0 ? 'bg-violet-50 border-violet-200 text-violet-800' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
          <RefreshCw className="h-4 w-4 flex-shrink-0" />
          {syncBanner.added > 0
            ? <span><strong>{syncBanner.added}</strong> nouveau{syncBanner.added > 1 ? 'x' : ''} virement{syncBanner.added > 1 ? 's' : ''} importé{syncBanner.added > 1 ? 's' : ''} — détails à renseigner. {syncBanner.skipped > 0 && `${syncBanner.skipped} déjà présent${syncBanner.skipped > 1 ? 's' : ''}.`}</span>
            : <span>Synchronisation terminée — aucun nouveau virement trouvé.</span>
          }
          <button onClick={() => setSyncBanner(null)} className="ml-auto"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* ── STATS ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Total global */}
        <div className="bg-blue-950 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="h-3.5 w-3.5 text-blue-300" />
            <p className="text-xs font-medium uppercase tracking-wider text-blue-300">Total envoyé</p>
          </div>
          <p className="text-2xl font-bold text-white">{fmtNum(stats.totalEur)} €</p>
          <p className="text-xs text-blue-400 mt-1">{stats.totalCount} virement{stats.totalCount > 1 ? 's' : ''} au total</p>
        </div>

        {/* Annual */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <Calendar className="h-3.5 w-3.5 text-blue-500" />
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Annuel {stats.currentYear}</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{fmtNum(stats.annualEur)} €</p>
          <p className="text-xs text-gray-400 mt-1">{stats.annualCount} virement{stats.annualCount > 1 ? 's' : ''} en {stats.currentYear}</p>
        </div>

        {/* Monthly */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <CalendarDays className="h-3.5 w-3.5 text-indigo-500" />
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Ce mois</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{fmtNum(stats.monthlyEur)} €</p>
          <p className="text-xs text-gray-400 mt-1">{stats.monthlyCount} virement{stats.monthlyCount > 1 ? 's' : ''} · {stats.currentMonth}</p>
        </div>

        {/* Remitly vs Espèces detail */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-3">Remitly / Espèces</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Globe className="h-3 w-3 text-blue-500" />
                <span className="text-xs font-semibold text-blue-600">Remitly</span>
              </div>
              <p className="text-lg font-bold text-gray-900">{stats.remitlyAll}</p>
              <p className="text-xs text-gray-400">global</p>
              <p className="text-sm font-semibold text-blue-600 mt-1">{stats.remitlyMonth}</p>
              <p className="text-xs text-gray-400">ce mois</p>
            </div>
            <div className="border-l border-gray-100 pl-2">
              <div className="flex items-center gap-1 mb-1">
                <Banknote className="h-3 w-3 text-green-500" />
                <span className="text-xs font-semibold text-green-600">Espèces</span>
              </div>
              <p className="text-lg font-bold text-gray-900">{stats.especesAll}</p>
              <p className="text-xs text-gray-400">global</p>
              <p className="text-sm font-semibold text-green-600 mt-1">{stats.especesMonth}</p>
              <p className="text-xs text-gray-400">ce mois</p>
            </div>
          </div>
        </div>

      </div>

      {/* ── FILTER TABS ────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button onClick={() => setFilter('all')}      className={tabCls('all')}>
          <span className="flex items-center gap-1.5">
            Tous ({envois.length})
            {enCours.length > 0 && <span className="bg-orange-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 leading-none">{enCours.length}</span>}
          </span>
        </button>
        <button onClick={() => setFilter('remitly')}  className={tabCls('remitly')}>
          <span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> Remitly ({stats.remitlyCount})</span>
        </button>
        <button onClick={() => setFilter('especes')}  className={tabCls('especes')}>
          <span className="flex items-center gap-1.5"><Banknote className="h-3.5 w-3.5" /> Espèces ({stats.especesCount})</span>
        </button>
      </div>

      {/* ── EN COURS ───────────────────────────────────────────────────────── */}
      {enCours.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <h3 className="text-sm font-bold text-orange-700 uppercase tracking-wider">Tâches en cours — {enCours.length} à compléter</h3>
            <div className="flex-1 border-t-2 border-dashed border-orange-200" />
            <span className="text-sm font-bold text-orange-700">
              {fmtNum(enCours.reduce((s, e) => s + (e.remitlyData?.amountSentEur || 0), 0))} €
            </span>
          </div>
          {enCours.map(envoi => (
            <EnvoiCard
              key={envoi.id}
              envoi={envoi}
              expanded={expandedId === envoi.id}
              onToggle={() => setExpandedId(expandedId === envoi.id ? null : envoi.id)}
              onWhatsApp={openWhatsAppPreview}
              onMarkSent={(id) => onUpdate?.(id, { status: 'envoyé' })}
              onMarkDone={(id) => onUpdate?.(id, { status: 'envoyé' })}
              onEdit={openEdit}
            />
          ))}
        </div>
      )}

      {/* ── PLANNED ────────────────────────────────────────────────────────── */}
      {planned.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <CalendarClock className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-bold text-blue-700 uppercase tracking-wider">À venir — {planned.length} planifié{planned.length > 1 ? 's' : ''}</h3>
            <div className="flex-1 border-t-2 border-dashed border-blue-200" />
            <span className="text-sm font-bold text-blue-700">
              {fmtNum(planned.reduce((s, e) => s + calcTotals(e.items, e.fraisPct).totalEur, 0))} €
            </span>
          </div>
          {planned.map(envoi => (
            <EnvoiCard
              key={envoi.id}
              envoi={envoi}
              expanded={expandedId === envoi.id}
              onToggle={() => setExpandedId(expandedId === envoi.id ? null : envoi.id)}
              onWhatsApp={openWhatsAppPreview}
              onMarkSent={(id) => onUpdate?.(id, { status: 'envoyé' })}
              onEdit={openEdit}
            />
          ))}
        </div>
      )}

      {/* ── GROUPED HISTORY ────────────────────────────────────────────────── */}
      {filtered.filter(e => e.status === 'envoyé').length === 0 && planned.length === 0 && enCours.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Send className="h-8 w-8 mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 font-medium">Aucun virement enregistré</p>
          <button onClick={() => setShowCreate(true)} className="mt-4 text-sm text-blue-600 hover:underline font-semibold">
            + Enregistrer le premier virement
          </button>
        </div>
      ) : (
        groupedByYear.map(yearGroup => (
          <div key={yearGroup.year} className="space-y-4">
            {/* Year header */}
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-gray-400" />
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{yearGroup.year}</h3>
              <div className="flex-1 border-t border-gray-200" />
              <span className="text-sm font-bold text-gray-700">{fmtNum(yearGroup.totalEur)} €</span>
            </div>
            {/* Month groups */}
            {yearGroup.months.map(monthGroup => (
              <div key={monthGroup.label} className="space-y-3">
                {/* Month header */}
                <div className="flex items-center gap-3 pl-2">
                  <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{monthGroup.label}</span>
                  <span className="text-xs text-gray-400">— {monthGroup.envois.length} envoi{monthGroup.envois.length > 1 ? 's' : ''}</span>
                  <div className="flex-1 border-t border-gray-100" />
                  <span className="text-xs font-bold text-gray-600">{fmtNum(monthGroup.totalEur)} €</span>
                </div>
                {monthGroup.envois.map(envoi => (
                  <EnvoiCard
                    key={envoi.id}
                    envoi={envoi}
                    expanded={expandedId === envoi.id}
                    onToggle={() => setExpandedId(expandedId === envoi.id ? null : envoi.id)}
                    onWhatsApp={openWhatsAppPreview}
                    onMarkSent={(id) => onUpdate?.(id, { status: 'envoyé' })}
                    onEdit={openEdit}
                  />
                ))}
              </div>
            ))}
          </div>
        ))
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          CREATE MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setEditId(null); setForm(emptyForm()); }} title={editId ? 'Modifier le virement' : 'Nouveau virement terrain'} size="xl">
        <div className="space-y-5">

          {/* Status toggle */}
          <div className="flex gap-3">
            {[
              { val: 'envoyé',   label: 'Virement effectué', icon: <CheckCircle2 className="h-4 w-4" />, desc: 'Transfert déjà réalisé', cls: 'border-green-500 bg-green-50', icls: 'bg-green-100 text-green-700', tcls: 'text-green-800' },
              { val: 'planifié', label: 'Planifier un envoi', icon: <CalendarClock className="h-4 w-4" />, desc: 'Transfert futur à confirmer', cls: 'border-blue-500 bg-blue-50', icls: 'bg-blue-100 text-blue-700', tcls: 'text-blue-800' },
            ].map(s => (
              <button
                key={s.val}
                onClick={() => setForm(f => ({ ...f, status: s.val }))}
                className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition-colors text-left ${form.status === s.val ? s.cls : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className={`p-2 rounded-lg ${form.status === s.val ? s.icls : 'bg-gray-100 text-gray-500'}`}>{s.icon}</div>
                <div>
                  <p className={`font-semibold text-sm ${form.status === s.val ? s.tcls : 'text-gray-700'}`}>{s.label}</p>
                  <p className="text-xs text-gray-400">{s.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Method toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Méthode d'envoi</label>
            <div className="flex gap-3">
              {[
                { val: 'remitly', label: 'Remitly', icon: <Globe className="h-4 w-4" />, desc: 'Transfert international en ligne' },
                { val: 'especes', label: 'Espèces', icon: <Banknote className="h-4 w-4" />, desc: 'Envoi manuel en cash' },
              ].map(m => (
                <button
                  key={m.val}
                  onClick={() => setForm(f => ({ ...f, method: m.val }))}
                  className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition-colors text-left ${
                    form.method === m.val
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${form.method === m.val ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                    {m.icon}
                  </div>
                  <div>
                    <p className={`font-semibold text-sm ${form.method === m.val ? 'text-blue-800' : 'text-gray-700'}`}>{m.label}</p>
                    <p className="text-xs text-gray-400">{m.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Meta fields */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Destination">
              <Select value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}>
                {['Cameroun', 'Sahel', 'Autre'].map(d => <option key={d}>{d}</option>)}
              </Select>
            </FormField>
            <FormField label="Date">
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </FormField>
            <FormField label="Référence (optionnel)">
              <Input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="REM-2026-05-001" />
            </FormField>
            <FormField label={`Taux FCFA/€ (utilisé pour auto-calcul)`}>
              <Input
                type="number"
                value={form.exchangeRate}
                onChange={e => setForm(f => ({ ...f, exchangeRate: parseFloat(e.target.value) || 656 }))}
              />
            </FormField>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Détail des postes</label>
              <button onClick={addItem} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold">
                <Plus className="h-3.5 w-3.5" /> Ajouter un poste
              </button>
            </div>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="grid grid-cols-[32px_1fr_100px_130px_32px] bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2 gap-2">
                <span title="Emoji">😀</span>
                <span>Libellé</span>
                <span className="text-right">EUR</span>
                <span className="text-right">FCFA</span>
                <span></span>
              </div>
              <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                {form.items.map((it, idx) => (
                  <div key={it.id} className="grid grid-cols-[32px_1fr_100px_130px_32px] px-3 py-2 gap-2 items-center">
                    <input
                      type="text"
                      value={it.emoji}
                      onChange={e => updateItem(it.id, 'emoji', e.target.value)}
                      placeholder="💧"
                      maxLength={2}
                      className="text-base text-center border border-gray-200 rounded px-1 py-0.5 w-full focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                    <input
                      type="text"
                      value={it.label}
                      onChange={e => updateItem(it.id, 'label', e.target.value)}
                      placeholder={`Poste ${idx + 1}`}
                      className="text-sm border-none focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5 w-full"
                    />
                    <input
                      type="number"
                      value={it.eur}
                      onChange={e => updateItem(it.id, 'eur', e.target.value)}
                      placeholder="0"
                      className="text-sm text-right border border-gray-200 rounded px-2 py-0.5 w-full focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                    <input
                      type="number"
                      value={it.fcfa}
                      onChange={e => updateItem(it.id, 'fcfa', e.target.value)}
                      placeholder="0"
                      className="text-sm text-right border border-gray-200 rounded px-2 py-0.5 w-full focus:outline-none focus:ring-1 focus:ring-blue-400 font-mono"
                    />
                    <button
                      onClick={() => removeItem(it.id)}
                      disabled={form.items.length === 1}
                      className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Frais + Note */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Frais (%)" hint="Frais de transfert en pourcentage du sous-total EUR">
              <Input
                type="number"
                step="0.1"
                value={form.fraisPct}
                onChange={e => setForm(f => ({ ...f, fraisPct: e.target.value }))}
              />
            </FormField>
            <FormField label="Note / message Harouna">
              <Input
                value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder="Instructions supplémentaires…"
              />
            </FormField>
          </div>

          {/* Live totals */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Sous-total EUR</span>
              <span className="font-semibold">{fmtNum(fSubtotal)} €</span>
            </div>
            <div className="flex justify-between text-orange-600">
              <span>+ Frais ({form.fraisPct}%)</span>
              <span className="font-semibold">+{fmtNum(fFrais)} €</span>
            </div>
            <div className="flex justify-between text-blue-900 font-bold text-base border-t border-blue-200 pt-2 mt-1">
              <span>Total à envoyer</span>
              <span>{fmtNum(fTotal)} €</span>
            </div>
            <div className="flex justify-between text-blue-600 font-semibold text-xs">
              <span>= Équivalent FCFA</span>
              <span>{fmtNum(fFcfa)} FCFA</span>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleSubmit}
              disabled={form.items.every(it => !it.label.trim())}
              className={`flex-1 py-2.5 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors ${form.status === 'planifié' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {form.status === 'planifié' ? '📅 Planifier l\'envoi' : '✅ Enregistrer le virement'}
            </button>
            <button
              onClick={() => { setShowCreate(false); setEditId(null); setForm(emptyForm()); }}
              className="px-5 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors font-medium"
            >
              Annuler
            </button>
          </div>
        </div>
      </Modal>

      {/* ── WHATSAPP PREVIEW MODAL ─────────────────────────────────────────── */}
      <Modal open={showPreview} onClose={() => setShowPreview(false)} title="Message pour Harouna" size="md">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Modifiez avant d'envoyer — collé directement dans WhatsApp.</p>
            <button
              onClick={polishWithAI}
              disabled={loadingAI}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-all shadow-sm"
            >
              {loadingAI ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {loadingAI ? 'Reformulation…' : 'Améliorer avec l\'IA'}
            </button>
          </div>
          <textarea
            value={previewMsg}
            onChange={e => setPreviewMsg(e.target.value)}
            rows={16}
            className="w-full border border-gray-200 rounded-xl p-4 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-green-500 resize-y bg-gray-50"
          />
          {!harounaPhone && (
            <div className="flex items-center gap-2 text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
              <Phone className="h-4 w-4 flex-shrink-0" />
              Numéro Harouna non configuré. Configure-le en haut de la page d'abord.
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={sendWhatsApp}
              disabled={!harounaPhone}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors"
            >
              <MessageCircle className="h-4 w-4" /> Ouvrir WhatsApp
            </button>
            <button
              onClick={() => { navigator.clipboard?.writeText(previewMsg); }}
              className="px-4 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl font-medium flex items-center gap-2 transition-colors"
            >
              <Copy className="h-4 w-4" /> Copier
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
