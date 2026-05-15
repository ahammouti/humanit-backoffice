/**
 * Routes de développement/test — désactivées en production si NODE_ENV=production
 * Permettent de tester les notifications sans toucher aux vraies données.
 */
import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/permissions.js';
import { sendRetardEmail, sendRetardWhatsApp } from '../services/notifications.js';
import { getWhatsAppStatus } from '../services/whatsapp.js';

const router = Router();
router.use(authenticate, requireRole('admin'));

// Envoie une notification test au numéro/email de test configuré dans .env
router.post('/test-notify', async (req, res, next) => {
  try {
    const { getConfig } = await import('../controllers/settingsController.js');
    const [testPhone, testEmail, notifEnabled] = await Promise.all([
      getConfig('notif_test_phone'),
      getConfig('notif_test_email'),
      getConfig('notif_enabled'),
    ]);

    const { state: waState } = getWhatsAppStatus();
    const hasSMTP = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
    const phone   = (testPhone || process.env.NOTIFY_TEST_PHONE || '').replace(/\D/g, '');
    const email   = testEmail  || process.env.NOTIFY_TEST_EMAIL  || '';

    const fakeDonor = {
      firstName: 'Ali', lastName: 'Test',
      email:  email  || 'ali.test@humanit-r.org',
      phone:  phone  || '',
      amount: 20, pole: 'Test',
    };

    const results = { notifEnabled, waState, hasSMTP, phone, email, whatsappSent: false, emailSent: false, errors: [] };

    // Bypass notif_enabled pour le test — envoie toujours
    const settled = await Promise.allSettled([
      sendRetardEmail(fakeDonor),
      sendRetardWhatsApp(fakeDonor),
    ]);

    if (settled[0].status === 'fulfilled') results.emailSent = true;
    else results.errors.push(`Email: ${settled[0].reason?.message}`);

    if (settled[1].status === 'fulfilled') results.whatsappSent = true;
    else results.errors.push(`WhatsApp: ${settled[1].reason?.message}`);

    res.json({ success: true, results });
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
