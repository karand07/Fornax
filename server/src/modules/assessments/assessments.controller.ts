import { Request, Response } from 'express';
import { z } from 'zod';
import { assessmentsService } from './assessments.service.js';

const createAssessmentSchema = z.object({
  courseId: z.string().uuid('Valid course ID is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  maxScore: z.number().positive().optional(),
  dueDate: z.string().optional(),
});

export class AssessmentsController {
  async getByCourse(req: Request, res: Response): Promise<void> {
    try {
      const assessments = await assessmentsService.getCourseAssessments(req.params.courseId);
      res.status(200).json(assessments);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch assessments';
      res.status(500).json({ error: msg });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const assessment = await assessmentsService.getAssessmentById(req.params.id);
      res.status(200).json(assessment);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Assessment not found';
      res.status(404).json({ error: msg });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    const parseResult = createAssessmentSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ error });
      return;
    }

    try {
      const assessment = await assessmentsService.createAssessment(parseResult.data);
      res.status(201).json(assessment);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create assessment';
      res.status(400).json({ error: msg });
    }
  }
}

export const assessmentsController = new AssessmentsController();
