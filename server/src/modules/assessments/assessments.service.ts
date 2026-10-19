import { prisma } from '../../lib/prisma.js';

export class AssessmentsService {
  async getCourseAssessments(courseId: string) {
    return prisma.assessment.findMany({
      where: { courseId },
      include: {
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAssessmentById(id: string) {
    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, code: true, title: true } },
        submissions: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
    });

    if (!assessment) {
      throw new Error('Assessment not found');
    }

    return assessment;
  }

  async createAssessment(data: {
    courseId: string;
    title: string;
    description?: string;
    maxScore?: number;
    dueDate?: string;
  }) {
    return prisma.assessment.create({
      data: {
        courseId: data.courseId,
        title: data.title,
        description: data.description,
        maxScore: data.maxScore || 100,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
    });
  }
}

export const assessmentsService = new AssessmentsService();
