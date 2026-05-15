import { z } from 'zod';
import prisma from '../config/database.js';
import { computeStatus } from '../services/donorStatus.js';

const donorSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  poleId: z.string().optional(),
  pole: z.string().optional(),   // accept name as alternative to poleId
  amount: z.number().positive(),
  startDate: z.string().min(1, "Date d'adhésion requise"),
  lastPayment: z.string().optional().nullable(),
  status: z.enum(['ACTIF', 'RETARD', 'ARRETE']).optional(),
  paymentMethod: z.enum(['helloasso', 'virement']),
  notes: z.string().optional(),
  lastContactDate: z.string().optional().nullable(),
  lastContactResult: z.string().optional().nullable(),
  helloassoMemberId: z.string().optional().nullable(),
});

const toDateStr = (v) => v instanceof Date ? v.toISOString().split('T')[0] : (v ? String(v).split('T')[0] : null);

const serialize = (d) => ({
  ...d,
  pole: typeof d.pole === 'object' ? (d.pole?.name ?? '') : d.pole,
  startDate: toDateStr(d.startDate),
  lastPayment: toDateStr(d.lastPayment),
  lastContactDate: toDateStr(d.lastContactDate),
  createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt,
  updatedAt: d.updatedAt instanceof Date ? d.updatedAt.toISOString() : d.updatedAt,
});

async function resolvePoleId(poleId, poleName) {
  if (poleId) return poleId;
  if (poleName) {
    const p = await prisma.pole.findFirst({ where: { name: poleName } });
    if (p) return p.id;
  }
  return null;
}

export const listDonors = async (req, res, next) => {
  try {
    const { pole, status, search, frequency, page, limit, minDelay, sortBy, sortOrder } = req.query;
    const poleCondition = { helloassoState: 'Public' };
    if (pole) poleCondition.name = pole;
    const where = { pole: poleCondition, deletedAt: null };
    if (status)    where.status = status;
    if (frequency) where.paymentFrequency = frequency;
    if (minDelay)  where.delayMonths = { gte: parseInt(minDelay, 10) };
    if (search) {
      const s = search;
      where.OR = [
        { firstName:         { contains: s, mode: 'insensitive' } },
        { lastName:          { contains: s, mode: 'insensitive' } },
        { email:             { contains: s, mode: 'insensitive' } },
        { helloassoOrderId:  { contains: s, mode: 'insensitive' } },
        { helloassoMemberId: { contains: s, mode: 'insensitive' } },
      ];
    }

    const take = Math.min(parseInt(limit ?? '50', 10), 200);
    const skip = (Math.max(parseInt(page ?? '1', 10), 1) - 1) * take;

    const SORTABLE = { lastPayment: true, amount: true, lastName: true, createdAt: true };
    const col  = SORTABLE[sortBy] ? sortBy : 'createdAt';
    const dir  = sortOrder === 'asc' ? 'asc' : 'desc';
    const orderBy = col === 'lastPayment'
      ? { lastPayment: { sort: dir, nulls: 'last' } }
      : { [col]: dir };

    const [donors, total] = await Promise.all([
      prisma.donor.findMany({ where, include: { pole: true }, orderBy, skip, take }),
      prisma.donor.count({ where }),
    ]);

    res.json({
      data:  donors.map(serialize),
      total,
      page:  Math.floor(skip / take) + 1,
      pages: Math.ceil(total / take),
      limit: take,
    });
  } catch (err) {
    next(err);
  }
};

export const getDonor = async (req, res, next) => {
  try {
    const donor = await prisma.donor.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: { pole: true },
    });
    if (!donor) return res.status(404).json({ error: 'Donateur introuvable' });
    res.json(serialize(donor));
  } catch (err) {
    next(err);
  }
};

export const createDonor = async (req, res, next) => {
  try {
    const data = donorSchema.parse(req.body);
    const { poleId: rawPoleId, pole: poleName, startDate, lastPayment, lastContactDate, status, ...rest } = data;

    const poleId = await resolvePoleId(rawPoleId, poleName);
    if (!poleId) return res.status(400).json({ error: 'Pôle introuvable' });

    const donor = await prisma.donor.create({
      data: {
        ...rest,
        poleId,
        startDate: new Date(startDate),
        lastPayment: lastPayment ? new Date(lastPayment) : null,
        lastContactDate: lastContactDate ? new Date(lastContactDate) : null,
        status: status ?? 'ACTIF',
        delayMonths: 0,
      },
      include: { pole: true },
    });

    const { status: newStatus, delayMonths } = computeStatus(donor);
    const updated = await prisma.donor.update({
      where: { id: donor.id },
      data: { status: newStatus, delayMonths },
      include: { pole: true },
    });

    res.status(201).json(serialize(updated));
  } catch (err) {
    next(err);
  }
};

