import { z } from 'zod';
import prisma from '../config/database.js';

const memberSchema = z.object({
  firstName: z.string().min(1),
  lastName:  z.string().min(1),
  email:     z.string().email(),
  phone:     z.string().optional().default(''),
  type:      z.enum(['actif', 'bienfaiteur', 'honneur']).default('actif'),
  year:      z.number().int().optional(),
  paid:      z.boolean().default(false),
  joinDate:  z.string().optional(),
  notes:     z.string().optional().default(''),
});

const serialize = (m) => ({
  id:        m.id,
  firstName: m.firstName,
  lastName:  m.lastName,
  email:     m.email,
  phone:     m.phone ?? '',
  type:      m.type,
  year:      m.year,
  paid:      m.paid,
  joinDate:  m.joinDate.toISOString().split('T')[0],
  notes:     m.notes ?? '',
  createdAt: m.createdAt.toISOString(),
});

export const listMembers = async (req, res, next) => {
  try {
    const members = await prisma.member.findMany({ orderBy: { lastName: 'asc' } });
    res.json(members.map(serialize));
  } catch (err) { next(err); }
};

export const createMember = async (req, res, next) => {
  try {
    const data = memberSchema.parse(req.body);
    const member = await prisma.member.create({
      data: {
        ...data,
        year:     data.year ?? new Date().getFullYear(),
        joinDate: data.joinDate ? new Date(data.joinDate) : new Date(),
      },
    });
    res.status(201).json(serialize(member));
  } catch (err) { next(err); }
};

export const updateMember = async (req, res, next) => {
  try {
    const data = memberSchema.partial().parse(req.body);
    const member = await prisma.member.update({
      where: { id: req.params.id },
      data: {
        ...data,
        ...(data.joinDate ? { joinDate: new Date(data.joinDate) } : {}),
      },
    });
    res.json(serialize(member));
  } catch (err) { next(err); }
};

export const deleteMember = async (req, res, next) => {
  try {
    await prisma.member.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
};
