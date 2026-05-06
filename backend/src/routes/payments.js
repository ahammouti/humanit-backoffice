import { Router } from 'express';
import { listPayments, createPayment, getPayment } from '../controllers/paymentController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/permissions.js';

const router = Router();

router.use(authenticate);

router.get('/', listPayments);
router.post('/', requireRole('tresorier'), createPayment);
router.get('/:id', getPayment);

export default router;
