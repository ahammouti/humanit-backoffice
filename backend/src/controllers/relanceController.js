import { z } from 'zod';
import prisma from '../config/database.js';

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
