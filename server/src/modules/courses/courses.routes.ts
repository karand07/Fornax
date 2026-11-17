import { Router } from 'express';
import { coursesController } from './courses.controller.js';
import { assessmentsController } from '../assessments/assessments.controller.js';
import { analyticsController } from '../analytics/analytics.controller.js';
import { authMiddleware } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/role.js';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', authMiddleware, (req, res) => coursesController.getAllCourses(req, res));
router.get(
  '/enrolled/me',
  authMiddleware,
  requireRole(Role.STUDENT),
  (req, res) => coursesController.getMyEnrolledCourses(req, res)
);
router.get('/:id', authMiddleware, (req, res) => coursesController.getCourseById(req, res));
router.get(
  '/:id/enrollments',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => coursesController.getCourseEnrollments(req, res)
);
router.post(
  '/',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => coursesController.createCourse(req, res)
);
router.post(
  '/:id/enroll',
  authMiddleware,
  requireRole(Role.STUDENT),
  (req, res) => coursesController.enroll(req, res)
);
router.delete(
  '/:id/enroll',
  authMiddleware,
  requireRole(Role.STUDENT),
  (req, res) => coursesController.unenroll(req, res)
);

// Course assessments
router.post(
  '/:id/assessments',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => assessmentsController.createAssessment(req, res)
);

router.get(
  '/:id/assessments',
  authMiddleware,
  (req, res) => assessmentsController.getCourseAssessments(req, res)
);

// Course analytics (Day 12)
router.get(
  '/:id/analytics/export.csv',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => analyticsController.exportCsv(req, res)
);

router.get(
  '/:id/analytics',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => analyticsController.getCourseAnalytics(req, res)
);

export default router;
