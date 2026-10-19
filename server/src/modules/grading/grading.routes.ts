import { Router } from 'express';
import { gradingController } from './grading.controller.js';
import { authMiddleware } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/role.js';
import { Role } from '@prisma/client';

const router = Router();

router.post(
  '/submit',
  authMiddleware,
  requireRole(Role.STUDENT),
  (req, res) => gradingController.submit(req, res)
);

router.post(
  '/grade/:submissionId',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => gradingController.grade(req, res)
);

router.get(
  '/feedback-suggest/:submissionId',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => gradingController.getAiFeedback(req, res)
);

export default router;
