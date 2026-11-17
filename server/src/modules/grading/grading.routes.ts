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

// Teacher: review queue
router.get(
  '/review-queue',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => gradingController.getReviewQueue(req, res)
);

// Teacher: get audit logs
router.get(
  '/audit',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => gradingController.getAudit(req, res)
);

// Teacher: get submission detail
router.get(
  '/submissions/:id',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => gradingController.getSubmission(req, res)
);

// Teacher: patch OCR text
router.patch(
  '/submissions/:id/ocr',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => gradingController.updateOcr(req, res)
);

// Teacher: regrade submission
router.post(
  '/submissions/:id/regrade',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => gradingController.regrade(req, res)
);

// Teacher: approve grade
router.post(
  '/submissions/:id/approve',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => gradingController.approve(req, res)
);

// Teacher: override grade
router.post(
  '/submissions/:id/override',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => gradingController.override(req, res)
);

// Teacher: get submissions with SHORT answers for an assessment
router.get(
  '/assessments/:assessmentId/submissions',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => gradingController.getAssessmentSubmissions(req, res)
);

export default router;
