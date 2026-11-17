import { Request, Response } from 'express';
import fs from 'fs';
import { submissionsService } from './submissions.service.js';

export class SubmissionsController {
  async getScan(req: Request, res: Response): Promise<void> {
    const submissionId = req.params.id;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId || !userRole) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      const filePath = await submissionsService.getScanPath(submissionId, userId, userRole);

      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');

      const stream = fs.createReadStream(filePath);
      stream.on('error', (err) => {
        console.error('File stream error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to read scan file' });
        }
      });
      stream.pipe(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve scan';
      const statusCode = (err as any)?.statusCode || 500;
      res.status(statusCode).json({ error: msg });
    }
  }
}

export const submissionsController = new SubmissionsController();
