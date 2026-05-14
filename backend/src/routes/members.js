import { Router } from 'express';
import { listMembers, createMember, updateMember, deleteMember } from '../controllers/memberController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/permissions.js';

const router = Router();
router.use(authenticate);

router.get('/',     listMembers);
router.post('/',    requireRole('tresorier'), createMember);
router.put('/:id',  requireRole('tresorier'), updateMember);
router.delete('/:id', requireRole('admin'), deleteMember);

export default router;
