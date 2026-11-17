import { prisma } from '../../lib/prisma.js';
import { Role } from '@prisma/client';
import { attendanceService } from '../attendance/attendance.service.js';
import { masteryService } from '../mastery/mastery.service.js';
import { recommend, ConceptInput, ResourceInput, Recommendation } from './recommend.js';
import { computeRisk, RiskResult } from './risk.js';

export interface UserAccountProfile {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  createdAt: Date;
  hasFaceEnrolled: boolean;
  faceDescriptor: undefined;
}

export interface StudentUnifiedProfile {
  student: { id: string; name: string; email?: string };
  course: { id: string; code?: string; title: string };
  attendance: any;
  concepts: any[];
  avgMastery: number | null;
  mastery?: {
    average: number | null;
    concepts: {
      id: string;
      conceptId?: string;
      name: string;
      score: number;
      attempts: number;
      prerequisiteId: string | null;
    }[];
  };
  assessments: {
    assessmentId: string;
    title: string;
    submittedAt: Date;
    awarded: number;
    max: number;
    percentage: number | null;
    pendingCount: number;
  }[];
  assessmentHistory?: {
    assessmentId: string;
    title: string;
    date: string;
    score: number;
    max: number;
    percentage: number;
  }[];
  assessmentAvg: number | null;
  risk: RiskResult;
  recommendations: Recommendation[];
  notAssessed: { id: string; name: string }[];
}

