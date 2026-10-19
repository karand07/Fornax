import { Router } from 'express';
import { analyticsController } from './analytics.controller.js';
import { authMiddleware } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/role.js';
import { Role } from '@prisma/client';

const router = Router();

router.get(
  '/overview',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => analyticsController.getOverview(req, res)
);

router.get(
  '/student/:studentId?',
  authMiddleware,
  (req, res) => analyticsController.getStudentAnalytics(req, res)
);

export default router;
