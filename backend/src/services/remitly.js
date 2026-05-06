import axios from 'axios';
import { env } from '../config/env.js';
import logger from '../utils/logger.js';

const BASE = 'https://api.remitly.io/v1';

const MOCK_TRANSFERS = [
  {
    id: 'REM_MOCK_001',
    reference: 'REM2024-001',
    date: '2024-08-15',
    amountSentEur: 500,
    amountReceivedFcfa: 328000,
    exchangeRate: 656,
    feesEur: 3.99,
    recipient: 'Harouna Diallo',
    remitlyStatus: 'DELIVERED',
  },
  {
    id: 'REM_MOCK_002',
    reference: 'REM2024-002',
    date: '2024-07-20',
    amountSentEur: 750,
    amountReceivedFcfa: 492000,
    exchangeRate: 656,
    feesEur: 4.99,
    recipient: 'Harouna Diallo',
    remitlyStatus: 'DELIVERED',
  },
  {
    id: 'REM_MOCK_003',
    reference: 'REM2024-003',
    date: '2024-06-10',
    amountSentEur: 300,
    amountReceivedFcfa: 196800,
    exchangeRate: 656,
    feesEur: 2.99,
    recipient: 'Harouna Diallo',
    remitlyStatus: 'DELIVERED',
  },
];

export async function getTransfers(limit = 50) {
  if (!env.remitly.enabled) {
    logger.warn('[Remitly] Mode mock — aucune API key configurée');
    return MOCK_TRANSFERS;
  }

  const { data } = await axios.get(`${BASE}/transfers`, {
    headers: { Authorization: `Bearer ${env.remitly.apiKey}` },
    params: { limit },
  });

  return (data.transfers ?? data.data ?? []).map((t) => ({
    id: t.id,
    reference: t.reference ?? t.id,
    date: t.created_at ?? t.date,
    amountSentEur: t.send_amount ?? t.amountSentEur,
    amountReceivedFcfa: t.receive_amount ?? t.amountReceivedFcfa,
    exchangeRate: t.exchange_rate ?? t.exchangeRate,
    feesEur: t.fee ?? t.feesEur,
    recipient: t.recipient?.name ?? t.recipient,
    remitlyStatus: t.status ?? t.remitlyStatus,
  }));
}
