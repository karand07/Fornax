import { Router } from 'express';
import { attendanceController } from './attendance.controller.js';
import { authMiddleware } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/role.js';
import { Role } from '@prisma/client';

const router = Router();

router.post(
  '/session',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => attendanceController.createSession(req, res)
);

router.post(
  '/session/:sessionId/close',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => attendanceController.closeSession(req, res)
);

router.get(
  '/session/:sessionId/records',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => attendanceController.getSessionRecords(req, res)
);

router.post(
  '/check-in/qr',
  authMiddleware,
  requireRole(Role.STUDENT),
  (req, res) => attendanceController.scanQR(req, res)
);

router.post(
  '/check-in/face',
  authMiddleware,
  requireRole(Role.STUDENT),
  (req, res) => attendanceController.verifyFace(req, res)
);

router.get(
  '/my-history',
  authMiddleware,
  requireRole(Role.STUDENT),
  (req, res) => attendanceController.getMyAttendance(req, res)
);

export default router;
