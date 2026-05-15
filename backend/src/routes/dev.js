/**
 * Routes de développement/test — désactivées en production si NODE_ENV=production
 * Permettent de tester les notifications sans toucher aux vraies données.
 */
import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/permissions.js';
import { sendRetardNotification } from '../services/notifications.js';

const router = Router();
router.use(authenticate, requireRole('admin'));

// Envoie une notification test au numéro/email de test configuré dans .env
router.post('/test-notify', async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const fakeDonor = {
      firstName: body.firstName ?? 'Ali',
      lastName:  body.lastName  ?? 'Test',
      email:     body.email     ?? process.env.NOTIFY_TEST_EMAIL ?? 'test@humanit-r.org',
      phone:     body.phone     ?? process.env.NOTIFY_TEST_PHONE ?? '',
      amount:    body.amount    ?? 20,
      pole:      body.pole      ?? 'Test',
    };
    await sendRetardNotification(fakeDonor);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// Crée le donateur test Ali (idempotent — ne recrée pas s'il existe)
router.post('/create-test-donor', async (req, res, next) => {
  try {
    const existing = await prisma.donor.findFirst({
      where: { firstName: 'Ali', lastName: 'Test', deletedAt: null },
    });
    if (existing) return res.json({ existing: true, donor: existing });

    // Prend le premier pôle disponible
    const pole = await prisma.pole.findFirst();
    if (!pole) return res.status(400).json({ error: 'Aucun pôle disponible. Créez-en un d\'abord.' });

    // lastPayment = 3 mois ago → status RETARD immédiat
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const donor = await prisma.donor.create({
      data: {
        firstName:       'Ali',
        lastName:        'Test',
        email:           process.env.NOTIFY_TEST_EMAIL ?? 'ali.test@humanit-r.org',
        phone:           process.env.NOTIFY_TEST_PHONE ?? '',
        poleId:          pole.id,
        amount:          20,
        startDate:       threeMonthsAgo,
        lastPayment:     threeMonthsAgo,
        status:          'RETARD',
        delayMonths:     2,
        paymentMethod:   'virement',
        paymentFrequency:'mensuel',
        notes:           'Donateur test — créé automatiquement',
      },
      include: { pole: true },
    });
    res.status(201).json({ created: true, donor });
  } catch (err) { next(err); }
});

export default router;
