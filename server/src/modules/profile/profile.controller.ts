import { Request, Response } from 'express';
import { z } from 'zod';
import { profileService } from './profile.service.js';

const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
});

const enrollFaceSchema = z.object({
  descriptor: z.array(z.number()).min(68, 'Valid facial descriptor vector is required'),
});

export class ProfileController {
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const profile = await profileService.getProfile(userId);
      res.status(200).json(profile);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve profile';
      res.status(404).json({ error: msg });
    }
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    const parseResult = updateProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ error });
      return;
    }

    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const updated = await profileService.updateProfile(userId, parseResult.data);
      res.status(200).json(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile';
      res.status(400).json({ error: msg });
    }
  }

  async enrollFace(req: Request, res: Response): Promise<void> {
    const parseResult = enrollFaceSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ error });
      return;
    }

    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const result = await profileService.enrollFace(userId, parseResult.data.descriptor);
      res.status(200).json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to enroll face profile';
      res.status(400).json({ error: msg });
    }
  }
}

export const profileController = new ProfileController();
