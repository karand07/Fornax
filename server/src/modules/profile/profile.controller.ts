import { Request, Response } from 'express';
import { z } from 'zod';
import { profileService } from './profile.service.js';
import { Role } from '@prisma/client';

const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
});

const enrollFaceSchema = z.object({
  descriptor: z.array(z.number()).min(68, 'Valid facial descriptor vector is required'),
});

const studentCourseQuerySchema = z.object({
  courseId: z.string().min(1, 'courseId is required'),
});

export class ProfileController {
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const profile = await profileService.getUserProfile(userId);
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
      const msg = err instanceof Error ? err.message : 'Failed to enroll face';
      res.status(400).json({ error: msg });
    }
  }

  /**
   * GET /api/students/:id/profile?courseId=
   */
  async getStudentProfile(req: Request, res: Response): Promise<void> {
    const parseResult = studentCourseQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      const error = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ error });
      return;
    }

    try {
      const requesterId = req.user?.userId;
      const requesterRole = req.user?.role;
      if (!requesterId || !requesterRole) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const studentId = req.params.id;
      const { courseId } = parseResult.data;

      const profile = await profileService.getProfile(
        studentId,
        courseId,
        requesterId,
        requesterRole
      );

      // Student response REPLACES risk with { level, factors } and omits score and usedWeights.
      // Teacher response includes full risk (level, score, factors, usedWeights).
      if (requesterRole === Role.STUDENT) {
        const studentView = {
          ...profile,
          risk: {
            level: profile.risk.level,
            factors: profile.risk.factors,
          },
        };
        res.status(200).json(studentView);
        return;
      }

      res.status(200).json(profile);
    } catch (err: unknown) {
      const statusCode = (err as any)?.statusCode || 400;
      const msg = err instanceof Error ? err.message : 'Failed to retrieve student profile';
      res.status(statusCode).json({ error: msg });
    }
  }

  /**
   * GET /api/students/:id/recommendations?courseId=
   */
  async getStudentRecommendations(req: Request, res: Response): Promise<void> {
    const parseResult = studentCourseQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      const error = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ error });
      return;
    }

    try {
      const requesterId = req.user?.userId;
      const requesterRole = req.user?.role;
      if (!requesterId || !requesterRole) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const studentId = req.params.id;
      const { courseId } = parseResult.data;

      const recs = await profileService.getRecommendations(
        studentId,
        courseId,
        requesterId,
        requesterRole
      );

      res.status(200).json(recs);
    } catch (err: unknown) {
      const statusCode = (err as any)?.statusCode || 400;
      const msg = err instanceof Error ? err.message : 'Failed to retrieve recommendations';
      res.status(statusCode).json({ error: msg });
    }
  }
}

export const profileController = new ProfileController();
