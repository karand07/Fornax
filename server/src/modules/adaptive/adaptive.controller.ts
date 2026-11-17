import { Request, Response } from 'express';
import { z } from 'zod';
import { adaptiveService } from './adaptive.service.js';
import { Role } from '@prisma/client';

const generateQuizSchema = z.object({
  courseId: z.string().uuid('Valid course ID is required'),
});

const generateNotesSchema = z.object({
  courseId: z.string().uuid('Valid course ID is required'),
  conceptId: z.string().uuid().optional(),
});

const submitQuizSchema = z.object({
  courseId: z.string().uuid('Valid course ID is required'),
  quizId: z.string().min(1, 'Quiz ID is required'),
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1, 'Question ID is required'),
        conceptId: z.string().min(1, 'Concept ID is required'),
        selectedIndex: z.number().int().min(0, 'Selected index must be non-negative'),
        difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
      })
    )
    .min(1, 'At least one answer must be submitted'),
});

export class AdaptiveController {
  async generateAdaptiveQuiz(req: Request, res: Response): Promise<void> {
    const studentId = req.params.id;
    const courseId = typeof req.query.courseId === 'string' ? req.query.courseId : req.body?.courseId;

    const parseResult = generateQuizSchema.safeParse({ courseId });
    if (!parseResult.success) {
      const error = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ error });
      return;
    }

    const requesterId = req.user?.userId;
    const requesterRole = (req.user?.role as Role) || Role.STUDENT;

    if (!requesterId) {
      res.status(401).json({ error: 'Unauthorized: Authentication required' });
      return;
    }

    // Authorization: self, teacher, or admin
    if (requesterId !== studentId && requesterRole !== Role.TEACHER && requesterRole !== Role.ADMIN) {
      res.status(403).json({ error: 'Unauthorized: You can only generate adaptive quizzes for yourself' });
      return;
    }

    try {
      const quiz = await adaptiveService.generateAdaptiveQuiz(
        studentId,
        parseResult.data.courseId,
        requesterId,
        requesterRole
      );
      res.status(200).json(quiz);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate adaptive quiz';
      const status = (err as any).statusCode || 500;
      res.status(status).json({ error: msg });
    }
  }

  async submitAdaptiveQuiz(req: Request, res: Response): Promise<void> {
    const studentId = req.params.id;
    const requesterId = req.user?.userId;

    if (!requesterId) {
      res.status(401).json({ error: 'Unauthorized: Authentication required' });
      return;
    }

    if (requesterId !== studentId) {
      res.status(403).json({ error: 'Unauthorized: You can only submit adaptive quizzes for yourself' });
      return;
    }

    const parseResult = submitQuizSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ error });
      return;
    }

    try {
      const result = await adaptiveService.submitAdaptiveQuiz(studentId, parseResult.data);
      res.status(200).json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit adaptive quiz';
      const status = (err as any).statusCode || 400;
      res.status(status).json({ error: msg });
    }
  }

  async generateStudyNotes(req: Request, res: Response): Promise<void> {
    const studentId = req.params.id;
    const courseId = typeof req.query.courseId === 'string' ? req.query.courseId : req.body?.courseId;
    const conceptId = typeof req.query.conceptId === 'string' ? req.query.conceptId : req.body?.conceptId;

    const parseResult = generateNotesSchema.safeParse({ courseId, conceptId: conceptId || undefined });
    if (!parseResult.success) {
      const error = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ error });
      return;
    }

    const requesterId = req.user?.userId;
    const requesterRole = (req.user?.role as Role) || Role.STUDENT;

    if (!requesterId) {
      res.status(401).json({ error: 'Unauthorized: Authentication required' });
      return;
    }

    if (requesterId !== studentId && requesterRole !== Role.TEACHER && requesterRole !== Role.ADMIN) {
      res.status(403).json({ error: 'Unauthorized: You can only access study notes for yourself' });
      return;
    }

    try {
      const notes = await adaptiveService.generateStudyNotes(
        studentId,
        parseResult.data.courseId,
        parseResult.data.conceptId
      );
      res.status(200).json(notes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate study notes';
      const status = (err as any).statusCode || 500;
      res.status(status).json({ error: msg });
    }
  }
}

export const adaptiveController = new AdaptiveController();
