import { Router } from 'express';
import { listRelances, createRelance, deleteRelance } from '../controllers/relanceController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/permissions.js';

const router = Router();

router.use(authenticate);

router.get('/', listRelances);
router.post('/',    requireRole('tresorier'), createRelance);
router.delete('/:id', requireRole('tresorier'), deleteRelance);

export default router;
