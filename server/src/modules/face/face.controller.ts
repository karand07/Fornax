import { Request, Response } from 'express';
import { z } from 'zod';
import { faceService } from './face.service.js';

const enrollSchema = z.object({
  descriptor: z.array(z.number()).min(64, 'Valid facial descriptor vector is required (minimum 64 float elements)'),
  consent: z.boolean().optional(),
});

export class FaceController {
  async enroll(req: Request, res: Response): Promise<void> {
    const parseResult = enrollSchema.safeParse(req.body);
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

      const result = await faceService.enrollFace(userId, parseResult.data.descriptor);
      res.status(200).json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to enroll face descriptor';
      res.status(400).json({ error: msg });
    }
  }

  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized: User not authenticated' });
        return;
      }

      const status = await faceService.getFaceStatus(userId);
      res.status(200).json(status);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve face status';
      res.status(400).json({ error: msg });
    }
  }
}

export const faceController = new FaceController();
