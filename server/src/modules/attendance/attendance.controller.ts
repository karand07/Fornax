import { Request, Response } from 'express';
import { z } from 'zod';
import { attendanceService } from './attendance.service.js';

const createSessionSchema = z.object({
  courseId: z.string().uuid('Valid course ID is required'),
  title: z.string().min(1, 'Session title is required'),
});

const scanQrSchema = z.object({
  sessionId: z.string().uuid('Valid session ID is required'),
  qrCodeToken: z.string().min(1, 'Attendance code or token is required'),
});

const verifyFaceSchema = z.object({
  sessionId: z.string().uuid('Valid session ID is required'),
  descriptor: z.array(z.number()).min(68, 'Valid facial descriptor vector is required'),
});

const openWindowSchema = z.object({
  seconds: z
    .number()
    .int('Seconds must be an integer')
    .min(10, 'Seconds must be at least 10')
    .max(600, 'Seconds cannot exceed 600')
    .default(90),
});

const checkCodeSchema = z.object({
  code: z.string().min(1, 'Attendance code is required'),
});

const markAttendanceSchema = z.object({
  code: z.string().min(1, 'Attendance code is required'),
  descriptor: z.array(z.number()).length(128, 'Facial descriptor must have exactly 128 elements'),
  livenessPassed: z.boolean(),
});

const reviewRecordSchema = z.object({
  status: z.enum(['PRESENT', 'ABSENT']),
});

const faceDescriptorSchema = z
  .array(z.number().refine((n) => Number.isFinite(n), { message: 'Must be finite number' }))
  .length(128, 'Face descriptor must have exactly 128 numbers');

const classPhotoSchema = z.object({
  photos: z
    .array(z.array(faceDescriptorSchema).max(150, 'A photo can have at most 150 faces'))
    .min(1, 'At least 1 photo is required')
    .max(5, 'At most 5 photos are allowed'),
});

const manualAttendanceSchema = z.object({
  studentId: z.string().uuid('Valid student ID is required'),
  status: z.enum(['PRESENT', 'ABSENT']),
});


