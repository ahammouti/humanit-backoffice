import axios from 'axios';
import crypto from 'crypto';
import { env } from '../config/env.js';
import logger from '../utils/logger.js';

const BASE = 'https://api.helloasso.com';
let _token = null;
let _tokenExpiry = 0;

async function getToken() {
  if (_token && Date.now() < _tokenExpiry) return _token;

  const { data } = await axios.post(
    `${BASE}/oauth2/token`,
    new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: env.helloasso.clientId,
      client_secret: env.helloasso.clientSecret,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  _token = data.access_token;
  _tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  logger.info('[HelloAsso] Token OAuth2 obtenu');
  return _token;
}

async function fetchAllPages(url, headers, params = {}) {
  const results = [];
  const pageSize = 100;
  let page = 1;

  while (true) {
    const { data } = await axios.get(url, {
      headers,
      params: { ...params, pageSize, pageIndex: page },
    });
    const items = data.data ?? [];
    results.push(...items);

    const totalCount = data.pagination?.totalCount;
    const totalPages = data.pagination?.totalPages;
    logger.info(`[HelloAsso] page ${page} — ${results.length} récupérés (totalCount=${totalCount}, totalPages=${totalPages})`);

    // Arrêt si : page vide, ou totalCount atteint (si connu et positif),
    // ou totalPages atteint (si connu et positif), ou page incomplète (dernière page)
    if (items.length === 0) break;
    if (totalCount > 0 && results.length >= totalCount) break;
    if (totalPages > 0 && page >= totalPages) break;
    if (items.length < pageSize) break;

    page++;
  }
  return results;
}

export async function getForms() {
  if (!env.helloasso.enabled) return [];

  const token = await getToken();
  const { data } = await axios.get(
    `${BASE}/v5/organizations/${env.helloasso.orgSlug}/forms`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const forms = data.data ?? [];
  logger.info(`[HelloAsso] ${forms.length} formulaire(s) récupéré(s)`);
  return forms;
}

export async function getPayments(from, to) {
  if (!env.helloasso.enabled) {
    logger.warn('[HelloAsso] Mode mock — credentials absents');
    return [];
  }

  const token = await getToken();
  // Par défaut : tout l'historique depuis 2020 pour ne rien rater
  const params = {
    from: from ?? '2020-01-01T00:00:00.000Z',
  };
  if (to) params.to = to;

  let payments = [];
  try {
    payments = await fetchAllPages(
      `${BASE}/v5/organizations/${env.helloasso.orgSlug}/payments`,
      { Authorization: `Bearer ${token}` },
      params
    );
  } catch (err) {
    if (err.response?.status === 404) {
      logger.warn('[HelloAsso] Endpoint /payments non disponible (404) — ignoré');
      return [];
    }
    throw err;
  }

  logger.info(`[HelloAsso] ${payments.length} paiement(s) récupéré(s)`);
  return payments;
}

export async function getMembers() {
  if (!env.helloasso.enabled) {
    logger.warn('[HelloAsso] Mode mock — credentials absents');
    return [];
  }

  const token = await getToken();
  try {
    const members = await fetchAllPages(
      `${BASE}/v5/organizations/${env.helloasso.orgSlug}/members`,
      { Authorization: `Bearer ${token}` },
      { from: '2020-01-01T00:00:00.000Z' }
    );
    logger.info(`[HelloAsso] ${members.length} membre(s) récupéré(s)`);
    return members;
  } catch (err) {
    if (err.response?.status === 404) {
      logger.warn('[HelloAsso] Endpoint /members non disponible pour cette organisation (404) — ignoré');
      return [];
    }
    throw err;
  }
}

export function verifyWebhookSignature(rawBody, signature) {
  if (!env.helloasso.webhookSecret) return true;
  const expected = crypto
    .createHmac('sha256', env.helloasso.webhookSecret)
    .update(rawBody)
    .digest('hex');
  return signature === expected;
}
