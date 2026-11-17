import { Request, Response } from 'express';
import { analyticsService } from './analytics.service.js';
import { Role } from '@prisma/client';
import { z } from 'zod';

const analyticsQuerySchema = z.object({}).passthrough();

export class AnalyticsController {
  async getCourseAnalytics(req: Request, res: Response): Promise<void> {
    try {
      analyticsQuerySchema.parse(req.query);
      const courseId = req.params.id;
      if (!courseId) {
        res.status(400).json({ error: 'Course ID is required' });
        return;
      }

      const teacherId = req.user?.userId;
      const userRole = req.user?.role;
      if (!teacherId || !userRole) {
        res.status(401).json({ error: 'Unauthorized: User not authenticated' });
        return;
      }

      const analytics = await analyticsService.getCourseAnalytics(
        courseId,
        teacherId,
        userRole as Role
      );
      res.status(200).json(analytics);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch course analytics';
      const status =
        (err as any)?.statusCode ||
        (msg.includes('Unauthorized') ? 403 : msg.includes('not found') ? 404 : 500);
      res.status(status).json({ error: msg });
    }
  }

  async exportCsv(req: Request, res: Response): Promise<void> {
    try {
      analyticsQuerySchema.parse(req.query);
      const courseId = req.params.id;
      if (!courseId) {
        res.status(400).json({ error: 'Course ID is required' });
        return;
      }

      const teacherId = req.user?.userId;
      const userRole = req.user?.role;
      if (!teacherId || !userRole) {
        res.status(401).json({ error: 'Unauthorized: User not authenticated' });
        return;
      }

      const csvContent = await analyticsService.exportCsv(
        courseId,
        teacherId,
        userRole as Role
      );

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="analytics-${courseId}.csv"`
      );
      res.setHeader('Cache-Control', 'private, no-store');
      res.status(200).send(csvContent);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to export analytics CSV';
      const status =
        (err as any)?.statusCode ||
        (msg.includes('Unauthorized') ? 403 : msg.includes('not found') ? 404 : 500);
      res.status(status).json({ error: msg });
    }
  }

  async getOverview(_req: Request, res: Response): Promise<void> {
    try {
      const overview = await analyticsService.getSystemOverview();
      res.status(200).json(overview);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch overview analytics';
      res.status(500).json({ error: msg });
    }
  }

  async getStudentAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const targetUserId = req.params.studentId || req.user?.userId;
      if (!targetUserId) {
        res.status(400).json({ error: 'Student ID is required' });
        return;
      }

      const analytics = await analyticsService.getStudentAnalytics(targetUserId);
      res.status(200).json(analytics);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch student analytics';
      res.status(500).json({ error: msg });
    }
  }
}

export const analyticsController = new AnalyticsController();
