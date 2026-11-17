import { Request, Response } from 'express';
import { z } from 'zod';
import { assessmentsService, QuestionInput } from './assessments.service.js';

const createAssessmentSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be between 3 and 120 characters')
    .max(120, 'Title must be between 3 and 120 characters'),
});

const mcqSchema = z
  .object({
    type: z.literal('MCQ'),
    conceptId: z.string().uuid('Valid concept ID is required'),
    prompt: z.string().min(1, 'Prompt is required'),
    maxMarks: z.number().gt(0, 'maxMarks must be > 0').lte(100, 'maxMarks must be <= 100'),
    options: z
      .array(z.string().min(1, 'Option cannot be empty'))
      .min(2, 'Options must have between 2 and 6 choices')
      .max(6, 'Options must have between 2 and 6 choices')
      .refine((opts) => new Set(opts).size === opts.length, {
        message: 'Options must be unique',
      }),
    correctIndex: z.number().int().min(0, 'correctIndex must be >= 0'),
    modelAnswer: z.string().optional(),
  })
  .refine((data) => data.correctIndex < data.options.length, {
    message: 'correctIndex must be between 0 and options.length - 1',
    path: ['correctIndex'],
  });

const shortOrHandwrittenSchema = z
  .object({
    type: z.enum(['SHORT', 'HANDWRITTEN']),
    conceptId: z.string().uuid('Valid concept ID is required'),
    prompt: z.string().min(1, 'Prompt is required'),
    maxMarks: z.number().gt(0, 'maxMarks must be > 0').lte(100, 'maxMarks must be <= 100'),
    modelAnswer: z.string().min(1, 'Model answer is required for SHORT and HANDWRITTEN questions'),
    rubric: z
      .array(
        z.object({
          description: z.string().min(1, 'Rubric description is required'),
          marks: z.number().gt(0, 'Rubric marks must be > 0'),
        })
      )
      .min(1, 'At least 1 rubric criterion is required')
      .max(8, 'At most 8 rubric criteria allowed'),
  })
  .refine(
    (data) => {
      const sum = data.rubric.reduce((acc, r) => acc + r.marks, 0);
      return Math.abs(sum - data.maxMarks) < 0.001;
    },
    {
      message: 'Rubric marks must sum exactly to maxMarks',
      path: ['rubric'],
    }
  );

const questionSchema: z.ZodType<QuestionInput> = z.union([mcqSchema, shortOrHandwrittenSchema]);

const submitAssessmentSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().uuid('Valid question ID is required'),
      selectedIndex: z.number().int().min(0).optional(),
      answerText: z.string().max(5000, 'Answer text cannot exceed 5000 characters').optional(),
    })
  ),
});

