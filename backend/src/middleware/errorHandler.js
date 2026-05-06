import { ZodError } from 'zod';
import logger from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Données invalides',
      details: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
    });
  }

  logger.error(err);

  // Ne pas propager les status codes d'APIs externes (axios)
  const isAxiosError = err.isAxiosError || err.name === 'AxiosError';
  const status = isAxiosError ? 502 : (err.status ?? err.statusCode ?? 500);
  const message = isAxiosError
    ? `Erreur API externe (${err.response?.status ?? 'réseau'}): ${err.message}`
    : (err.message ?? 'Erreur serveur');
  res.status(status).json({ error: message });
};
