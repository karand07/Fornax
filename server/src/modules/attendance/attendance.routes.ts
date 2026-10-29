import { Router } from 'express';
import { attendanceController } from './attendance.controller.js';
import { authMiddleware } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/role.js';
import { Role } from '@prisma/client';

const router = Router();

// Teacher / Admin Session Management
router.post(
  '/session',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => attendanceController.createSession(req, res)
);

router.post(
  '/session/:sessionId/start',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => attendanceController.startSession(req, res)
);

router.post(
  '/session/:sessionId/close',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => attendanceController.closeSession(req, res)
);

router.post(
  '/session/:sessionId/end',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => attendanceController.closeSession(req, res)
);

router.get(
  '/session/:sessionId/code',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => attendanceController.getSessionCode(req, res)
);

router.get(
  '/session/:sessionId/records',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => attendanceController.getSessionRecords(req, res)
);

router.get(
  '/session/:sessionId',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN, Role.STUDENT),
  (req, res) => attendanceController.getSessionById(req, res)
);

// Student Verification Check-Ins
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

// Student attendance summary for enrolled course (GET /api/attendance/me?courseId=)
router.get(
  '/me',
  authMiddleware,
  requireRole(Role.STUDENT),
  (req, res) => attendanceController.getMyCourseAttendance(req, res)
);

// Mode B Short-Window Self-Marking Attendance Routes

// Teacher Open Marking Window
router.post(
  '/sessions/:id/open-window',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => attendanceController.openWindow(req, res)
);
router.post(
  '/session/:id/open-window',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => attendanceController.openWindow(req, res)
);

// Student Pre-Check Code
router.post(
  '/sessions/:id/check-code',
  authMiddleware,
  requireRole(Role.STUDENT),
  (req, res) => attendanceController.checkCode(req, res)
);
router.post(
  '/session/:id/check-code',
  authMiddleware,
  requireRole(Role.STUDENT),
  (req, res) => attendanceController.checkCode(req, res)
);

// Student Mark Attendance
router.post(
  '/sessions/:id/mark',
  authMiddleware,
  requireRole(Role.STUDENT),
  (req, res) => attendanceController.markAttendance(req, res)
);
router.post(
  '/session/:id/mark',
  authMiddleware,
  requireRole(Role.STUDENT),
  (req, res) => attendanceController.markAttendance(req, res)
);

// Teacher Review Attendance Record
router.patch(
  '/records/:id/review',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => attendanceController.reviewRecord(req, res)
);

// Teacher Sessions Records (plural path support)
router.get(
  '/sessions/:sessionId/records',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => attendanceController.getSessionRecords(req, res)
);

// Mode A Class-Photo Attendance Routes
router.post(
  '/sessions/:id/class-photo',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => attendanceController.processClassPhoto(req, res)
);
router.post(
  '/session/:sessionId/class-photo',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => attendanceController.processClassPhoto(req, res)
);

// Teacher Manual Attendance Marking
router.post(
  '/sessions/:id/manual',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => attendanceController.markManual(req, res)
);
router.post(
  '/session/:sessionId/manual',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => attendanceController.markManual(req, res)
);

// End Session (plural path support)
router.post(
  '/sessions/:id/end',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => attendanceController.closeSession(req, res)
);

export default router;
