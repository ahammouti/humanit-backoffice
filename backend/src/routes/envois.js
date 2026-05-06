import { Router } from 'express';
import { listEnvois, createEnvoi, updateEnvoi, syncRemitly } from '../controllers/envoiController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/permissions.js';

const router = Router();

router.use(authenticate);

router.get('/remitly/sync', requireRole('admin'), syncRemitly);
router.get('/', listEnvois);
router.post('/', requireRole('tresorier'), createEnvoi);
router.put('/:id', requireRole('tresorier'), updateEnvoi);

export default router;
