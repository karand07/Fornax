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
    const { sessionId } = req.params;
    if (!sessionId) {
      res.status(400).json({ error: 'Session ID parameter is required' });
      return;
    }

    try {
      const session = await attendanceService.closeSession(sessionId);
      res.status(200).json(session);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to close session';
      res.status(400).json({ error: msg });
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
}

export const attendanceController = new AttendanceController();
