import { Request, Response } from 'express';
import { z } from 'zod';
import { conceptsService } from './concepts.service.js';

const createConceptSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  order: z.number().int().optional(),
  courseId: z.string().uuid('Valid course ID is required'),
  prerequisiteIds: z.array(z.string().uuid()).optional(),
});

const updateConceptSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().optional(),
  order: z.number().int().optional(),
  prerequisiteIds: z.array(z.string().uuid()).optional(),
});

const prerequisiteSchema = z.object({
  prerequisiteId: z.string().uuid('Valid prerequisite ID is required'),
});

const submitPracticeSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1, 'Question ID is required'),
        selectedIndex: z.number().int().min(0, 'Selected index must be non-negative'),
      })
    )
    .min(1, 'At least one answer must be submitted'),
});

const explainMisconceptionSchema = z.object({
  questionPrompt: z.string().min(1, 'Question prompt is required'),
  options: z.array(z.string()).optional(),
  selectedAnswer: z.string().min(1, 'Selected answer is required'),
  correctAnswer: z.string().min(1, 'Correct answer is required'),
  generalExplanation: z.string().optional(),
});

export class ConceptsController {
  async getAllConcepts(req: Request, res: Response): Promise<void> {
    try {
      const courseId = typeof req.query.courseId === 'string' ? req.query.courseId : undefined;
      const concepts = await conceptsService.getAllConcepts(courseId);
      res.status(200).json(concepts);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch concepts';
      res.status(500).json({ error: msg });
    }
  }

  async getConceptById(req: Request, res: Response): Promise<void> {
    try {
      const concept = await conceptsService.getConceptById(req.params.id);
      res.status(200).json(concept);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Concept not found';
      res.status(404).json({ error: msg });
    }
  }

  async createConcept(req: Request, res: Response): Promise<void> {
    const parseResult = createConceptSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ error });
      return;
    }

    try {
      const concept = await conceptsService.createConcept(parseResult.data);
      res.status(201).json(concept);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create concept';
      res.status(400).json({ error: msg });
    }
  }

  async updateConcept(req: Request, res: Response): Promise<void> {
    const parseResult = updateConceptSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ error });
      return;
    }

    try {
      const concept = await conceptsService.updateConcept(req.params.id, parseResult.data);
      res.status(200).json(concept);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update concept';
      res.status(400).json({ error: msg });
    }
  }

  async deleteConcept(req: Request, res: Response): Promise<void> {
    try {
      const result = await conceptsService.deleteConcept(req.params.id);
      res.status(200).json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete concept';
      res.status(400).json({ error: msg });
    }
  }

  async addPrerequisite(req: Request, res: Response): Promise<void> {
    const parseResult = prerequisiteSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ error });
      return;
    }

    try {
      const result = await conceptsService.addPrerequisite(req.params.id, parseResult.data.prerequisiteId);
      res.status(201).json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add prerequisite';
      res.status(400).json({ error: msg });
    }
  }

  async removePrerequisite(req: Request, res: Response): Promise<void> {
    try {
      const result = await conceptsService.removePrerequisite(req.params.id, req.params.prerequisiteId);
      res.status(200).json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove prerequisite';
      res.status(400).json({ error: msg });
    }
  }

  async getPracticeQuestions(req: Request, res: Response): Promise<void> {
    try {
      const practice = await conceptsService.getPracticeQuestions(req.params.id);
      res.status(200).json(practice);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve practice questions';
      res.status(404).json({ error: msg });
    }
  }

  async submitPractice(req: Request, res: Response): Promise<void> {
    const parseResult = submitPracticeSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ error });
      return;
    }

    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: User authentication required' });
      return;
    }

    try {
      const result = await conceptsService.submitPractice(
        req.params.id,
        userId,
        parseResult.data.answers
      );
      res.status(200).json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit practice drill';
      res.status(400).json({ error: msg });
    }
  }

  async explainMisconception(req: Request, res: Response): Promise<void> {
    const parseResult = explainMisconceptionSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ error });
      return;
    }

    try {
      const result = await conceptsService.explainMisconception(
        req.params.id,
        parseResult.data
      );
      res.status(200).json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate misconception explanation';
      res.status(500).json({ error: msg });
    }
  }
}

export const conceptsController = new ConceptsController();
