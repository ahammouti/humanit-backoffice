import { z } from 'zod';
import prisma from '../config/database.js';
import { refreshDonorStatus } from '../services/donorStatus.js';

// Prisma enum → display label
const STATUS_OUT = { Paye: 'Payé', Refuse: 'Refusé', En_attente: 'En attente' };
// Display label → Prisma enum
const STATUS_IN  = { 'Payé': 'Paye', 'Refusé': 'Refuse', 'En attente': 'En_attente' };

const paymentSchema = z.object({
  donorId: z.string(),
  poleId: z.string().optional(),
  pole: z.string().optional(),  // accept name as alternative
  amount: z.number().positive(),
  status: z.string(),
  source: z.enum(['helloasso', 'virement', 'manuel']),
  reference: z.string().optional(),
  date: z.string().optional(),
  helloassoId: z.string().optional().nullable(),
});

const serialize = (p) => ({
  id: p.id,
  date: new Date(p.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' +
        new Date(p.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  timestamp: new Date(p.date).getTime(),
  donorId: p.donorId,
  donor: p.donor ? `${p.donor.firstName} ${p.donor.lastName}` : '',
  email: p.donor?.email ?? '',
  pole: typeof p.pole === 'object' ? (p.pole?.name ?? '') : (p.pole ?? ''),
  amount: p.amount,
  status: STATUS_OUT[p.status] ?? p.status,
  source: p.source,
  reference: p.reference ?? '',
});

export const listPayments = async (req, res, next) => {
  try {
    const { donorId, source, status, from, to } = req.query;
    const where = {};
    if (donorId) where.donorId = donorId;
    if (source) where.source = source;
    if (status) where.status = STATUS_IN[status] ?? status;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const { page, limit } = req.query;
    const take = Math.min(parseInt(limit ?? '50', 10), 200);
    const skip = (Math.max(parseInt(page ?? '1', 10), 1) - 1) * take;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({ where, include: { donor: true, pole: true }, orderBy: { date: 'desc' }, skip, take }),
      prisma.payment.count({ where }),
    ]);

    res.json({
      data:  payments.map(serialize),
      total,
      page:  Math.floor(skip / take) + 1,
      pages: Math.ceil(total / take),
      limit: take,
    });
  } catch (err) {
    next(err);
  }
};

export const createPayment = async (req, res, next) => {
  try {
    const data = paymentSchema.parse(req.body);
    const { date, pole, status, ...rest } = data;

    // Resolve poleId from name if needed
    let poleId = rest.poleId;
    if (!poleId && pole) {
      const poleDoc = await prisma.pole.findFirst({ where: { name: pole } });
      poleId = poleDoc?.id;
    }
    if (!poleId) {
      const donor = await prisma.donor.findUnique({ where: { id: rest.donorId } });
      poleId = donor?.poleId;
    }

    const prismaStatus = STATUS_IN[status] ?? status;

    const payment = await prisma.payment.create({
      data: {
        ...rest,
        poleId,
        status: prismaStatus,
        date: date ? new Date(date) : new Date(),
      },
      include: { donor: true, pole: true },
    });

    if (payment.status === 'Paye') {
      await prisma.donor.update({
        where: { id: payment.donorId },
        data: { lastPayment: payment.date },
      });
      await refreshDonorStatus(prisma, payment.donorId);
    }

    res.status(201).json(serialize(payment));
  } catch (err) {
    next(err);
  }
};

export const getPayment = async (req, res, next) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: { donor: true, pole: true },
    });
    if (!payment) return res.status(404).json({ error: 'Paiement introuvable' });
    res.json(serialize(payment));
  } catch (err) {
    next(err);
  }
};
