import { Router } from 'express';
import { masteryController } from '../mastery/mastery.controller.js';
import { profileController } from '../profile/profile.controller.js';
import { adaptiveController } from '../adaptive/adaptive.controller.js';
import { authMiddleware } from '../../middleware/auth.js';

const router = Router();

// GET /api/students/:id/mastery?courseId= (self, or TEACHER owning the course)
router.get('/:id/mastery', authMiddleware, (req, res) =>
  masteryController.getStudentCourseMastery(req, res)
);

// GET /api/students/:id/profile?courseId= (enrolled student, or TEACHER owning course, or ADMIN)
router.get('/:id/profile', authMiddleware, (req, res) =>
  profileController.getStudentProfile(req, res)
);

// GET /api/students/:id/recommendations?courseId= (enrolled student, or TEACHER owning course, or ADMIN)
router.get('/:id/recommendations', authMiddleware, (req, res) =>
  profileController.getStudentRecommendations(req, res)
);

// POST /api/students/:id/adaptive-quiz/generate?courseId= (Autonomous system-generated challenge quiz)
router.post('/:id/adaptive-quiz/generate', authMiddleware, (req, res) =>
  adaptiveController.generateAdaptiveQuiz(req, res)
);

// POST /api/students/:id/adaptive-quiz/submit (Auto-grading & multi-concept mastery update)
router.post('/:id/adaptive-quiz/submit', authMiddleware, (req, res) =>
  adaptiveController.submitAdaptiveQuiz(req, res)
);

// POST /api/students/:id/study-notes (Personalized study notes & curated materials)
router.post('/:id/study-notes', authMiddleware, (req, res) =>
  adaptiveController.generateStudyNotes(req, res)
);

export default router;
