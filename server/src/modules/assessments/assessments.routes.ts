import { Router } from 'express';
import { assessmentsController } from './assessments.controller.js';
import { authMiddleware } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/role.js';
import { Role } from '@prisma/client';

const router = Router();

router.get('/course/:courseId', authMiddleware, (req, res) =>
  assessmentsController.getByCourse(req, res)
);
router.get('/:id', authMiddleware, (req, res) =>
  assessmentsController.getById(req, res)
);
router.post(
  '/',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => assessmentsController.create(req, res)
);

export default router;
