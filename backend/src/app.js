import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.js';
import donorRoutes from './routes/donors.js';
import paymentRoutes from './routes/payments.js';
import relanceRoutes from './routes/relances.js';
import envoiRoutes from './routes/envois.js';
import poleRoutes from './routes/poles.js';
import activityRoutes from './routes/activity.js';
import dashboardRoutes from './routes/dashboard.js';
import webhookRoutes from './routes/webhooks.js';
import helloassoRoutes from './routes/helloasso.js';
import settingsRoutes from './routes/settings.js';

const app = express();

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(morgan('dev'));

// Raw body needed for webhook signature verification — must be before express.json()
app.use('/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/relances', relanceRoutes);
app.use('/api/envois', envoiRoutes);
app.use('/api/poles', poleRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/helloasso', helloassoRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

export default app;
