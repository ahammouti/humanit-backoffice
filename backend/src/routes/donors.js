import { Router } from 'express';
import {
  listDonors, getDonor, createDonor, updateDonor, deleteDonor,
  restoreDonor, purgeDonor, listTrashed,
  rgpdExport, rgpdDelete,
} from '../controllers/donorController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/permissions.js';

const router = Router();

router.use(authenticate);

router.get('/',        listDonors);
router.post('/',       requireRole('tresorier'), createDonor);
router.get('/trash',   requireRole('admin'), listTrashed);
router.get('/:id',     getDonor);
router.put('/:id',     requireRole('tresorier'), updateDonor);
router.delete('/:id',  requireRole('admin'), deleteDonor);
router.post('/:id/restore', requireRole('admin'), restoreDonor);
router.delete('/:id/purge', requireRole('admin'), purgeDonor);
router.get('/:id/export',   rgpdExport);
router.delete('/:id/full',  requireRole('admin'), rgpdDelete);

export default router;
