import { Router } from 'express';
import { coursesController } from './courses.controller.js';
import { authMiddleware } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/role.js';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', authMiddleware, (req, res) => coursesController.getAllCourses(req, res));
router.get('/:id', authMiddleware, (req, res) => coursesController.getCourseById(req, res));
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

export default router;