export class AttendanceController {
  async createSession(req: Request, res: Response): Promise<void> {
    const parseResult = createSessionSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ error });
      return;
    }

    try {
      const session = await attendanceService.createSession(
        parseResult.data.courseId,
        parseResult.data.title
      );
      res.status(201).json(session);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create session';
      res.status(400).json({ error: msg });
    }
  }

  async startSession(req: Request, res: Response): Promise<void> {
    const { sessionId } = req.params;
    if (!sessionId) {
      res.status(400).json({ error: 'Session ID parameter is required' });
      return;
    }

    try {
      const session = await attendanceService.startSession(sessionId);
      res.status(200).json(session);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start session';
      res.status(400).json({ error: msg });
    }
  }

  async closeSession(req: Request, res: Response): Promise<void> {
    const sessionId = req.params.sessionId || req.params.id;
    if (!sessionId) {
      res.status(400).json({ error: 'Session ID parameter is required' });
      return;
    }

    try {
      const teacherId = req.user?.userId;
      const role = req.user?.role;
      const session = await attendanceService.closeSession(sessionId, teacherId, role);
      res.status(200).json(session);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to close session';
      const statusCode = msg.startsWith('Unauthorized') ? 403 : 400;
      res.status(statusCode).json({ error: msg });
    }
  }

  async getSessionById(req: Request, res: Response): Promise<void> {
    const { sessionId } = req.params;
    if (!sessionId) {
      res.status(400).json({ error: 'Session ID parameter is required' });
      return;
    }

    try {
      const session = await attendanceService.getSession(sessionId);
      res.status(200).json(session);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve session';
      res.status(404).json({ error: msg });
    }
  }

  async getSessionCode(req: Request, res: Response): Promise<void> {
    const { sessionId } = req.params;
    if (!sessionId) {
      res.status(400).json({ error: 'Session ID parameter is required' });
      return;
    }

    try {
      const codeData = await attendanceService.getSessionCode(sessionId);
      res.status(200).json(codeData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate session code';
      res.status(400).json({ error: msg });
    }
  }

  async scanQR(req: Request, res: Response): Promise<void> {
    const parseResult = scanQrSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ error });
      return;
    }

    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized: User not authenticated' });
        return;
      }

      const record = await attendanceService.checkInViaQR(
        parseResult.data.sessionId,
        userId,
        parseResult.data.qrCodeToken
      );
      res.status(200).json({ success: true, record });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Attendance check-in failed';
      res.status(400).json({ error: msg });
    }
  }

  async verifyFace(req: Request, res: Response): Promise<void> {
    const parseResult = verifyFaceSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ error });
      return;
    }

    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized: User not authenticated' });
        return;
      }

      const record = await attendanceService.checkInViaFace(
        parseResult.data.sessionId,
        userId,
        parseResult.data.descriptor
      );
      res.status(200).json({ success: true, record });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Facial attendance failed';
      res.status(400).json({ error: msg });
    }
  }

  async getSessionRecords(req: Request, res: Response): Promise<void> {
    const { sessionId } = req.params;
    if (!sessionId) {
      res.status(400).json({ error: 'Session ID parameter is required' });
      return;
    }

    try {
      const records = await attendanceService.getSessionRecords(sessionId);
      res.status(200).json(records);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve records';
      res.status(500).json({ error: msg });
    }
  }

  async getMyAttendance(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized: User not authenticated' });
        return;
      }
      const records = await attendanceService.getStudentAttendance(userId);
      res.status(200).json(records);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve attendance';
      res.status(500).json({ error: msg });
    }
  }

  async getMyCourseAttendance(req: Request, res: Response): Promise<void> {
    const studentId = req.user?.userId;
    if (!studentId) {
      res.status(401).json({ error: 'Unauthorized: User not authenticated' });
      return;
    }

    const courseId = req.query.courseId as string | undefined;
    if (!courseId) {
      res.status(400).json({ error: 'courseId query parameter is required' });
      return;
    }

    try {
      const data = await attendanceService.getMyCourseAttendance(studentId, courseId);
      res.status(200).json(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve attendance';
      const status = (err as any)?.statusCode || (msg.includes('not enrolled') ? 403 : 500);
      res.status(status).json({ error: msg });
    }
  }

  async openWindow(req: Request, res: Response): Promise<void> {
    const sessionId = req.params.id || req.params.sessionId;
    if (!sessionId) {
      res.status(400).json({ error: 'Session ID parameter is required' });
      return;
    }

    const parseResult = openWindowSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ error });
      return;
    }

    const userId = req.user?.userId;
    const role = req.user?.role;
    if (!userId || !role) {
      res.status(401).json({ error: 'Unauthorized: User not authenticated' });
      return;
    }

    try {
      const result = await attendanceService.openMarkingWindow(
        sessionId,
        userId,
        role,
        parseResult.data.seconds
      );
      res.status(200).json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to open marking window';
      const statusCode = msg.startsWith('Unauthorized') ? 403 : 400;
      res.status(statusCode).json({ error: msg });
    }
  }

  async checkCode(req: Request, res: Response): Promise<void> {
    const sessionId = req.params.id || req.params.sessionId;
    if (!sessionId) {
      res.status(400).json({ error: 'Session ID parameter is required' });
      return;
    }

    const parseResult = checkCodeSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ error });
      return;
    }

    const studentId = req.user?.userId;
    if (!studentId) {
      res.status(401).json({ error: 'Unauthorized: User not authenticated' });
      return;
    }

    try {
      const result = await attendanceService.checkCode(
        sessionId,
        studentId,
        parseResult.data.code
      );
      res.status(200).json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Code verification failed';
      const statusCode = msg.includes('not enrolled') ? 403 : 400;
      res.status(statusCode).json({ error: msg });
    }
  }

  async markAttendance(req: Request, res: Response): Promise<void> {
    const sessionId = req.params.id || req.params.sessionId;
    if (!sessionId) {
      res.status(400).json({ error: 'Session ID parameter is required' });
      return;
    }

    const parseResult = markAttendanceSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ error });
      return;
    }

    const studentId = req.user?.userId;
    if (!studentId) {
      res.status(401).json({ error: 'Unauthorized: User not authenticated' });
      return;
    }

    try {
      const clientIp = req.ip || '';
      const result = await attendanceService.markSelfAttendance(
        sessionId,
        studentId,
        clientIp,
        parseResult.data.code,
        parseResult.data.descriptor,
        parseResult.data.livenessPassed
      );
      res.status(200).json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Attendance marking failed';
      const statusCode = msg.includes('not enrolled') ? 403 : 400;
      res.status(statusCode).json({ error: msg });
    }
  }

  async reviewRecord(req: Request, res: Response): Promise<void> {
    const recordId = req.params.id || req.params.recordId;
    if (!recordId) {
      res.status(400).json({ error: 'Record ID parameter is required' });
      return;
    }

    const parseResult = reviewRecordSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ error });
      return;
    }

    const teacherId = req.user?.userId;
    const role = req.user?.role;
    if (!teacherId || !role) {
      res.status(401).json({ error: 'Unauthorized: User not authenticated' });
      return;
    }

    try {
      const result = await attendanceService.reviewRecord(
        recordId,
        teacherId,
        role,
        parseResult.data.status
      );
      res.status(200).json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to review record';
      const statusCode = msg.startsWith('Unauthorized') ? 403 : 400;
      res.status(statusCode).json({ error: msg });
    }
  }

  async processClassPhoto(req: Request, res: Response): Promise<void> {
    const sessionId = req.params.id || req.params.sessionId;
    if (!sessionId) {
      res.status(400).json({ error: 'Session ID parameter is required' });
      return;
    }

    const parseResult = classPhotoSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ error });
      return;
    }

    const teacherId = req.user?.userId;
    const role = req.user?.role;
    if (!teacherId || !role) {
      res.status(401).json({ error: 'Unauthorized: User not authenticated' });
      return;
    }

    try {
      const result = await attendanceService.processClassPhoto(
        sessionId,
        teacherId,
        role,
        parseResult.data.photos
      );
      res.status(200).json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to process class photo';
      const statusCode = msg.startsWith('Unauthorized') ? 403 : 400;
      res.status(statusCode).json({ error: msg });
    }
  }

  async markManual(req: Request, res: Response): Promise<void> {
    const sessionId = req.params.id || req.params.sessionId;
    if (!sessionId) {
      res.status(400).json({ error: 'Session ID parameter is required' });
      return;
    }

    const parseResult = manualAttendanceSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ error });
      return;
    }

    const teacherId = req.user?.userId;
    const role = req.user?.role;
    if (!teacherId || !role) {
      res.status(401).json({ error: 'Unauthorized: User not authenticated' });
      return;
    }

    try {
      const result = await attendanceService.markManualAttendance(
        sessionId,
        teacherId,
        role,
        parseResult.data.studentId,
        parseResult.data.status
      );
      res.status(200).json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to mark manual attendance';
      const statusCode = msg.startsWith('Unauthorized') ? 403 : 400;
      res.status(statusCode).json({ error: msg });
    }
  }

  async getActiveSessions(req: Request, res: Response): Promise<void> {
    const userId = req.user?.userId;
    const role = req.user?.role;
    if (!userId || !role) {
      res.status(401).json({ error: 'Unauthorized: User not authenticated' });
      return;
    }

    try {
      const sessions = await attendanceService.getActiveSessions(userId, role);
      res.status(200).json(sessions);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve active sessions';
      res.status(500).json({ error: msg });
    }
  }
}

export const attendanceController = new AttendanceController();
