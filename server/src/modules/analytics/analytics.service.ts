import { prisma } from '../../lib/prisma.js';
import { Role } from '@prisma/client';
import { buildAnalytics, AnalyticsResult } from './aggregate.js';
import { computeAttendanceRate } from '../../lib/attendance.js';
import { toCsv } from './csv.js';

export class AnalyticsService {
  /**
   * Generates aggregated analytics for a course.
   * Access: TEACHER owning the course or ADMIN.
   * Fixed number of queries regardless of class size.
   */
  async getCourseAnalytics(
    courseId: string,
    teacherId: string,
    userRole: Role
  ): Promise<AnalyticsResult & { generatedAt: string }> {
    // Query 1: Verify course & access control
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, teacherId: true, title: true, code: true },
    });

    if (!course) {
      const err = new Error('Course not found');
      (err as any).statusCode = 404;
      throw err;
    }

    if (userRole !== Role.ADMIN && course.teacherId !== teacherId) {
      const err = new Error('Unauthorized: You do not own this course');
      (err as any).statusCode = 403;
      throw err;
    }

    // Query 2: Enrolled students (role STUDENT only)
    const enrollments = await prisma.enrollment.findMany({
      where: {
        courseId,
        user: { role: Role.STUDENT },
      },
      select: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: [
        { user: { lastName: 'asc' } },
        { user: { firstName: 'asc' } },
      ],
    });

    const students = enrollments.map((e) => ({
      id: e.user.id,
      name: `${e.user.firstName} ${e.user.lastName}`.trim(),
    }));
    const studentIds = students.map((s) => s.id);

    // Query 3: Course concepts with prerequisites
    const concepts = await prisma.concept.findMany({
      where: { courseId },
      include: {
        prerequisites: {
          select: { prerequisiteId: true },
        },
      },
      orderBy: { order: 'asc' },
    });

    const conceptIds = concepts.map((c) => c.id);
    const mappedConcepts = concepts.map((c) => ({
      id: c.id,
      name: c.title,
      prerequisiteId: c.prerequisites[0]?.prerequisiteId ?? null,
    }));

    // Query 4: Mastery rows for those students and concepts (one grouped query)
    const masteries = await prisma.mastery.findMany({
      where: {
        userId: { in: studentIds },
        conceptId: { in: conceptIds },
      },
      select: {
        userId: true,
        conceptId: true,
        score: true,
        attempts: true,
      },
    });

    const mappedMastery = masteries.map((m) => ({
      studentId: m.userId,
      conceptId: m.conceptId,
      score: m.score,
      attempts: m.attempts,
    }));

    // Query 5: ENDED sessions and their AttendanceRecords in one grouped query
    const now = new Date();
    const sessions = await prisma.classSession.findMany({
      where: {
        courseId,
        OR: [
          { isActive: false },
          { windowEndsAt: { lte: now } },
        ],
      },
      include: {
        attendances: {
          where: {
            userId: { in: studentIds },
          },
          select: {
            userId: true,
            status: true,
          },
        },
      },
      orderBy: { sessionDate: 'asc' }, // oldest first
    });

    const totalEndedSessions = sessions.length;
    const studentPresentCounts = new Map<string, number>();

    const sessionsList: AnalyticsResult['sessions'] = [];

    for (const session of sessions) {
      let presentCount = 0;
      let flaggedCount = 0;

      for (const att of session.attendances) {
        if (att.status === 'PRESENT') {
          presentCount++;
          studentPresentCounts.set(att.userId, (studentPresentCounts.get(att.userId) || 0) + 1);
        } else if (att.status === 'FLAGGED') {
          flaggedCount++;
        }
      }

      // Absent = enrolled count minus present minus flagged
      const absentCount = Math.max(0, studentIds.length - presentCount - flaggedCount);

      sessionsList.push({
        id: session.id,
        date: session.sessionDate.toISOString(),
        present: presentCount,
        flagged: flaggedCount,
        absent: absentCount,
      });
    }

    // Per-student attendance rates
    const attendanceList = students.map((student) => {
      const present = studentPresentCounts.get(student.id) || 0;
      const rate = computeAttendanceRate(present, totalEndedSessions);
      return {
        studentId: student.id,
        rate,
        present,
        total: totalEndedSessions,
      };
    });

    // Pure logic aggregation
    const analytics = buildAnalytics({
      students,
      concepts: mappedConcepts,
      mastery: mappedMastery,
      attendance: attendanceList,
      sessions: sessionsList,
    });

    return {
      ...analytics,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generates CSV export for course analytics.
   */
  async exportCsv(courseId: string, teacherId: string, userRole: Role): Promise<string> {
    const analytics = await this.getCourseAnalytics(courseId, teacherId, userRole);

    // Columns: Student, Attendance %, Avg mastery %, Risk level, then one column per concept
    const header = [
      'Student',
      'Attendance %',
      'Avg mastery %',
      'Risk level',
      ...analytics.concepts.map((c) => c.name),
    ];

    const rows: string[][] = [header];

    for (const r of analytics.rows) {
      const attText =
        r.attendanceRate !== null ? `${Math.round(r.attendanceRate * 100)}%` : 'N/A';
      const avgMasteryText =
        r.avgMastery !== null ? `${Math.round(r.avgMastery * 100)}%` : 'N/A';

      const conceptCells = analytics.concepts.map((concept) => {
        const cell = r.cells.find((c) => c.conceptId === concept.id);
        if (!cell || cell.band === 'unassessed' || cell.score === null) {
          return ''; // empty when unassessed
        }
        return `${Math.round(cell.score * 100)}%`;
      });

      rows.push([
        r.name,
        attText,
        avgMasteryText,
        r.risk.level,
        ...conceptCells,
      ]);
    }

    return toCsv(rows);
  }

  async getSystemOverview() {
    const [totalUsers, totalCourses, totalSubmissions, totalAttendances] = await Promise.all([
      prisma.user.count(),
      prisma.course.count(),
      prisma.submission.count(),
      prisma.attendanceRecord.count(),
    ]);

    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: { _all: true },
    });

    return {
      totalUsers,
      totalCourses,
      totalSubmissions,
      totalAttendances,
      usersByRole,
    };
  }

  async getStudentAnalytics(userId: string) {
    const [attendances, submissions, masteries] = await Promise.all([
      prisma.attendanceRecord.findMany({ where: { userId } }),
      prisma.submission.findMany({
        where: { userId },
        include: { assessment: { select: { title: true, maxScore: true } } },
      }),
      prisma.masteryScore.findMany({ where: { userId } }),
    ]);

    const totalSessions = attendances.length;
    const presentCount = attendances.filter((a) => a.status === 'PRESENT').length;
    const attendanceRate = totalSessions > 0 ? (presentCount / totalSessions) * 100 : 0;

    const scoredSubmissions = submissions.filter((s) => s.score !== null);
    const averageGrade =
      scoredSubmissions.length > 0
        ? scoredSubmissions.reduce((acc, s) => acc + (s.score || 0), 0) / scoredSubmissions.length
        : 0;

    return {
      attendanceRate: Math.round(attendanceRate),
      totalSubmissions: submissions.length,
      averageGrade: Math.round(averageGrade),
      masteryBreakdown: masteries,
    };
  }
}

export const analyticsService = new AnalyticsService();
