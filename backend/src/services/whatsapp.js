/**
 * Service WhatsApp via Baileys (WhatsApp Web reverse-engineered)
 * Session persistée en base (Config table) — survit aux redéploiements.
 * Expose getStatus() et sendMessage() utilisés par notifications.js
 */
import makeWASocket, {
  DisconnectReason,
  initAuthCreds,
  BufferJSON,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import prisma from '../config/database.js';

let sock        = null;
let latestQR    = null;       // base64 data URL du QR courant
let connState   = 'disconnected'; // disconnected | qr | connected | logged_out

// Logger silencieux (Baileys est très verbeux par défaut)
const silentLogger = {
  level: 'silent',
  trace: () => {}, debug: () => {}, info: () => {},
  warn:  () => {}, error: () => {}, fatal: () => {},
  child: () => silentLogger,
};

// ── Auth state persisté en PostgreSQL ─────────────────────────────────────
async function useDBAuthState() {
  const get = async (key) => {
    try {
      const row = await prisma.config.findUnique({ where: { key: `wa:${key}` } });
      return row ? JSON.parse(row.value, BufferJSON.reviver) : null;
    } catch { return null; }
  };

  const set = async (key, value) => {
    const val = JSON.stringify(value, BufferJSON.replacer);
    await prisma.config.upsert({
      where:  { key: `wa:${key}` },
      update: { value: val },
      create: { key: `wa:${key}`, value: val },
    });
  };

  const del = async (key) => {
    try { await prisma.config.delete({ where: { key: `wa:${key}` } }); } catch { /* skip */ }
  };

  const creds = (await get('creds')) ?? initAuthCreds();

  const state = {
    creds,
    keys: {
      get: async (type, ids) => {
        const result = {};
        await Promise.all(ids.map(async (id) => {
          result[id] = await get(`key:${type}:${id}`);
        }));
        return result;
      },
      set: async (data) => {
        await Promise.all(
          Object.entries(data).flatMap(([type, items]) =>
            Object.entries(items).map(([id, val]) =>
              val ? set(`key:${type}:${id}`, val) : del(`key:${type}:${id}`)
            )
          )
        );
      },
    },
  };

  const saveCreds = () => set('creds', state.creds);
  return { state, saveCreds };
}

// ── Connexion ──────────────────────────────────────────────────────────────
export async function connectWhatsApp() {
  try {
    const { state, saveCreds } = await useDBAuthState();

    sock = makeWASocket({
      auth:                state,
      printQRInTerminal:   false,
      logger:              silentLogger,
      browser:             ['Humanit-R', 'Chrome', '120.0.0'],
    });

    sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        latestQR   = await QRCode.toDataURL(qr);
        connState  = 'qr';
        console.log('[whatsapp] QR prêt — rendez-vous sur /api/whatsapp/status pour le scanner');
      }

      if (connection === 'open') {
        connState = 'connected';
        latestQR  = null;
        console.log('[whatsapp] Connecté ✓');
      }

      if (connection === 'close') {
        const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
        if (code === DisconnectReason.loggedOut) {
          connState = 'logged_out';
          console.log('[whatsapp] Déconnecté (logged out) — rescannez le QR');
        } else {
          connState = 'connecting';
          console.log('[whatsapp] Déconnexion — reconnexion dans 5s...');
          setTimeout(connectWhatsApp, 5_000);
        }
      }
    });

    sock.ev.on('creds.update', saveCreds);
  } catch (err) {
    console.error('[whatsapp] Erreur connexion:', err.message);
    setTimeout(connectWhatsApp, 10_000);
  }
}

// ── API publique ───────────────────────────────────────────────────────────
export async function sendWhatsAppMessage(phone, message) {
  if (connState !== 'connected' || !sock) {
    throw new Error(`WhatsApp non connecté (état: ${connState})`);
  }
  const jid = `${phone.replace(/\D/g, '')}@s.whatsapp.net`;
  await sock.sendMessage(jid, { text: message });
}

export function getWhatsAppStatus() {
  return { state: connState, qr: latestQR };
}

export async function logoutWhatsApp() {
  if (sock) await sock.logout().catch(() => {});
  // Nettoyer la session en DB
  await prisma.config.deleteMany({ where: { key: { startsWith: 'wa:' } } });
  connState = 'disconnected';
  latestQR  = null;
  sock      = null;
}
