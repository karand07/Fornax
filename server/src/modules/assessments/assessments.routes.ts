import { Router } from 'express';
import { assessmentsController } from './assessments.controller.js';
import { authMiddleware } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/role.js';
import { upload } from '../../middleware/upload.js';
import { Role } from '@prisma/client';

const router = Router();

// Add question to assessment (Teacher owns, assessment not published)
router.post(
  '/:id/questions',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => assessmentsController.addQuestion(req, res)
);

// Publish assessment (Teacher owns)
router.patch(
  '/:id/publish',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => assessmentsController.publishAssessment(req, res)
);

// Results summary per question (Teacher owns)
router.get(
  '/:id/results-summary',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => assessmentsController.getResultsSummary(req, res)
);

// Submit assessment answers (Student enrolled)
router.post(
  '/:id/submit',
  authMiddleware,
  requireRole(Role.STUDENT),
  upload.any(),
  (req, res) => assessmentsController.submitAssessment(req, res)
);

// Get student's submission result (Student enrolled)
router.get(
  '/:id/my-result',
  authMiddleware,
  requireRole(Role.STUDENT),
  (req, res) => assessmentsController.getMyResult(req, res)
);

// Get assessment details (Teacher gets full, Student gets sanitized)
router.get(
  '/:id',
  authMiddleware,
  (req, res) => assessmentsController.getAssessmentById(req, res)
);

export default router;
