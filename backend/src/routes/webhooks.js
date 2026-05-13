import { Router } from 'express';
import prisma from '../config/database.js';
import { verifyWebhookSignature } from '../services/helloasso.js';
import { refreshDonorStatus } from '../services/donorStatus.js';
import logger from '../utils/logger.js';

const router = Router();

async function findOrCreatePoleByName(formName) {
  if (!formName) return null;
  let pole = await prisma.pole.findFirst({ where: { name: formName } });
  if (!pole) pole = await prisma.pole.create({ data: { name: formName } });
  return pole;
}

router.post('/helloasso', async (req, res) => {
  // Répondre 200 immédiatement — HelloAsso retente si pas de réponse rapide
  res.json({ status: 'received' });

  const signature = req.headers['x-helloasso-signature'] ?? '';
  const rawBody = req.body;

  // rawBody peut être un Buffer (express.raw) ou un objet déjà parsé (proxy JSON)
  let event;
  if (rawBody && typeof rawBody === 'object' && !Buffer.isBuffer(rawBody)) {
    // Déjà parsé (proxy ou middleware upstream)
    event = rawBody;
  } else {
    if (rawBody && !verifyWebhookSignature(rawBody, signature)) {
      logger.warn('[Webhook] Signature HelloAsso invalide — ignoré');
      return;
    }
    try {
      event = JSON.parse(rawBody ? rawBody.toString() : '{}');
    } catch {
      logger.warn('[Webhook] Body non-JSON ignoré');
      return;
    }
  }

  logger.info(`[Webhook] HelloAsso event: ${event.eventType}`);

  try {
    if (event.eventType === 'Payment') {
      const p = event.data;
      if (!p || p.state !== 'Authorized') return;

      const helloassoId = String(p.id);
      const exists = await prisma.payment.findUnique({ where: { helloassoId } });
      if (exists) { logger.info('[Webhook] Paiement déjà en base, ignoré'); return; }

      const email = p.payer?.email;
      if (!email) { logger.warn('[Webhook] Paiement sans email payer, ignoré'); return; }

      const amount = typeof p.amount === 'number' ? p.amount / 100 : 0;
      const formName = (p.order?.formName ?? p.order?.formSlug ?? '').trim();
      const formType = p.order?.formType ?? null;

      const pole = await findOrCreatePoleByName(formName);
      if (!pole) { logger.warn('[Webhook] Impossible de résoudre le pôle'); return; }

      // Trouver ou créer le donateur (clé unique email+poleId)
      let donor = await prisma.donor.findUnique({
        where: { email_poleId: { email, poleId: pole.id } },
      });

      if (!donor) {
        donor = await prisma.donor.create({
          data: {
            firstName: p.payer.firstName ?? 'Inconnu',
            lastName:  p.payer.lastName  ?? 'Inconnu',
            email,
            poleId: pole.id,
            amount,
            startDate: new Date(p.date),
            paymentMethod: 'helloasso',
            status: 'ACTIF',
            delayMonths: 0,
            helloassoOrderId: String(p.order?.id ?? ''),
          },
        });
        logger.info(`[Webhook] Nouveau donateur créé: ${donor.email} (${pole.name})`);
      }

      const payment = await prisma.payment.create({
        data: {
          donorId: donor.id,
          poleId:  donor.poleId,
          amount,
          status: 'Paye',
          source: 'helloasso',
          helloassoId,
          formType,
          date: new Date(p.date),
        },
      });

      // Mettre à jour lastPayment si plus récent
      const current = await prisma.donor.findUnique({ where: { id: donor.id }, select: { lastPayment: true } });
      if (!current.lastPayment || payment.date > current.lastPayment) {
        await prisma.donor.update({ where: { id: donor.id }, data: { lastPayment: payment.date } });
      }

      await refreshDonorStatus(prisma, donor.id);
      logger.info(`[Webhook] ✅ Paiement ${helloassoId} enregistré — ${donor.firstName} ${donor.lastName} ${amount}€ (${pole.name})`);

    } else if (event.eventType === 'Order') {
      // Un order peut contenir plusieurs paiements — pas de traitement supplémentaire nécessaire
      logger.info(`[Webhook] Order event ignoré (les paiements individuels sont traités via Payment)`);
    } else {
      logger.info(`[Webhook] Event type "${event.eventType}" non géré`);
    }
  } catch (err) {
    logger.error('[Webhook] Erreur traitement:', err.message);
  }
});

export default router;
