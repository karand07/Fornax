import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assessmentsService } from '../src/modules/assessments/assessments.service.js';
import { attendanceService } from '../src/modules/attendance/attendance.service.js';
import { prisma } from '../src/lib/prisma.js';
import { Role, QuestionType, AttendanceStatus } from '@prisma/client';

describe('Day 7: Server Tests', () => {
  describe('2.1 GET /api/assessments/:id/my-result', () => {
    it('masteryBefore equals default 0.5 when this assessment is the first graded activity for that concept', async () => {
      const originalAssessmentFindUnique = prisma.assessment.findUnique;
      const originalEnrollmentFindUnique = prisma.enrollment.findUnique;
      const originalSubmissionFindMany = prisma.submission.findMany;
      const originalMasteryFindUnique = prisma.mastery.findUnique;
      const originalGradeFindMany = prisma.grade.findMany;

      const assessmentId = 'assess-first';
      const studentId = 'student-1';
      const conceptId = 'concept-db-norm';

      (prisma.assessment.findUnique as any) = async () => ({
        id: assessmentId,
        courseId: 'course-1',
        questions: [
          {
            id: 'q1',
            assessmentId,
            conceptId,
            type: QuestionType.MCQ,
            prompt: 'Question 1',
            maxMarks: 10,
            options: ['A', 'B'],
            correctIndex: 1,
            modelAnswer: 'Because B',
            concept: { id: conceptId, title: 'Normalization' },
            rubrics: [],
          },
        ],
      });

      (prisma.enrollment.findUnique as any) = async () => ({
        userId: studentId,
        courseId: 'course-1',
      });

      (prisma.submission.findMany as any) = async () => [
        {
          id: 'sub-1',
          assessmentId,
          questionId: 'q1',
          userId: studentId,
          selectedIndex: 1,
          grade: {
            id: 'g1',
            totalMarks: 10,
            finalMarks: 10,
            confidence: 1.0,
            summary: 'Correct',
          },
        },
      ];

      (prisma.mastery.findUnique as any) = async () => ({
        userId: studentId,
        conceptId,
        score: 0.75,
      });

      // No prior grades exist for this student and concept
      (prisma.grade.findMany as any) = async (args: any) => {
        // Excludes current assessmentId
        assert.deepEqual(args.where.submission.assessmentId, { not: assessmentId });
        return [];
      };

      try {
        const result = await assessmentsService.getMyResult(assessmentId, studentId);

        assert.equal(result.summary.totalAwarded, 10);
        assert.equal(result.summary.totalMax, 10);
        assert.equal(result.summary.gradedCount, 1);
        assert.equal(result.summary.pendingCount, 0);
        assert.equal(result.summary.percentage, 100);

        assert.equal(result.concepts.length, 1);
        assert.equal(result.concepts[0].conceptId, conceptId);
        assert.equal(result.concepts[0].name, 'Normalization');
        assert.equal(result.concepts[0].awarded, 10);
        assert.equal(result.concepts[0].max, 10);
        assert.equal(result.concepts[0].masteryBefore, 0.5); // Default 0.5!
        assert.equal(result.concepts[0].masteryAfter, 0.75);

        assert.equal(result.questions[0].conceptName, 'Normalization');
        assert.equal(result.questions[0].status, 'GRADED');
        assert.deepEqual(result.questions[0].grade, {
          marks: 10,
          confidence: 1.0,
          summary: 'Correct',
        });
      } finally {
        prisma.assessment.findUnique = originalAssessmentFindUnique;
        prisma.enrollment.findUnique = originalEnrollmentFindUnique;
        prisma.submission.findMany = originalSubmissionFindMany;
        prisma.mastery.findUnique = originalMasteryFindUnique;
        prisma.grade.findMany = originalGradeFindMany;
      }
    });

    it('masteryBefore ignores submissions from current assessment and includes earlier ones', async () => {
      const originalAssessmentFindUnique = prisma.assessment.findUnique;
      const originalEnrollmentFindUnique = prisma.enrollment.findUnique;
      const originalSubmissionFindMany = prisma.submission.findMany;
      const originalMasteryFindUnique = prisma.mastery.findUnique;
      const originalGradeFindMany = prisma.grade.findMany;

      const currentAssessmentId = 'assess-2';
      const earlierAssessmentId = 'assess-1';
      const studentId = 'student-1';
      const conceptId = 'concept-db-norm';

      (prisma.assessment.findUnique as any) = async () => ({
        id: currentAssessmentId,
        courseId: 'course-1',
        questions: [
          {
            id: 'q2',
            assessmentId: currentAssessmentId,
            conceptId,
            type: QuestionType.MCQ,
            prompt: 'Question 2',
            maxMarks: 10,
            options: ['A', 'B'],
            correctIndex: 0,
            modelAnswer: 'Because A',
            concept: { id: conceptId, title: 'Normalization' },
            rubrics: [],
          },
        ],
      });

      (prisma.enrollment.findUnique as any) = async () => ({
        userId: studentId,
        courseId: 'course-1',
      });

      // Submissions for current assessment
      (prisma.submission.findMany as any) = async () => [
        {
          id: 'sub-2',
          assessmentId: currentAssessmentId,
          questionId: 'q2',
          userId: studentId,
          selectedIndex: 0,
          grade: {
            id: 'g2',
            totalMarks: 10,
            finalMarks: 10,
            confidence: 1.0,
            summary: 'Correct',
          },
        },
      ];

      (prisma.mastery.findUnique as any) = async () => ({
        userId: studentId,
        conceptId,
        score: 0.875,
      });

      // Mock prior grades: only returns grade from earlierAssessmentId
      (prisma.grade.findMany as any) = async (args: any) => {
        assert.deepEqual(args.where.submission.assessmentId, { not: currentAssessmentId });
        return [
          {
            id: 'g1',
            totalMarks: 10,
            finalMarks: 10,
            submission: {
              id: 'sub-1',
              assessmentId: earlierAssessmentId,
              createdAt: new Date('2026-10-01T10:00:00Z'),
              question: {
                maxMarks: 10,
                conceptId,
              },
            },
          },
        ];
      };

      try {
        const result = await assessmentsService.getMyResult(currentAssessmentId, studentId);

        // Earlier item: ratio 1.0 -> computeMastery([{ ratio: 1.0 }]) = 0.75
        assert.equal(result.concepts[0].masteryBefore, 0.75);
        assert.equal(result.concepts[0].masteryAfter, 0.875);
      } finally {
        prisma.assessment.findUnique = originalAssessmentFindUnique;
        prisma.enrollment.findUnique = originalEnrollmentFindUnique;
        prisma.submission.findMany = originalSubmissionFindMany;
        prisma.mastery.findUnique = originalMasteryFindUnique;
        prisma.grade.findMany = originalGradeFindMany;
      }
    });

    it('my-result returns 403 before student submits and never includes correctIndex in pre-submit path', async () => {
      const originalAssessmentFindUnique = prisma.assessment.findUnique;
      const originalEnrollmentFindUnique = prisma.enrollment.findUnique;
      const originalSubmissionFindMany = prisma.submission.findMany;
      const originalSubmissionFindFirst = prisma.submission.findFirst;

      const assessmentId = 'assess-presubmit';
      const studentId = 'student-1';

      (prisma.assessment.findUnique as any) = async () => ({
        id: assessmentId,
        courseId: 'course-1',
        published: true,
        course: { teacherId: 'teacher-1' },
        questions: [
          {
            id: 'q1',
            assessmentId,
            type: QuestionType.MCQ,
            prompt: 'What is 1+1?',
            options: ['1', '2'],
            correctIndex: 1,
            modelAnswer: '2 is correct',
            concept: { id: 'c1', title: 'Math' },
            rubrics: [],
          },
        ],
      });

      (prisma.enrollment.findUnique as any) = async () => ({
        userId: studentId,
        courseId: 'course-1',
      });

      // No submissions -> student has NOT submitted
      (prisma.submission.findMany as any) = async () => [];
      (prisma.submission.findFirst as any) = async () => null;

      try {
        // Calling my-result before submit returns 403
        await assert.rejects(
          async () => {
            await assessmentsService.getMyResult(assessmentId, studentId);
          },
          (err: any) => {
            assert.equal(err.statusCode, 403);
            assert.match(err.message, /not submitted/i);
            return true;
          }
        );

        // Pre-submit path: student viewing assessment details before submitting
        const studentView = await assessmentsService.getAssessmentById(
          assessmentId,
          studentId,
          Role.STUDENT
        );

        // correctIndex and modelAnswer must NOT be present
        for (const q of studentView.questions) {
          assert.equal((q as any).correctIndex, undefined);
          assert.equal((q as any).modelAnswer, undefined);
        }
      } finally {
        prisma.assessment.findUnique = originalAssessmentFindUnique;
        prisma.enrollment.findUnique = originalEnrollmentFindUnique;
        prisma.submission.findMany = originalSubmissionFindMany;
        prisma.submission.findFirst = originalSubmissionFindFirst;
      }
    });
  });

  describe('2.2 GET /api/attendance/me', () => {
    it('attendance rate: 0 ended sessions gives null; FLAGGED does not count as present; missing record counts as absent; active session is excluded', async () => {
      const originalEnrollmentFindUnique = prisma.enrollment.findUnique;
      const originalClassSessionFindMany = prisma.classSession.findMany;

      const studentId = 'student-att-1';
      const courseId = 'course-att-1';

      (prisma.enrollment.findUnique as any) = async () => ({
        userId: studentId,
        courseId,
      });

      // Case 1: 0 ended sessions -> rate: null
      (prisma.classSession.findMany as any) = async () => [];
      const res0 = await attendanceService.getMyCourseAttendance(studentId, courseId);
      assert.equal(res0.totalSessions, 0);
      assert.equal(res0.rate, null);
      assert.equal(res0.present, 0);
      assert.equal(res0.absent, 0);
      assert.equal(res0.flagged, 0);
      assert.deepEqual(res0.history, []);

      // Case 2: Mix of sessions:
      // Session 1: Ended, status PRESENT
      // Session 2: Ended, status FLAGGED (must not count as present)
      // Session 3: Ended, no attendance record (must count as absent)
      // Session 4: Active session (isActive: true, windowEndsAt: null) -> MUST BE EXCLUDED
      // Session 5: Ended, status ABSENT
      const mockSessions = [
        {
          id: 's1',
          courseId,
          sessionDate: new Date('2026-10-05T09:00:00Z'),
          isActive: false,
          windowEndsAt: new Date('2026-10-05T09:30:00Z'),
          attendances: [{ status: AttendanceStatus.PRESENT }],
        },
        {
          id: 's2',
          courseId,
          sessionDate: new Date('2026-10-04T09:00:00Z'),
          isActive: false,
          windowEndsAt: new Date('2026-10-04T09:30:00Z'),
          attendances: [{ status: AttendanceStatus.FLAGGED }],
        },
        {
          id: 's3',
          courseId,
          sessionDate: new Date('2026-10-03T09:00:00Z'),
          isActive: false,
          windowEndsAt: new Date('2026-10-03T09:30:00Z'),
          attendances: [], // No record -> counts as absent!
        },
        {
          id: 's4-active',
          courseId,
          sessionDate: new Date('2026-10-06T09:00:00Z'),
          isActive: true,
          windowEndsAt: null, // Active (not ended) -> MUST BE EXCLUDED!
          attendances: [{ status: AttendanceStatus.PRESENT }],
        },
        {
          id: 's5',
          courseId,
          sessionDate: new Date('2026-10-02T09:00:00Z'),
          isActive: false,
          windowEndsAt: new Date('2026-10-02T09:30:00Z'),
          attendances: [{ status: AttendanceStatus.ABSENT }],
        },
      ];

      (prisma.classSession.findMany as any) = async () => mockSessions;

      try {
        const res = await attendanceService.getMyCourseAttendance(studentId, courseId);

        // 4 ended sessions (s1, s2, s3, s5). s4-active was excluded!
        assert.equal(res.totalSessions, 4);
        assert.equal(res.present, 1); // s1 only
        assert.equal(res.flagged, 1); // s2
        assert.equal(res.absent, 2); // s3 (no record) + s5 (ABSENT)
        // rate = present / totalSessions = 1 / 4 = 0.25
        assert.equal(res.rate, 0.25);

        // Check history: newest first, 4 items
        assert.equal(res.history.length, 4);
        assert.equal(res.history[0].sessionId, 's1');
        assert.equal(res.history[0].status, AttendanceStatus.PRESENT);
        assert.equal(res.history[1].sessionId, 's2');
        assert.equal(res.history[1].status, AttendanceStatus.FLAGGED);
        assert.equal(res.history[2].sessionId, 's3');
        assert.equal(res.history[2].status, AttendanceStatus.ABSENT); // missing record -> ABSENT
        assert.equal(res.history[3].sessionId, 's5');
        assert.equal(res.history[3].status, AttendanceStatus.ABSENT);
      } finally {
        prisma.enrollment.findUnique = originalEnrollmentFindUnique;
        prisma.classSession.findMany = originalClassSessionFindMany;
      }
    });
  });

  describe('2.3 GET /api/students/:id/mastery?courseId=', () => {
    it('returns lastUpdated per concept and prerequisiteName', async () => {
      const originalCourseFindUnique = prisma.course.findUnique;
      const originalMasteryFindMany = prisma.mastery.findMany;

      const studentId = 'student-1';
      const courseId = 'course-1';
      const conceptId1 = 'c1';
      const conceptId2 = 'c2';
      const updatedAtDate = new Date('2026-10-20T12:00:00Z');

      (prisma.course.findUnique as any) = async () => ({
        id: courseId,
        teacherId: 'teacher-1',
        concepts: [
          {
            id: conceptId1,
            title: 'Concept 1',
            order: 1,
            prerequisites: [],
          },
          {
            id: conceptId2,
            title: 'Concept 2',
            order: 2,
            prerequisites: [
              {
                prerequisiteId: conceptId1,
                prerequisite: {
                  title: 'Concept 1',
                },
              },
            ],
          },
        ],
      });

      (prisma.mastery.findMany as any) = async () => [
        {
          userId: studentId,
          conceptId: conceptId1,
          score: 0.8,
          attempts: 2,
          updatedAt: updatedAtDate,
        },
        // Concept 2 has no mastery row yet
      ];

      try {
        const { masteryService } = await import('../src/modules/mastery/mastery.service.js');
        const data = await masteryService.getCourseMasteryForStudent(
          studentId,
          courseId,
          studentId,
          Role.STUDENT
        );

        assert.equal(data.length, 2);

        // Concept 1
        assert.equal(data[0].conceptId, conceptId1);
        assert.equal(data[0].score, 0.8);
        assert.equal(data[0].attempts, 2);
        assert.equal(data[0].prerequisiteName, null);
        assert.deepEqual(data[0].lastUpdated, updatedAtDate);

        // Concept 2
        assert.equal(data[1].conceptId, conceptId2);
        assert.equal(data[1].score, 0.5);
        assert.equal(data[1].attempts, 0);
        assert.equal(data[1].prerequisiteName, 'Concept 1');
        assert.equal(data[1].lastUpdated, null);
      } finally {
        prisma.course.findUnique = originalCourseFindUnique;
        prisma.mastery.findMany = originalMasteryFindMany;
      }
    });
  });
});
