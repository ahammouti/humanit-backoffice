import { Router } from 'express';
import { listActivity, createActivity } from '../controllers/activityController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/permissions.js';

const router = Router();

router.use(authenticate);

router.get('/', requireRole('tresorier'), listActivity);
router.post('/', createActivity);

export default router;
