import { Router } from 'express';
import { masteryController } from './mastery.controller.js';
import { authMiddleware } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/role.js';
import { Role } from '@prisma/client';

const router = Router();

router.get('/:userId?', authMiddleware, (req, res) =>
  masteryController.getStudentMastery(req, res)
);
router.put(
  '/:userId',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => masteryController.updateMastery(req, res)
);

export default router;
