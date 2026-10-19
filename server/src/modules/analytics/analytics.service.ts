import { prisma } from '../../lib/prisma.js';

export class AnalyticsService {
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
