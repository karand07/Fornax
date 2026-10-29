import { Router } from 'express';
import { assessmentsController } from './assessments.controller.js';
import { authMiddleware } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/role.js';
import { Role } from '@prisma/client';

const router = Router();

// Edit question (Teacher owns, assessment unpublished)
router.patch(
  '/:id',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => assessmentsController.updateQuestion(req, res)
);

// Delete question (Teacher owns, assessment unpublished)
router.delete(
  '/:id',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => assessmentsController.deleteQuestion(req, res)
);

export default router;
