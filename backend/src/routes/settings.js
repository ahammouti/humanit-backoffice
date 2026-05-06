import { Router } from 'express';
import { getSettings, saveSettings } from '../controllers/settingsController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/permissions.js';

const router = Router();

router.get('/',  authenticate, getSettings);
router.put('/',  authenticate, requireRole('admin'), saveSettings);

export default router;