export const updateDonor = async (req, res, next) => {
  try {
    const data = donorSchema.partial().parse(req.body);
    const { poleId: rawPoleId, pole: poleName, startDate, lastPayment, lastContactDate, ...rest } = data;

    const oldDonor = await prisma.donor.findUnique({ where: { id: req.params.id }, include: { pole: true } });
    const oldStatus = oldDonor?.status;

    const updateData = { ...rest };
    if (rawPoleId || poleName) {
      const resolvedId = await resolvePoleId(rawPoleId, poleName);
      if (resolvedId) updateData.poleId = resolvedId;
    }
    if (startDate) updateData.startDate = new Date(startDate);
    if (lastPayment !== undefined) updateData.lastPayment = lastPayment ? new Date(lastPayment) : null;
    if (lastContactDate !== undefined) updateData.lastContactDate = lastContactDate ? new Date(lastContactDate) : null;

    const donor = await prisma.donor.update({
      where: { id: req.params.id },
      data: updateData,
      include: { pole: true },
    });

    // Propager le téléphone à toutes les fiches du même donateur (même email OU même nom)
    if (updateData.phone !== undefined && oldDonor) {
      await prisma.donor.updateMany({
        where: {
          id: { not: req.params.id },
          deletedAt: null,
          OR: [
            { email: oldDonor.email },
            { firstName: oldDonor.firstName, lastName: oldDonor.lastName },
          ],
        },
        data: { phone: updateData.phone },
      });
    }

    const { status, delayMonths } = computeStatus(donor);
    const updated = await prisma.donor.update({
      where: { id: donor.id },
      data: { status, delayMonths },
      include: { pole: true },
    });

    res.json(serialize(updated));

    if (status === 'RETARD' && oldStatus !== 'RETARD') {
      const { sendRetardNotification } = await import('../services/notifications.js');
      sendRetardNotification(updated).catch(err => console.error('[notif]', err.message));
    }
  } catch (err) {
    next(err);
  }
};

export const deleteDonor = async (req, res, next) => {
  try {
    await prisma.donor.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

export const restoreDonor = async (req, res, next) => {
  try {
    const donor = await prisma.donor.update({
      where: { id: req.params.id },
      data: { deletedAt: null },
      include: { pole: true },
    });
    res.json(serialize(donor));
  } catch (err) {
    next(err);
  }
};

export const purgeDonor = async (req, res, next) => {
  try {
    const id = req.params.id;
    await prisma.$transaction([
      prisma.relance.deleteMany({ where: { donorId: id } }),
      prisma.payment.deleteMany({ where: { donorId: id } }),
      prisma.donor.delete({ where: { id } }),
    ]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

export const listTrashed = async (req, res, next) => {
  try {
    const donors = await prisma.donor.findMany({
      where: { deletedAt: { not: null } },
      include: { pole: true },
      orderBy: { deletedAt: 'desc' },
    });
    res.json(donors.map(serialize));
  } catch (err) {
    next(err);
  }
};

export const rgpdExport = async (req, res, next) => {
  try {
    const donor = await prisma.donor.findUnique({
      where: { id: req.params.id },
      include: { payments: true, relances: true, pole: true },
    });
    if (!donor) return res.status(404).json({ error: 'Donateur introuvable' });

    res.setHeader('Content-Disposition', `attachment; filename="rgpd_${donor.id}.json"`);
    res.json({
      exportDate: new Date().toISOString(),
      donor: serialize(donor),
      payments: donor.payments,
      relances: donor.relances,
    });
  } catch (err) {
    next(err);
  }
};

export const rgpdDelete = async (req, res, next) => {
  try {
    const id = req.params.id;
    await prisma.$transaction([
      prisma.relance.deleteMany({ where: { donorId: id } }),
      prisma.payment.deleteMany({ where: { donorId: id } }),
      prisma.donor.delete({ where: { id } }),
    ]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
