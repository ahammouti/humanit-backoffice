import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/permissions.js';
import { getWhatsAppStatus, logoutWhatsApp } from '../services/whatsapp.js';

const router = Router();
router.use(authenticate, requireRole('admin'));

router.get('/status', (req, res) => {
  res.json(getWhatsAppStatus());
});

router.post('/logout', async (req, res, next) => {
  try {
    await logoutWhatsApp();
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
