import { Router } from 'express';
import { syncPayments, syncMembers, resetData, refreshAllStatuses, diagnostic, simulateStatuses, classifyDonors, syncForms } from '../controllers/helloassoController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/permissions.js';

const router = Router();

router.get('/sync',         authenticate, requireRole('admin'), syncPayments);
router.get('/sync-members', authenticate, requireRole('admin'), syncMembers);
router.get('/refresh-statuses', authenticate, requireRole('admin'), refreshAllStatuses);
router.get('/diagnostic',       authenticate, requireRole('admin'), diagnostic);
router.get('/simulate',         authenticate, requireRole('admin'), simulateStatuses);
router.post('/classify',        authenticate, requireRole('admin'), classifyDonors);
router.get('/sync-forms',       authenticate, requireRole('admin'), syncForms);
router.delete('/reset',         authenticate, requireRole('admin'), resetData);

export default router;
