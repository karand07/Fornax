import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assessmentsService } from '../src/modules/assessments/assessments.service.js';
import { gradingService } from '../src/modules/grading/grading.service.js';
import { prisma } from '../src/lib/prisma.js';
import { Role, QuestionType } from '@prisma/client';

describe('Day 9: Server Tests', () => {
  describe('2.1 Student GET /api/assessments/:id/my-result', () => {
    it('student my-result contains criteria and confidenceLevel but not confidence, modelVersion, or notes', async () => {
      const originalAssessmentFindUnique = prisma.assessment.findUnique;
      const originalEnrollmentFindUnique = prisma.enrollment.findUnique;
      const originalSubmissionFindMany = prisma.submission.findMany;
      const originalMasteryFindUnique = prisma.mastery.findUnique;
      const originalGradeFindMany = prisma.grade.findMany;

      const assessmentId = 'assess-day9';
      const studentId = 'student-day9';
      const conceptId = 'concept-db-acid';

      (prisma.assessment.findUnique as any) = async () => ({
        id: assessmentId,
        courseId: 'course-1',
        questions: [
          {
            id: 'q-short-1',
            assessmentId,
            conceptId,
            type: QuestionType.SHORT,
            prompt: 'Explain ACID properties in relational databases.',
            maxMarks: 10,
            options: [],
            correctIndex: null,
            modelAnswer: 'ACID stands for Atomicity, Consistency, Isolation, Durability.',
            concept: { id: conceptId, title: 'Transactions' },
            rubrics: [
              { id: 'r1', questionId: 'q-short-1', description: 'Defines Atomicity', marks: 2.5, createdAt: new Date() },
              { id: 'r2', questionId: 'q-short-1', description: 'Defines Consistency', marks: 2.5, createdAt: new Date() },
              { id: 'r3', questionId: 'q-short-1', description: 'Defines Isolation', marks: 2.5, createdAt: new Date() },
              { id: 'r4', questionId: 'q-short-1', description: 'Defines Durability', marks: 2.5, createdAt: new Date() },
            ],
          },
        ],
      });

      (prisma.enrollment.findUnique as any) = async () => ({
        userId: studentId,
        courseId: 'course-1',
      });

      (prisma.submission.findMany as any) = async () => [
        {
          id: 'sub-short-1',
          assessmentId,
          questionId: 'q-short-1',
          userId: studentId,
          answerText: 'Atomicity means all or nothing. Durability means data persists.',
          feedback: JSON.stringify({
            criteria: [
              { criterionId: 'r1', awarded: 2.5, justification: 'Clear definition', evidenceSpan: 'Atomicity means all or nothing' },
              { criterionId: 'r2', awarded: 0, justification: 'Not mentioned', evidenceSpan: null },
              { criterionId: 'r3', awarded: 0, justification: 'Not mentioned', evidenceSpan: null },
              { criterionId: 'r4', awarded: 2.5, justification: 'Durability noted', evidenceSpan: 'Durability means data persists' },
            ],
            modelVersion: 'claude-3-5-sonnet',
            notes: 'Internal grader note: check consistency next time',
          }),
          grade: {
            id: 'g-short-1',
            totalMarks: 5,
            finalMarks: 5,
            confidence: 0.85,
            needsReview: false,
            summary: 'Partial answer explaining atomicity and durability.',
            missingPoints: ['Missing Consistency', 'Missing Isolation'],
          },
        },
      ];

      (prisma.mastery.findUnique as any) = async () => ({
        userId: studentId,
        conceptId,
        score: 0.7,
      });

      (prisma.grade.findMany as any) = async () => [];

      try {
        const result = await assessmentsService.getMyResult(assessmentId, studentId);
        assert.equal(result.questions.length, 1);
        const qResult = result.questions[0];

        assert.equal(qResult.type, 'SHORT');
        assert.ok(qResult.grade, 'Grade should be present');

        const g = qResult.grade as any;
        // Verify confidenceLevel is present, but raw confidence, modelVersion, and notes are NOT returned
        assert.equal(g.confidenceLevel, 'HIGH');
        assert.equal(g.confidence, undefined, 'raw confidence must not be returned to students');
        assert.equal(g.modelVersion, undefined, 'modelVersion must not be returned to students');
        assert.equal(g.notes, undefined, 'internal notes must not be returned to students');

        // Verify criteria breakdown
        assert.equal(g.criteria.length, 4);
        assert.equal(g.criteria[0].criterionId, 'r1');
        assert.equal(g.criteria[0].description, 'Defines Atomicity');
        assert.equal(g.criteria[0].maxMarks, 2.5);
        assert.equal(g.criteria[0].awarded, 2.5);
        assert.equal(g.criteria[0].evidenceSpan, 'Atomicity means all or nothing');

        // Verify missing points and summary
        assert.deepEqual(g.missingPoints, ['Missing Consistency', 'Missing Isolation']);
        assert.equal(g.summary, 'Partial answer explaining atomicity and durability.');
      } finally {
        prisma.assessment.findUnique = originalAssessmentFindUnique;
        prisma.enrollment.findUnique = originalEnrollmentFindUnique;
        prisma.submission.findMany = originalSubmissionFindMany;
        prisma.mastery.findUnique = originalMasteryFindUnique;
        prisma.grade.findMany = originalGradeFindMany;
      }
    });

    it('provisional is true only when needsReview and not overridden', async () => {
      const originalAssessmentFindUnique = prisma.assessment.findUnique;
      const originalEnrollmentFindUnique = prisma.enrollment.findUnique;
      const originalSubmissionFindMany = prisma.submission.findMany;
      const originalMasteryFindUnique = prisma.mastery.findUnique;
      const originalGradeFindMany = prisma.grade.findMany;

      const assessmentId = 'assess-provisional';
      const studentId = 'student-prov';
      const conceptId = 'c1';

      (prisma.assessment.findUnique as any) = async () => ({
        id: assessmentId,
        courseId: 'course-1',
        questions: [
          {
            id: 'q1',
            assessmentId,
            conceptId,
            type: QuestionType.SHORT,
            prompt: 'Short Q',
            maxMarks: 10,
            options: [],
            concept: { id: conceptId, title: 'Concept 1' },
            rubrics: [],
          },
        ],
      });

      (prisma.enrollment.findUnique as any) = async () => ({
        userId: studentId,
        courseId: 'course-1',
      });

      // Case 1: needsReview=true, not overridden -> provisional=true
      (prisma.submission.findMany as any) = async () => [
        {
          id: 'sub-1',
          assessmentId,
          questionId: 'q1',
          userId: studentId,
          answerText: 'Some ambiguous answer',
          feedback: null,
          grade: {
            id: 'g1',
            totalMarks: 4,
            finalMarks: null,
            confidence: 0.5, // LOW
            needsReview: true,
            summary: 'Review needed',
            missingPoints: [],
          },
        },
      ];

      (prisma.mastery.findUnique as any) = async () => ({ userId: studentId, conceptId, score: 0.5 });
      (prisma.grade.findMany as any) = async () => [];

      try {
        const res1 = await assessmentsService.getMyResult(assessmentId, studentId);
        const g1 = res1.questions[0].grade as any;
        assert.equal(g1.provisional, true, 'provisional should be true when needsReview and not overridden');
        assert.equal(g1.overridden, false);
        assert.equal(g1.confidenceLevel, 'LOW');

        // Case 2: needsReview=true, but overridden by teacher (finalMarks set) -> provisional=false, overridden=true
        (prisma.submission.findMany as any) = async () => [
          {
            id: 'sub-1',
            assessmentId,
            questionId: 'q1',
            userId: studentId,
            answerText: 'Some ambiguous answer',
            feedback: JSON.stringify({ overriddenBy: 'teacher-id-1' }),
            grade: {
              id: 'g1',
              totalMarks: 4,
              finalMarks: 8,
              confidence: 0.5,
              needsReview: true,
              summary: 'Teacher reviewed',
              missingPoints: [],
            },
          },
        ];

        const res2 = await assessmentsService.getMyResult(assessmentId, studentId);
        const g2 = res2.questions[0].grade as any;
        assert.equal(g2.provisional, false, 'provisional should be false when overridden');
        assert.equal(g2.overridden, true);
        assert.equal(g2.autoMarks, 4);
        assert.equal(g2.finalMarks, 8);
      } finally {
        prisma.assessment.findUnique = originalAssessmentFindUnique;
        prisma.enrollment.findUnique = originalEnrollmentFindUnique;
        prisma.submission.findMany = originalSubmissionFindMany;
        prisma.mastery.findUnique = originalMasteryFindUnique;
        prisma.grade.findMany = originalGradeFindMany;
      }
    });

    it('totals use finalMarks when set', async () => {
      const originalAssessmentFindUnique = prisma.assessment.findUnique;
      const originalEnrollmentFindUnique = prisma.enrollment.findUnique;
      const originalSubmissionFindMany = prisma.submission.findMany;
      const originalMasteryFindUnique = prisma.mastery.findUnique;
      const originalGradeFindMany = prisma.grade.findMany;

      const assessmentId = 'assess-totals';
      const studentId = 'student-tot';
      const conceptId = 'c1';

      (prisma.assessment.findUnique as any) = async () => ({
        id: assessmentId,
        courseId: 'course-1',
        questions: [
          {
            id: 'q1',
            assessmentId,
            conceptId,
            type: QuestionType.SHORT,
            prompt: 'Short Q1',
            maxMarks: 10,
            options: [],
            concept: { id: conceptId, title: 'Concept 1' },
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
          answerText: 'Answer',
          grade: {
            id: 'g1',
            totalMarks: 3,
            finalMarks: 9, // overridden to 9
            confidence: 0.9,
            needsReview: false,
            summary: 'Updated by teacher',
            missingPoints: [],
          },
        },
      ];

      (prisma.mastery.findUnique as any) = async () => ({ userId: studentId, conceptId, score: 0.8 });
      (prisma.grade.findMany as any) = async () => [];

      try {
        const res = await assessmentsService.getMyResult(assessmentId, studentId);
        // summary totalAwarded must use finalMarks (9) instead of totalMarks (3)
        assert.equal(res.summary.totalAwarded, 9);
        assert.equal(res.summary.totalMax, 10);
        assert.equal(res.summary.percentage, 90);
        assert.equal(res.questions[0].marksObtained, 9);
      } finally {
        prisma.assessment.findUnique = originalAssessmentFindUnique;
        prisma.enrollment.findUnique = originalEnrollmentFindUnique;
        prisma.submission.findMany = originalSubmissionFindMany;
        prisma.mastery.findUnique = originalMasteryFindUnique;
        prisma.grade.findMany = originalGradeFindMany;
      }
    });
  });

  describe('2.2 Teacher GET /api/grading/submissions/:id', () => {
    it('returns raw confidence, modelVersion, needsReview, overriddenBy, finalMarks, and criteria with descriptions', async () => {
      const originalSubmissionFindUnique = prisma.submission.findUnique;

      (prisma.submission.findUnique as any) = async () => ({
        id: 'sub-teacher-view',
        assessmentId: 'a1',
        questionId: 'q1',
        userId: 'student-1',
        answerText: 'A database index speeds up search queries.',
        submittedAt: new Date(),
        gradedAt: new Date(),
        assessment: {
          id: 'a1',
          title: 'Database Exam',
          course: { id: 'c1', teacherId: 'teacher-1' },
        },
        user: {
          id: 'student-1',
          firstName: 'Alice',
          lastName: 'Smith',
          email: 'alice@example.com',
        },
        question: {
          id: 'q1',
          prompt: 'What is an index?',
          maxMarks: 5,
          type: 'SHORT',
          rubrics: [
            { id: 'r1', description: 'Explains query speedup', marks: 5, createdAt: new Date() },
          ],
        },
        feedback: JSON.stringify({
          modelVersion: 'claude-3-5-sonnet',
          notes: 'Strong understanding',
          overriddenBy: null,
          criteria: [
            { criterionId: 'r1', awarded: 5, justification: 'Accurate description', evidenceSpan: 'speeds up search queries' },
          ],
        }),
        grade: {
          id: 'g1',
          totalMarks: 5,
          finalMarks: 5,
          confidence: 0.92,
          needsReview: false,
          summary: 'Excellent explanation',
          missingPoints: [],
        },
      });

      try {
        const res = await gradingService.getSubmissionById('sub-teacher-view', 'teacher-1', Role.TEACHER);

        assert.equal(res.id, 'sub-teacher-view');
        assert.equal(res.student.email, 'alice@example.com');
        assert.ok(res.grade, 'Grade should be present');
        assert.equal(res.grade.confidence, 0.92, 'Teacher variant gets raw confidence');
        assert.equal(res.grade.modelVersion, 'claude-3-5-sonnet', 'Teacher variant gets modelVersion');
        assert.equal(res.grade.needsReview, false);
        assert.equal(res.grade.overriddenBy, null);
        assert.equal(res.grade.finalMarks, 5);
        assert.equal(res.grade.criteria.length, 1);
        assert.equal(res.grade.criteria[0].description, 'Explains query speedup');
        assert.equal(res.grade.criteria[0].maxMarks, 5);
        assert.equal(res.grade.criteria[0].awarded, 5);
        assert.equal(res.grade.notes, 'Strong understanding');
      } finally {
        prisma.submission.findUnique = originalSubmissionFindUnique;
      }
    });
  });
});

