import { Request, Response } from 'express';
import { analyticsService } from './analytics.service.js';

export class AnalyticsController {
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
