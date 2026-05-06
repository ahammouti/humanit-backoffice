import { Router } from 'express';
import { listPoles, createPole, deletePole } from '../controllers/poleController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/permissions.js';

const router = Router();

router.use(authenticate);

router.get('/', listPoles);
router.post('/', requireRole('admin'), createPole);
router.delete('/:id', requireRole('admin'), deletePole);

export default router;
