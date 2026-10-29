import { Router } from 'express';
import { masteryController } from '../mastery/mastery.controller.js';
import { authMiddleware } from '../../middleware/auth.js';

const router = Router();

// GET /api/students/:id/mastery?courseId= (self, or TEACHER owning the course)
router.get('/:id/mastery', authMiddleware, (req, res) =>
  masteryController.getStudentCourseMastery(req, res)
);

export default router;
