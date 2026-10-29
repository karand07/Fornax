import { Request, Response } from 'express';
import { z } from 'zod';
import { masteryService } from './mastery.service.js';

const updateMasterySchema = z.object({
  topic: z.string().min(1, 'Topic name is required'),
  level: z.number().min(0).max(100, 'Mastery level must be between 0 and 100'),
});

export class MasteryController {
  async getStudentMastery(req: Request, res: Response): Promise<void> {
    const courseId = req.query.courseId as string | undefined;
    if (courseId) {
      return this.getStudentCourseMastery(req, res);
    }

    try {
      const targetUserId = req.params.userId || req.user?.userId;
      if (!targetUserId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const scores = await masteryService.getStudentMastery(targetUserId);
      res.status(200).json(scores);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve mastery scores';
      res.status(500).json({ error: msg });
    }
  }

  async getStudentCourseMastery(req: Request, res: Response): Promise<void> {
    const studentId = req.params.id || req.params.userId || req.user?.userId;
    const courseId = req.query.courseId as string | undefined;

    if (!studentId) {
      res.status(400).json({ error: 'Student ID is required' });
      return;
    }

    if (!courseId) {
      res.status(400).json({ error: 'courseId query parameter is required' });
      return;
    }

    const requesterId = req.user?.userId;
    const requesterRole = req.user?.role;
    if (!requesterId || !requesterRole) {
      res.status(401).json({ error: 'Unauthorized: User not authenticated' });
      return;
    }

    try {
      const data = await masteryService.getCourseMasteryForStudent(
        studentId,
        courseId,
        requesterId,
        requesterRole
      );
      res.status(200).json(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve student mastery';
      const status = msg.startsWith('Unauthorized') ? 403 : msg.includes('not found') ? 404 : 400;
      res.status(status).json({ error: msg });
    }
  }

  async updateMastery(req: Request, res: Response): Promise<void> {
    const parseResult = updateMasterySchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ error });
      return;
    }

    try {
      const targetUserId = req.params.userId;
      const result = await masteryService.updateMastery(
        targetUserId,
        parseResult.data.topic,
        parseResult.data.level
      );
      res.status(200).json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update mastery';
      res.status(400).json({ error: msg });
    }
  }
}

export const masteryController = new MasteryController();