export class ProfileService {
  /**
   * Basic user account profile (GET /api/profile)
   */
  async getUserProfile(userId: string): Promise<UserAccountProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        faceDescriptor: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      ...user,
      hasFaceEnrolled: Boolean(user.faceDescriptor),
      faceDescriptor: undefined,
    };
  }

  async updateProfile(userId: string, data: { firstName?: string; lastName?: string }) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
      },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
      },
    });
  }

  async enrollFace(userId: string, descriptor: number[]) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        faceDescriptor: JSON.stringify(descriptor),
      },
    });
    return { success: true };
  }

  /**
   * Day 11 Unified Student Profile Overloads
   */
  getProfile(userId: string): Promise<UserAccountProfile>;
  getProfile(
    studentId: string,
    courseId: string,
    requesterId?: string,
    requesterRole?: Role
  ): Promise<StudentUnifiedProfile>;
  async getProfile(
    studentId: string,
    courseId?: string,
    requesterId?: string,
    requesterRole?: Role
  ): Promise<UserAccountProfile | StudentUnifiedProfile> {
    // If called with only 1 argument (userId), delegate to generic getUserProfile
    if (!courseId) {
      return this.getUserProfile(studentId);
    }

    // 1. Verify student enrollment in the course (404 if not enrolled)
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: studentId,
          courseId,
        },
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        course: { select: { id: true, code: true, title: true, teacherId: true } },
      },
    });

    if (!enrollment) {
      const err = new Error('Student is not enrolled in this course');
      (err as any).statusCode = 404;
      throw err;
    }

    // 2. Authorization check
    if (requesterId && requesterRole) {
      const isSelf = requesterId === studentId;
      const isTeacher = requesterRole === Role.TEACHER && enrollment.course.teacherId === requesterId;
      const isAdmin = requesterRole === Role.ADMIN;

      if (!isSelf && !isTeacher && !isAdmin) {
        const err = new Error('Unauthorized: You cannot access this profile');
        (err as any).statusCode = 403;
        throw err;
      }
    }

    // 3. Attendance: reuse Day 7 attendance service
    const attendance = await attendanceService.getMyCourseAttendance(studentId, courseId);

    // 4. Concepts: reuse Day 6/7 mastery query
    const concepts = await masteryService.getCourseMasteryForStudent(
      studentId,
      courseId,
      requesterId || studentId,
      requesterRole || Role.STUDENT
    );

    // 5. Average mastery across assessed concepts (attempts > 0)
    const assessedConcepts = concepts.filter((c) => c.attempts > 0);
    const avgMastery =
      assessedConcepts.length > 0
        ? assessedConcepts.reduce((acc, c) => acc + c.score, 0) / assessedConcepts.length
        : null;

    // 6. Assessments: per published assessment the student submitted in this course
    const submittedAssessments = await prisma.assessment.findMany({
      where: {
        courseId,
        published: true,
        submissions: {
          some: { userId: studentId },
        },
      },
      include: {
        submissions: {
          where: { userId: studentId },
          include: {
            grade: true,
            question: true,
          },
          orderBy: { submittedAt: 'asc' },
        },
      },
    });

    const assessmentItems = submittedAssessments.map((a) => {
      const studentSubs = a.submissions;
      const submittedAt = studentSubs[0]?.submittedAt ?? a.createdAt;

      let awarded = 0;
      let max = 0;
      let gradedCount = 0;
      let pendingCount = 0;

      for (const s of studentSubs) {
        if (s.grade) {
          gradedCount++;
          const finalScore = s.grade.finalMarks ?? s.grade.totalMarks;
          awarded += finalScore;
          max += s.question?.maxMarks ?? 0;
        } else {
          pendingCount++;
        }
      }

      const percentage =
        gradedCount > 0 && max > 0
          ? Math.round((awarded / max) * 100)
          : null;

      return {
        assessmentId: a.id,
        title: a.title,
        submittedAt,
        awarded,
        max,
        percentage,
        pendingCount,
      };
    });

    // Sort oldest first
    assessmentItems.sort(
      (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
    );

    // 7. Assessment Average
    // NOTE: assessmentAvg is shown for informational purposes only;
    // it is NOT an input to the risk calculation formula.
    const gradedPercentages = assessmentItems
      .map((a) => a.percentage)
      .filter((p): p is number => p !== null);

    const assessmentAvg =
      gradedPercentages.length > 0
        ? Math.round(
            gradedPercentages.reduce((acc, p) => acc + p, 0) / gradedPercentages.length
          )
        : null;

    // 8. Recommendations and notAssessed
    const resources = await prisma.resource.findMany({
      where: {
        conceptId: { in: concepts.map((c) => c.conceptId) },
      },
    });

    const mappedResources: ResourceInput[] = resources.map((r) => {
      let diff: 1 | 2 | 3 = 1;
      if (r.difficulty === 'INTERMEDIATE') diff = 2;
      if (r.difficulty === 'ADVANCED') diff = 3;
      return {
        id: r.id,
        conceptId: r.conceptId,
        title: r.title,
        type: r.type,
        difficulty: diff,
        url: r.url || '#',
      };
    });

    const conceptInputs: ConceptInput[] = concepts.map((c) => ({
      id: c.conceptId,
      name: c.name,
      score: c.score,
      attempts: c.attempts,
      prerequisiteId: c.prerequisiteId,
    }));

    const { recommendations, notAssessed } = recommend(conceptInputs, mappedResources);

    // 9. Risk calculation
    const risk = computeRisk({ attendanceRate: attendance.rate, avgMastery });

    const mappedConcepts = concepts.map((c: any) => ({
      id: c.conceptId || c.id,
      conceptId: c.conceptId || c.id,
      name: c.name,
      score: c.score,
      attempts: c.attempts,
      prerequisiteId: c.prerequisiteId,
    }));

    const mappedHistory = assessmentItems.map((a) => ({
      assessmentId: a.assessmentId,
      title: a.title,
      date: typeof a.submittedAt === 'string' ? a.submittedAt : (a.submittedAt?.toISOString ? a.submittedAt.toISOString() : String(a.submittedAt)),
      score: a.awarded,
      max: a.max,
      percentage: a.percentage ?? 0,
    }));

    return {
      student: {
        id: enrollment.user.id,
        name: `${enrollment.user.firstName} ${enrollment.user.lastName}`.trim(),
        email: enrollment.user.email,
      },
      course: {
        id: enrollment.course.id,
        code: enrollment.course.code || enrollment.course.title.split(' ')[0] || enrollment.course.id,
        title: enrollment.course.title,
      },
      attendance: {
        ...attendance,
        attended: attendance.present,
        total: attendance.totalSessions,
      },
      concepts,
      avgMastery,
      mastery: {
        average: avgMastery,
        concepts: mappedConcepts,
      },
      assessments: assessmentItems,
      assessmentHistory: mappedHistory,
      assessmentAvg,
      risk,
      recommendations,
      notAssessed,
    };
  }

  /**
   * Day 11 Recommendations Endpoint helper
   * GET /api/students/:id/recommendations?courseId=
   */
  async getRecommendations(
    studentId: string,
    courseId: string,
    requesterId: string,
    requesterRole: Role
  ) {
    const profile = await this.getProfile(
      studentId,
      courseId,
      requesterId,
      requesterRole
    );
    return {
      recommendations: profile.recommendations,
      notAssessed: profile.notAssessed,
    };
  }
}

export const profileService = new ProfileService();
