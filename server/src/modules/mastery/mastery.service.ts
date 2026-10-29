import { prisma } from '../../lib/prisma.js';
import { Prisma, Role } from '@prisma/client';
import { computeMastery, GradedItem } from '../../lib/mastery.js';

export class MasteryService {
  /**
   * Recompute concept mastery for a student from all their question grades for that concept.
   * Idempotent: calling twice produces identical results.
   */
  async recomputeMastery(
    studentId: string,
    conceptId: string,
    tx?: Prisma.TransactionClient
  ) {
    const db = tx ?? prisma;

    // Load all Grades for this student whose question.conceptId = conceptId,
    // ordered by submission.createdAt asc.
    const grades = await db.grade.findMany({
      where: {
        submission: {
          userId: studentId,
          question: {
            conceptId,
          },
        },
      },
      include: {
        submission: {
          include: {
            question: true,
          },
        },
      },
      orderBy: {
        submission: {
          createdAt: 'asc',
        },
      },
    });

    const items: GradedItem[] = [];
    for (const g of grades) {
      const q = g.submission.question;
      if (q && q.maxMarks > 0) {
        const marks = g.finalMarks ?? g.totalMarks;
        items.push({
          ratio: marks / q.maxMarks,
        });
      }
    }

    const { score, attempts } = computeMastery(items);

    return db.mastery.upsert({
      where: {
        userId_conceptId: {
          userId: studentId,
          conceptId,
        },
      },
      update: {
        score,
        attempts,
      },
      create: {
        userId: studentId,
        conceptId,
        score,
        attempts,
      },
    });
  }

  /**
   * Returns course mastery for all concepts for a student.
   * Access: self, or TEACHER owning the course (or ADMIN).
   */
  async getCourseMasteryForStudent(
    studentId: string,
    courseId: string,
    requesterId: string,
    requesterRole: Role
  ) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        concepts: {
          include: {
            prerequisites: {
              include: {
                prerequisite: {
                  select: { title: true },
                },
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!course) {
      throw new Error('Course not found');
    }

    // Authorization: self, or teacher owning course, or admin
    const isSelf = requesterId === studentId;
    const isOwnerTeacher = requesterRole === Role.TEACHER && course.teacherId === requesterId;
    const isAdmin = requesterRole === Role.ADMIN;

    if (!isSelf && !isOwnerTeacher && !isAdmin) {
      throw new Error('Unauthorized: You cannot access this student mastery data');
    }

    const masteryRows = await prisma.mastery.findMany({
      where: {
        userId: studentId,
        conceptId: {
          in: course.concepts.map((c) => c.id),
        },
      },
    });

    const masteryMap = new Map(masteryRows.map((m) => [m.conceptId, m]));

    return course.concepts.map((c) => {
      const row = masteryMap.get(c.id);
      return {
        conceptId: c.id,
        name: c.title,
        score: row?.score ?? 0.5,
        attempts: row?.attempts ?? 0,
        prerequisiteId: c.prerequisites[0]?.prerequisiteId ?? null,
        prerequisiteName: c.prerequisites[0]?.prerequisite?.title ?? null,
        lastUpdated: row?.updatedAt ?? null,
      };
    });
  }

  // Legacy helper for backwards compatibility
  async getStudentMastery(userId: string) {
    return prisma.masteryScore.findMany({
      where: { userId },
      orderBy: { topic: 'asc' },
    });
  }

  async updateMastery(userId: string, topic: string, level: number) {
    return prisma.masteryScore.upsert({
      where: {
        userId_topic: {
          userId,
          topic,
        },
      },
      update: { level },
      create: {
        userId,
        topic,
        level,
      },
    });
  }
}

export const masteryService = new MasteryService();