export class AssessmentsController {
  async createAssessment(req: Request, res: Response): Promise<void> {
    const courseId = req.params.id || req.params.courseId;
    if (!courseId) {
      res.status(400).json({ error: 'Course ID parameter is required' });
      return;
    }

    const parseResult = createAssessmentSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ error });
      return;
    }

    const teacherId = req.user?.userId;
    const role = req.user?.role;
    if (!teacherId || !role) {
      res.status(401).json({ error: 'Unauthorized: User not authenticated' });
      return;
    }

    try {
      const assessment = await assessmentsService.createAssessment(
        courseId,
        parseResult.data.title,
        teacherId,
        role
      );
      res.status(201).json(assessment);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create assessment';
      const status = msg.startsWith('Unauthorized') ? 403 : 400;
      res.status(status).json({ error: msg });
    }
  }

  async getCourseAssessments(req: Request, res: Response): Promise<void> {
    const courseId = req.params.id || req.params.courseId;
    if (!courseId) {
      res.status(400).json({ error: 'Course ID parameter is required' });
      return;
    }

    const userId = req.user?.userId;
    const role = req.user?.role;
    if (!userId || !role) {
      res.status(401).json({ error: 'Unauthorized: User not authenticated' });
      return;
    }

    try {
      const assessments = await assessmentsService.getCourseAssessments(courseId, userId, role);
      res.status(200).json(assessments);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve course assessments';
      const status = msg.startsWith('Unauthorized') ? 403 : msg.includes('not found') ? 404 : 400;
      res.status(status).json({ error: msg });
    }
  }

  async addQuestion(req: Request, res: Response): Promise<void> {
    const assessmentId = req.params.id;
    if (!assessmentId) {
      res.status(400).json({ error: 'Assessment ID parameter is required' });
      return;
    }

    const parseResult = questionSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ error });
      return;
    }

    const teacherId = req.user?.userId;
    const role = req.user?.role;
    if (!teacherId || !role) {
      res.status(401).json({ error: 'Unauthorized: User not authenticated' });
      return;
    }

    try {
      const question = await assessmentsService.addQuestion(
        assessmentId,
        parseResult.data,
        teacherId,
        role
      );
      res.status(201).json(question);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add question';
      const status =
        (err as any)?.statusCode ||
        (msg.startsWith('Unauthorized')
          ? 403
          : msg.includes('published')
          ? 409
          : msg.includes('not found')
          ? 404
          : 400);
      res.status(status).json({ error: msg });
    }
  }

  async updateQuestion(req: Request, res: Response): Promise<void> {
    const questionId = req.params.id;
    if (!questionId) {
      res.status(400).json({ error: 'Question ID parameter is required' });
      return;
    }

    const parseResult = questionSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ error });
      return;
    }

    const teacherId = req.user?.userId;
    const role = req.user?.role;
    if (!teacherId || !role) {
      res.status(401).json({ error: 'Unauthorized: User not authenticated' });
      return;
    }

    try {
      const question = await assessmentsService.updateQuestion(
        questionId,
        parseResult.data,
        teacherId,
        role
      );
      res.status(200).json(question);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update question';
      const status =
        (err as any)?.statusCode ||
        (msg.startsWith('Unauthorized')
          ? 403
          : msg.includes('published')
          ? 409
          : msg.includes('not found')
          ? 404
          : 400);
      res.status(status).json({ error: msg });
    }
  }

  async deleteQuestion(req: Request, res: Response): Promise<void> {
    const questionId = req.params.id;
    if (!questionId) {
      res.status(400).json({ error: 'Question ID parameter is required' });
      return;
    }

    const teacherId = req.user?.userId;
    const role = req.user?.role;
    if (!teacherId || !role) {
      res.status(401).json({ error: 'Unauthorized: User not authenticated' });
      return;
    }

    try {
      await assessmentsService.deleteQuestion(questionId, teacherId, role);
      res.status(200).json({ success: true, message: 'Question deleted successfully' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete question';
      const status =
        (err as any)?.statusCode ||
        (msg.startsWith('Unauthorized')
          ? 403
          : msg.includes('published')
          ? 409
          : msg.includes('not found')
          ? 404
          : 400);
      res.status(status).json({ error: msg });
    }
  }

  async publishAssessment(req: Request, res: Response): Promise<void> {
    const assessmentId = req.params.id;
    if (!assessmentId) {
      res.status(400).json({ error: 'Assessment ID parameter is required' });
      return;
    }

    const teacherId = req.user?.userId;
    const role = req.user?.role;
    if (!teacherId || !role) {
      res.status(401).json({ error: 'Unauthorized: User not authenticated' });
      return;
    }

    try {
      const assessment = await assessmentsService.publishAssessment(assessmentId, teacherId, role);
      res.status(200).json(assessment);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to publish assessment';
      const status = msg.startsWith('Unauthorized') ? 403 : msg.includes('not found') ? 404 : 400;
      res.status(status).json({ error: msg });
    }
  }

  async getAssessmentById(req: Request, res: Response): Promise<void> {
    const assessmentId = req.params.id;
    if (!assessmentId) {
      res.status(400).json({ error: 'Assessment ID parameter is required' });
      return;
    }

    const userId = req.user?.userId;
    const role = req.user?.role;
    if (!userId || !role) {
      res.status(401).json({ error: 'Unauthorized: User not authenticated' });
      return;
    }

    try {
      const assessment = await assessmentsService.getAssessmentById(assessmentId, userId, role);
      res.status(200).json(assessment);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve assessment';
      const status =
        (err as any)?.statusCode ||
        (msg.startsWith('Unauthorized') ? 403 : msg.includes('not found') ? 404 : 400);
      res.status(status).json({ error: msg });
    }
  }

  async submitAssessment(req: Request, res: Response): Promise<void> {
    const assessmentId = req.params.id;
    if (!assessmentId) {
      res.status(400).json({ error: 'Assessment ID parameter is required' });
      return;
    }

    const studentId = req.user?.userId;
    if (!studentId) {
      res.status(401).json({ error: 'Unauthorized: User not authenticated' });
      return;
    }

    let payloadData = req.body;
    if (req.body && typeof req.body.payload === 'string') {
      try {
        payloadData = JSON.parse(req.body.payload);
      } catch {
        res.status(400).json({ error: 'Invalid JSON payload' });
        return;
      }
    }

    const parseResult = submitAssessmentSchema.safeParse(payloadData);
    if (!parseResult.success) {
      const error = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ error });
      return;
    }

    const files = (req.files as Express.Multer.File[]) || [];
    const scanFiles = new Map<string, Express.Multer.File>();

    for (const file of files) {
      if (!file.fieldname.startsWith('scan:')) {
        res.status(400).json({ error: `Invalid file fieldname: ${file.fieldname}. Must start with 'scan:'` });
        return;
      }
      const questionId = file.fieldname.slice('scan:'.length);
      if (!questionId) {
        res.status(400).json({ error: `Missing question ID in file fieldname: ${file.fieldname}` });
        return;
      }
      if (scanFiles.has(questionId)) {
        res.status(400).json({ error: `At most one file per question is allowed (duplicate for question ${questionId})` });
        return;
      }
      scanFiles.set(questionId, file);
    }

    // Validation: an answer entry must not carry both text and a scan
    const answers = [...parseResult.data.answers];
    for (const ans of answers) {
      if (ans.answerText && ans.answerText.trim().length > 0 && scanFiles.has(ans.questionId)) {
        res.status(400).json({
          error: `Question ${ans.questionId} cannot carry both text and a scan`,
        });
        return;
      }
    }

    // Ensure questions with a scan are present in answers
    for (const [qId] of scanFiles.entries()) {
      if (!answers.some((a) => a.questionId === qId)) {
        answers.push({ questionId: qId });
      }
    }

    try {
      const result = await assessmentsService.submitAssessment(
        assessmentId,
        studentId,
        answers,
        scanFiles
      );
      res.status(200).json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit assessment';
      const status =
        (err as any)?.statusCode ||
        (msg.startsWith('Unauthorized')
          ? 403
          : msg.includes('already submitted')
          ? 409
          : msg.includes('not found')
          ? 404
          : 400);
      res.status(status).json({ error: msg });
    }
  }

  async getMyResult(req: Request, res: Response): Promise<void> {
    const assessmentId = req.params.id;
    if (!assessmentId) {
      res.status(400).json({ error: 'Assessment ID parameter is required' });
      return;
    }

    const studentId = req.user?.userId;
    if (!studentId) {
      res.status(401).json({ error: 'Unauthorized: User not authenticated' });
      return;
    }

    try {
      const result = await assessmentsService.getMyResult(assessmentId, studentId);
      res.status(200).json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve results';
      const status =
        (err as any)?.statusCode ||
        (msg.startsWith('Unauthorized')
          ? 403
          : msg.includes('not submitted')
          ? 403
          : msg.includes('not found')
          ? 404
          : 400);
      res.status(status).json({ error: msg });
    }
  }

  async getResultsSummary(req: Request, res: Response): Promise<void> {
    const assessmentId = req.params.id;
    if (!assessmentId) {
      res.status(400).json({ error: 'Assessment ID parameter is required' });
      return;
    }

    const teacherId = req.user?.userId;
    const role = req.user?.role;
    if (!teacherId || !role) {
      res.status(401).json({ error: 'Unauthorized: User not authenticated' });
      return;
    }

    try {
      const summary = await assessmentsService.getResultsSummary(assessmentId, teacherId, role);
      res.status(200).json(summary);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve results summary';
      const status = msg.startsWith('Unauthorized') ? 403 : msg.includes('not found') ? 404 : 400;
      res.status(status).json({ error: msg });
    }
  }
}

export const assessmentsController = new AssessmentsController();
