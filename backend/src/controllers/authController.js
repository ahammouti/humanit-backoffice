import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../config/database.js';
import { signToken } from '../utils/jwt.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const formatUser = (user) => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  role: user.role,
});

export const login = async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

    const token = signToken({ id: user.id, role: user.role });
    res.json({ token, user: formatUser(user) });
  } catch (err) {
    next(err);
  }
};

export const me = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json(formatUser(user));
  } catch (err) {
    next(err);
  }
};
