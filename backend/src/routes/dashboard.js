import { Router } from 'express';
import { getStats, getPoleHistory } from '../controllers/dashboardController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/stats', authenticate, getStats);
router.get('/pole-history', authenticate, getPoleHistory);

export default router;
