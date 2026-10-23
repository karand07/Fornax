import { Request, Response } from 'express';
import { z } from 'zod';
import { coursesService } from './courses.service.js';

const createCourseSchema = z.object({
  code: z.string().min(1, 'Course code is required'),
  title: z.string().min(1, 'Course title is required'),
  description: z.string().optional(),
});

export class CoursesController {
  async getAllCourses(_req: Request, res: Response): Promise<void> {
    try {
      const courses = await coursesService.getAllCourses();
      res.status(200).json(courses);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch courses';
      res.status(500).json({ error: msg });
    }
  }

  async getMyEnrolledCourses(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const courses = await coursesService.getMyEnrolledCourses(userId);
      res.status(200).json(courses);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch enrolled courses';
      res.status(500).json({ error: msg });
    }
  }

  async getCourseById(req: Request, res: Response): Promise<void> {
    try {
      const course = await coursesService.getCourseById(req.params.id);
      res.status(200).json(course);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Course not found';
      res.status(404).json({ error: msg });
    }
  }

  async createCourse(req: Request, res: Response): Promise<void> {
    const parseResult = createCourseSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ error });
      return;
    }

    try {
      const teacherId = req.user?.userId;
      if (!teacherId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const course = await coursesService.createCourse({
        ...parseResult.data,
        teacherId,
      });
      res.status(201).json(course);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create course';
      res.status(400).json({ error: msg });
    }
  }

  async enroll(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const enrollment = await coursesService.enrollStudent(req.params.id, userId);
      res.status(201).json(enrollment);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to enroll in course';
      res.status(400).json({ error: msg });
    }
  }

  async unenroll(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const result = await coursesService.unenrollStudent(req.params.id, userId);
      res.status(200).json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to unenroll from course';
      res.status(400).json({ error: msg });
    }
  }

  async getCourseEnrollments(req: Request, res: Response): Promise<void> {
    try {
      const enrollments = await coursesService.getCourseEnrollments(req.params.id);
      res.status(200).json(enrollments);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch course enrollments';
      res.status(500).json({ error: msg });
    }
  }
}

export const coursesController = new CoursesController();
