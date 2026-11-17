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

const ocrPatchSchema = z.object({
  text: z.string().min(1, 'Text must be between 1 and 5000 characters').max(5000, 'Text must be between 1 and 5000 characters'),
});

const regradeSchema = z.object({
  force: z.boolean().optional(),
});

const overrideSchema = z.object({
  finalMarks: z.number({ required_error: 'finalMarks is required' }).min(0, 'finalMarks must be non-negative'),
  note: z.string().min(5, 'Note must be between 5 and 500 characters').max(500, 'Note must be between 5 and 500 characters'),
});

const reviewQueueQuerySchema = z.object({
  courseId: z.string().optional(),
  assessmentId: z.string().optional(),
  status: z.enum(['pending', 'done']).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const auditQuerySchema = z.object({
  entityType: z.string().min(1, 'entityType is required'),
  entityId: z.string().min(1, 'entityId is required'),
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

  async getSubmission(req: Request, res: Response): Promise<void> {
    try {
      const teacherId = req.user?.userId;
      const userRole = req.user?.role;
      if (!teacherId || !userRole) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const submission = await gradingService.getSubmissionById(
        req.params.id,
        teacherId,
        userRole
      );
      res.status(200).json(submission);
    } catch (err: unknown) {
      const statusCode = (err as any)?.statusCode || 400;
      const msg = err instanceof Error ? err.message : 'Failed to retrieve submission';
      res.status(statusCode).json({ error: msg });
    }
  }

  async getAssessmentSubmissions(req: Request, res: Response): Promise<void> {
    try {
      const teacherId = req.user?.userId;
      const userRole = req.user?.role;
      if (!teacherId || !userRole) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const submissions = await gradingService.getAssessmentSubmissions(
        req.params.assessmentId,
        teacherId,
        userRole
      );
      res.status(200).json(submissions);
    } catch (err: unknown) {
      const statusCode = (err as any)?.statusCode || 400;
      const msg = err instanceof Error ? err.message : 'Failed to retrieve assessment submissions';
      res.status(statusCode).json({ error: msg });
    }
  }

  async getReviewQueue(req: Request, res: Response): Promise<void> {
    const parseResult = reviewQueueQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      const error = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ error });
      return;
    }

    try {
      const teacherId = req.user?.userId;
      const userRole = req.user?.role;
      if (!teacherId || !userRole) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const queue = await gradingService.getReviewQueue(
        parseResult.data,
        teacherId,
        userRole
      );
      res.status(200).json(queue);
    } catch (err: unknown) {
      const statusCode = (err as any)?.statusCode || 400;
      const msg = err instanceof Error ? err.message : 'Failed to retrieve review queue';
      res.status(statusCode).json({ error: msg });
    }
  }

  async updateOcr(req: Request, res: Response): Promise<void> {
    const parseResult = ocrPatchSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ error });
      return;
    }

    try {
      const teacherId = req.user?.userId;
      const userRole = req.user?.role;
      if (!teacherId || !userRole) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const updated = await gradingService.updateOcrTranscript(
        req.params.id,
        parseResult.data.text,
        teacherId,
        userRole
      );
      res.status(200).json(updated);
    } catch (err: unknown) {
      const statusCode = (err as any)?.statusCode || 400;
      const msg = err instanceof Error ? err.message : 'Failed to update OCR text';
      res.status(statusCode).json({ error: msg });
    }
  }

  async regrade(req: Request, res: Response): Promise<void> {
    const parseResult = regradeSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ error });
      return;
    }

    try {
      const teacherId = req.user?.userId;
      const userRole = req.user?.role;
      if (!teacherId || !userRole) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const regraded = await gradingService.regradeSubmission(
        req.params.id,
        parseResult.data.force,
        teacherId,
        userRole
      );
      res.status(200).json(regraded);
    } catch (err: unknown) {
      const statusCode = (err as any)?.statusCode || 400;
      const msg = err instanceof Error ? err.message : 'Failed to regrade submission';
      res.status(statusCode).json({ error: msg });
    }
  }

  async approve(req: Request, res: Response): Promise<void> {
    try {
      const teacherId = req.user?.userId;
      const userRole = req.user?.role;
      if (!teacherId || !userRole) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const result = await gradingService.approveGrade(
        req.params.id,
        teacherId,
        userRole
      );
      res.status(200).json(result);
    } catch (err: unknown) {
      const statusCode = (err as any)?.statusCode || 400;
      const msg = err instanceof Error ? err.message : 'Failed to approve grade';
      res.status(statusCode).json({ error: msg });
    }
  }

  async override(req: Request, res: Response): Promise<void> {
    const parseResult = overrideSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ error });
      return;
    }

    try {
      const teacherId = req.user?.userId;
      const userRole = req.user?.role;
      if (!teacherId || !userRole) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const result = await gradingService.overrideGrade(
        req.params.id,
        parseResult.data,
        teacherId,
        userRole
      );
      res.status(200).json(result);
    } catch (err: unknown) {
      const statusCode = (err as any)?.statusCode || 400;
      const msg = err instanceof Error ? err.message : 'Failed to override grade';
      res.status(statusCode).json({ error: msg });
    }
  }

  async getAudit(req: Request, res: Response): Promise<void> {
    const parseResult = auditQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      const error = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ error });
      return;
    }

    try {
      const teacherId = req.user?.userId;
      const userRole = req.user?.role;
      if (!teacherId || !userRole) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const auditEntries = await gradingService.getAuditHistory(
        parseResult.data,
        teacherId,
        userRole
      );
      res.status(200).json(auditEntries);
    } catch (err: unknown) {
      const statusCode = (err as any)?.statusCode || 400;
      const msg = err instanceof Error ? err.message : 'Failed to retrieve audit history';
      res.status(statusCode).json({ error: msg });
    }
  }
}

export const gradingController = new GradingController();
