import { z } from 'zod';
import prisma from '../config/database.js';
import { getTransfers } from '../services/remitly.js';

const STATUS_OUT = { planifie: 'planifié', envoye: 'envoyé', en_cours: 'en_cours' };
const STATUS_IN  = { 'planifié': 'planifie', 'envoyé': 'envoye', 'en_cours': 'en_cours' };

const itemSchema = z.object({
  emoji: z.string().optional(),
  label: z.string().min(1),
  eur: z.number(),
  fcfa: z.number(),
});

const envoiSchema = z.object({
  date: z.string().optional(),
  method: z.string().min(1),
  destination: z.string().min(1),
  status: z.string().optional(),
  reference: z.string().optional().nullable(),
  fraisPct: z.number().optional().nullable(),
  exchangeRate: z.number().optional().nullable(),
  note: z.string().optional().nullable(),
  remitlyId: z.string().optional().nullable(),
  items: z.array(itemSchema).optional(),
});

const serialize = (e) => ({
  ...e,
  date: new Date(e.date).toISOString().split('T')[0],
  status: STATUS_OUT[e.status] ?? e.status,
  createdAt: e.createdAt instanceof Date ? e.createdAt.toISOString() : e.createdAt,
  updatedAt: e.updatedAt instanceof Date ? e.updatedAt.toISOString() : e.updatedAt,
});

export const listEnvois = async (req, res, next) => {
  try {
    const envois = await prisma.envoi.findMany({
      include: { items: true },
      orderBy: { date: 'desc' },
    });
    res.json(envois.map(serialize));
  } catch (err) {
    next(err);
  }
};

export const createEnvoi = async (req, res, next) => {
  try {
    const { date, items = [], status, ...rest } = envoiSchema.parse(req.body);

    const envoi = await prisma.envoi.create({
      data: {
        ...rest,
        status: STATUS_IN[status] ?? status ?? 'planifie',
        date: date ? new Date(date) : new Date(),
        items: { create: items },
      },
      include: { items: true },
    });
    res.status(201).json(serialize(envoi));
  } catch (err) {
    next(err);
  }
};

export const updateEnvoi = async (req, res, next) => {
  try {
    const { items, date, status, ...rest } = envoiSchema.partial().parse(req.body);

    const updateData = { ...rest };
    if (date) updateData.date = new Date(date);
    if (status) updateData.status = STATUS_IN[status] ?? status;

    if (items !== undefined) {
      await prisma.envoiItem.deleteMany({ where: { envoiId: req.params.id } });
      updateData.items = { create: items };
    }

    const envoi = await prisma.envoi.update({
      where: { id: req.params.id },
      data: updateData,
      include: { items: true },
    });
    res.json(serialize(envoi));
  } catch (err) {
    next(err);
  }
};

export const syncRemitly = async (req, res, next) => {
  try {
    const transfers = await getTransfers();
    let imported = 0;

    for (const t of transfers) {
      const exists = await prisma.envoi.findUnique({ where: { remitlyId: t.id } });
      if (exists) continue;

      await prisma.envoi.create({
        data: {
          remitlyId: t.id,
          date: new Date(t.date),
          method: 'remitly',
          destination: t.recipient ?? 'Inconnu',
          status: t.remitlyStatus === 'DELIVERED' ? 'envoye' : 'en_cours',
          reference: t.reference ?? null,
          fraisPct: t.feesEur && t.amountSentEur
            ? parseFloat(((t.feesEur / t.amountSentEur) * 100).toFixed(2))
            : null,
          exchangeRate: t.exchangeRate ?? null,
          items: {
            create: [{
              label: `Envoi Remitly — ${t.recipient ?? ''}`,
              eur: t.amountSentEur ?? 0,
              fcfa: t.amountReceivedFcfa ?? 0,
            }],
          },
        },
      });
      imported++;
    }

    res.json({ imported, total: transfers.length });
  } catch (err) {
    next(err);
  }
};
