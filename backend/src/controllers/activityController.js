import { z } from 'zod';
import prisma from '../config/database.js';

const createSchema = z.object({
  action: z.string().min(1),
  subject: z.string().min(1),
  details: z.string().optional(),
});

const serialize = (l) => ({
  id: l.id,
  timestamp: l.timestamp.toISOString(),
  userName: l.user ? `${l.user.firstName} ${l.user.lastName}` : 'Système',
  userRole: l.user?.role ?? 'system',
  action: l.action,
  subject: l.subject,
  details: l.details ?? '',
});

export const listActivity = async (req, res, next) => {
  try {
    const { action, userId, from, to, limit = '100' } = req.query;
    const where = {};
    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp.gte = new Date(from);
      if (to) where.timestamp.lte = new Date(to);
    }

    const logs = await prisma.activityLog.findMany({
      where,
      include: { user: { select: { firstName: true, lastName: true, role: true } } },
      orderBy: { timestamp: 'desc' },
      take: Math.min(parseInt(limit, 10), 500),
    });
    res.json(logs.map(serialize));
  } catch (err) {
    next(err);
  }
};

export const createActivity = async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const log = await prisma.activityLog.create({
      data: { ...data, userId: req.user.id },
      include: { user: { select: { firstName: true, lastName: true, role: true } } },
    });
    res.status(201).json(serialize(log));
  } catch (err) {
    next(err);
  }
};
