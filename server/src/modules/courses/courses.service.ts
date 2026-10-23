import { prisma } from '../../lib/prisma.js';


export class CoursesService {
  async getAllCourses() {
    return prisma.course.findMany({
      include: {
        teacher: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        _count: {
          select: { enrollments: true, sessions: true, assessments: true, concepts: true },
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
        concepts: {
          orderBy: { order: 'asc' },
          include: {
            resources: {
              orderBy: { createdAt: 'asc' },
            },
            prerequisites: {
              include: {
                prerequisite: {
                  select: { id: true, title: true, order: true },
                },
              },
            },
            prerequisiteFor: {
              include: {
                concept: {
                  select: { id: true, title: true, order: true },
                },
              },
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

    const existing = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });
    if (existing) {
      return existing;
    }

    return prisma.enrollment.create({
      data: {
        courseId,
        userId,
      },
    });
  }

  async unenrollStudent(courseId: string, userId: string) {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    await prisma.enrollment.delete({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    return { success: true };
  }

  async getMyEnrolledCourses(userId: string) {
    return prisma.course.findMany({
      where: {
        enrollments: {
          some: { userId },
        },
      },
      include: {
        teacher: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        _count: {
          select: { concepts: true, assessments: true, sessions: true, enrollments: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCourseEnrollments(courseId: string) {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      throw new Error('Course not found');
    }

    return prisma.enrollment.findMany({
      where: { courseId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}

export const coursesService = new CoursesService();
