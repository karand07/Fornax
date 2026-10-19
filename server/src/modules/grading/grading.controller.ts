import { Request, Response } from 'express';
import { z } from 'zod';
import { gradingService } from './grading.service.js';

const submitSchema = z.object({
  assessmentId: z.string().uuid('Valid assessment ID is required'),
  content: z.string().optional(),
  fileUrl: z.string().optional(),
});

const gradeSchema = z.object({
  score: z.number().min(0, 'Score must be non-negative'),
  feedback: z.string().optional(),
});

export class GradingController {
  async submit(req: Request, res: Response): Promise<void> {
    const parseResult = submitSchema.safeParse(req.body);
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

      const submission = await gradingService.submitAssessment({
        ...parseResult.data,
        userId,
      });
      res.status(200).json(submission);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Submission failed';
      res.status(400).json({ error: msg });
    }
  }

  async grade(req: Request, res: Response): Promise<void> {
    const parseResult = gradeSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ error });
      return;
    }

    try {
      const graded = await gradingService.gradeSubmission(
        req.params.submissionId,
        parseResult.data
      );
      res.status(200).json(graded);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Grading failed';
      res.status(400).json({ error: msg });
    }
  }

  async getAiFeedback(req: Request, res: Response): Promise<void> {
    try {
      const feedback = await gradingService.getAiAssistedFeedback(req.params.submissionId);
      res.status(200).json(feedback);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate AI feedback';
      res.status(500).json({ error: msg });
    }
  }
}

export const gradingController = new GradingController();
