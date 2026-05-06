import { Router } from 'express';
import prisma from '../config/database.js';
import { verifyWebhookSignature } from '../services/helloasso.js';
import { refreshDonorStatus } from '../services/donorStatus.js';
import logger from '../utils/logger.js';

const router = Router();

router.post('/helloasso', async (req, res) => {
  const signature = req.headers['x-helloasso-signature'] ?? '';
  const rawBody = req.body;

  if (!verifyWebhookSignature(rawBody, signature)) {
    logger.warn('[Webhook] Signature HelloAsso invalide');
    return res.status(401).json({ error: 'Signature invalide' });
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString());
  } catch {
    return res.status(400).json({ error: 'Body invalide' });
  }

  logger.info(`[Webhook] HelloAsso event: ${event.eventType}`);

  try {
    if (event.eventType === 'Payment' && event.data?.state === 'Authorized') {
      const p = event.data;
      const helloassoId = String(p.id);

      // Skip duplicates
      const exists = await prisma.payment.findUnique({ where: { helloassoId } });
      if (exists) return res.json({ status: 'duplicate' });

      // Try to match donor by email
      const donor = p.payer?.email
        ? await prisma.donor.findUnique({ where: { email: p.payer.email } })
        : null;

      if (!donor) {
        logger.warn(`[Webhook] Donateur introuvable pour email: ${p.payer?.email}`);
        return res.json({ status: 'donor_not_found' });
      }

      const payment = await prisma.payment.create({
        data: {
          donorId: donor.id,
          poleId: donor.poleId,
          amount: p.amount / 100,
          status: 'Paye',
          source: 'helloasso',
          helloassoId,
          date: new Date(p.date),
        },
      });

      await prisma.donor.update({
        where: { id: donor.id },
        data: { lastPayment: payment.date },
      });
      await refreshDonorStatus(prisma, donor.id);

      logger.info(`[Webhook] Paiement créé: ${payment.id} pour ${donor.email}`);
    }
  } catch (err) {
    logger.error('[Webhook] Erreur traitement:', err);
    return res.status(500).json({ error: 'Erreur traitement' });
  }

  res.json({ status: 'ok' });
});

export default router;
