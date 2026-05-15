import 'dotenv/config';
import app from './app.js';
import { env } from './config/env.js';
import logger from './utils/logger.js';
import prisma from './config/database.js';
import { connectWhatsApp } from './services/whatsapp.js';

const start = async () => {
  try {
    await prisma.$connect();
    logger.info('PostgreSQL connecté');

    app.listen(env.port, () => {
      logger.info(`API démarrée sur http://localhost:${env.port}`);
      if (!env.helloasso.enabled) logger.warn('HelloAsso: mode mock (HELLOASSO_CLIENT_ID absent)');
      if (!env.remitly.enabled) logger.warn('Remitly: mode mock (REMITLY_API_KEY absent)');
    });

    // WhatsApp — démarre en arrière-plan (n'empêche pas le boot)
    connectWhatsApp().catch(err => logger.warn('WhatsApp init:', err.message));
  } catch (err) {
    logger.error('Impossible de démarrer:', err);
    process.exit(1);
  }
};

start();
