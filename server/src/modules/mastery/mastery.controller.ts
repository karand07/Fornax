import { Request, Response } from 'express';
import { z } from 'zod';
import { masteryService } from './mastery.service.js';

const updateMasterySchema = z.object({
  topic: z.string().min(1, 'Topic name is required'),
  level: z.number().min(0).max(100, 'Mastery level must be between 0 and 100'),
});

export class MasteryController {
  async getStudentMastery(req: Request, res: Response): Promise<void> {
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
