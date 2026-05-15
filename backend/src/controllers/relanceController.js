import { z } from 'zod';
import prisma from '../config/database.js';
import { sendRetardEmail, sendRetardWhatsApp } from '../services/notifications.js';

const relanceSchema = z.object({
  donorId: z.string(),
  date: z.string().optional(),
  result: z.string().min(1),
  note: z.string().optional(),
});

const serialize = (r) => ({
  id: r.id,
  donorId: r.donorId,
  date: new Date(r.date).toISOString().split('T')[0],
  result: r.result,
  note: r.note ?? '',
});

export const listRelances = async (req, res, next) => {
  try {
    const where = req.query.donorId ? { donorId: req.query.donorId } : {};
    const relances = await prisma.relance.findMany({
      where,
      orderBy: { date: 'desc' },
    });
    res.json(relances.map(serialize));
  } catch (err) {
    next(err);
  }
};

export const createRelance = async (req, res, next) => {
  try {
    const data = relanceSchema.parse(req.body);
    const { date, donorId, ...rest } = data;

    const relance = await prisma.relance.create({
      data: { ...rest, donorId, date: date ? new Date(date) : new Date() },
    });

    await prisma.donor.update({
      where: { id: donorId },
      data: {
        lastContactDate: relance.date,
        lastContactResult: relance.result,
      },
    });

    res.status(201).json(serialize(relance));
  } catch (err) {
    next(err);
  }
};

export const notifyDonor = async (req, res, next) => {
  try {
    const donor = await prisma.donor.findUnique({
      where: { id: req.params.id, deletedAt: null },
      include: { pole: true },
    });
    if (!donor) return res.status(404).json({ error: 'Donateur introuvable' });

    const { message } = req.body ?? {};
    const results = { whatsappSent: false, emailSent: false, errors: [] };

    const settled = await Promise.allSettled([
      sendRetardEmail(donor),
      sendRetardWhatsApp(donor, message || null),
    ]);

    if (settled[0].status === 'fulfilled') results.emailSent = true;
    else results.errors.push(`Email: ${settled[0].reason?.message}`);

    if (settled[1].status === 'fulfilled') results.whatsappSent = true;
    else results.errors.push(`WhatsApp: ${settled[1].reason?.message}`);

    const label = [
      results.whatsappSent && 'WhatsApp',
      results.emailSent    && 'Email',
    ].filter(Boolean).join('+') || 'Notification';

    const relance = await prisma.relance.create({
      data: {
        donorId: donor.id,
        date:    new Date(),
        result:  `${label} envoyé`,
        note:    'Envoi manuel depuis le back-office.',
      },
    });

    await prisma.donor.update({
      where: { id: donor.id },
      data:  { lastContactDate: relance.date, lastContactResult: relance.result },
    });

    res.json({ success: true, results, relance: serialize(relance) });
  } catch (err) { next(err); }
};

export const deleteRelance = async (req, res, next) => {
  try {
    const relance = await prisma.relance.findUnique({ where: { id: req.params.id } });
    if (!relance) return res.status(404).json({ error: 'Relance introuvable' });

    await prisma.relance.delete({ where: { id: req.params.id } });

    // Recalcule lastContactDate/Result depuis les relances restantes
    const latest = await prisma.relance.findFirst({
      where: { donorId: relance.donorId },
      orderBy: { date: 'desc' },
    });

    await prisma.donor.update({
      where: { id: relance.donorId },
      data: {
        lastContactDate:   latest?.date   ?? null,
        lastContactResult: latest?.result ?? null,
      },
    });

    res.json({ success: true, donorId: relance.donorId });
  } catch (err) {
    next(err);
  }
};
