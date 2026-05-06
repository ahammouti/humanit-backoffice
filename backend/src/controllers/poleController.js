import { z } from 'zod';
import prisma from '../config/database.js';

const poleSchema = z.object({ name: z.string().min(1) });

export const listPoles = async (req, res, next) => {
  try {
    const poles = await prisma.pole.findMany({ orderBy: { name: 'asc' } });
    res.json(poles);
  } catch (err) {
    next(err);
  }
};

export const createPole = async (req, res, next) => {
  try {
    const { name } = poleSchema.parse(req.body);
    const pole = await prisma.pole.create({ data: { name } });
    res.status(201).json(pole);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Ce pôle existe déjà' });
    next(err);
  }
};

export const deletePole = async (req, res, next) => {
  try {
    const count = await prisma.donor.count({ where: { poleId: req.params.id } });
    if (count > 0) {
      return res.status(409).json({ error: `Ce pôle est utilisé par ${count} donateur(s)` });
    }
    await prisma.pole.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
