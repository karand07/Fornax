import { prisma } from '../../lib/prisma.js';

export class CoursesService {
  async getAllCourses() {
    return prisma.course.findMany({
      include: {
        teacher: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        _count: {
          select: { enrollments: true, sessions: true, assessments: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCourseById(id: string) {
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        teacher: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        sessions: { orderBy: { sessionDate: 'desc' } },
        assessments: { orderBy: { createdAt: 'desc' } },
        enrollments: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    });

    if (!course) {
      throw new Error('Course not found');
    }

    return course;
  }

  async createCourse(data: {
    code: string;
    title: string;
    description?: string;
    teacherId: string;
  }) {
    const existing = await prisma.course.findUnique({
      where: { code: data.code },
    });
    if (existing) {
      throw new Error(`Course with code ${data.code} already exists`);
    }

    return prisma.course.create({
      data: {
        code: data.code,
        title: data.title,
        description: data.description,
        teacherId: data.teacherId,
      },
    });
  }

  async enrollStudent(courseId: string, userId: string) {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      throw new Error('Course not found');
    }

    return prisma.enrollment.create({
      data: {
        courseId,
        userId,
      },
    });
  }
}

export const coursesService = new CoursesService();
