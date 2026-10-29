import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeMastery } from '../src/lib/mastery.js';
import { masteryService } from '../src/modules/mastery/mastery.service.js';
import { assessmentsService } from '../src/modules/assessments/assessments.service.js';
import { assessmentsController } from '../src/modules/assessments/assessments.controller.js';
import { prisma } from '../src/lib/prisma.js';
import { Role, QuestionType } from '@prisma/client';
import { Request, Response } from 'express';

describe('Day 6: Pure Mastery Computation (lib/mastery.ts)', () => {
  it('no items -> 0.5, attempts 0', () => {
    const res = computeMastery([]);
    assert.equal(res.score, 0.5);
    assert.equal(res.attempts, 0);
  });

  it('one perfect item -> 0.75', () => {
    const res = computeMastery([{ ratio: 1.0 }]);
    assert.equal(res.score, 0.75);
    assert.equal(res.attempts, 1);
  });

  it('one zero item -> 0.25', () => {
    const res = computeMastery([{ ratio: 0.0 }]);
    assert.equal(res.score, 0.25);
    assert.equal(res.attempts, 1);
  });

  it('four perfect items -> step by step values leading to 0.9563', () => {
    // 1 item: (1 - 0.5)*0.5 + 0.5*1 = 0.75
    const res1 = computeMastery([{ ratio: 1.0 }]);
    assert.equal(res1.score, 0.75);

    // 2 items: (1 - 0.5)*0.75 + 0.5*1 = 0.875
    const res2 = computeMastery([{ ratio: 1.0 }, { ratio: 1.0 }]);
    assert.equal(res2.score, 0.875);

    // 3 items: (1 - 0.5)*0.875 + 0.5*1 = 0.9375
    const res3 = computeMastery([{ ratio: 1.0 }, { ratio: 1.0 }, { ratio: 1.0 }]);
    assert.equal(res3.score, 0.9375);

    // 4 items: attempts is 3 -> alpha = 0.3 -> (1 - 0.3)*0.9375 + 0.3*1 = 0.65625 + 0.3 = 0.95625 -> 0.9563
    const res4 = computeMastery([
      { ratio: 1.0 },
      { ratio: 1.0 },
      { ratio: 1.0 },
      { ratio: 1.0 },
    ]);
    assert.equal(res4.score, 0.9563);
    assert.equal(res4.attempts, 4);
  });

  it('ratio outside 0..1 is clamped', () => {
    const belowZero = computeMastery([{ ratio: -0.5 }]);
    assert.equal(belowZero.score, 0.25); // Clamped to 0.0 -> same as 0.0

    const aboveOne = computeMastery([{ ratio: 1.8 }]);
    assert.equal(aboveOne.score, 0.75); // Clamped to 1.0 -> same as 1.0
  });
});

describe('Day 6: Mastery Service recomputeMastery', () => {
  it('recomputeMastery is idempotent and uses finalMarks when present', async () => {
    const studentId = 'test-student-mastery';
    const conceptId = 'test-concept-mastery';

    const originalFindMany = prisma.grade.findMany;
    const originalUpsert = prisma.mastery.upsert;

    // Simulate 2 question grades:
    // Question 1: maxMarks 10, totalMarks 5, finalMarks overridden to 10 (ratio 1.0)
    // Question 2: maxMarks 10, totalMarks 0, finalMarks null (ratio 0.0)
    const mockGrades = [
      {
        id: 'g1',
        totalMarks: 5,
        finalMarks: 10, // Override!
        submission: {
          createdAt: new Date('2026-10-01T10:00:00Z'),
          question: { maxMarks: 10, conceptId },
        },
      },
      {
        id: 'g2',
        totalMarks: 0,
        finalMarks: null,
        submission: {
          createdAt: new Date('2026-10-01T11:00:00Z'),
          question: { maxMarks: 10, conceptId },
        },
      },
    ];

    (prisma.grade.findMany as any) = async () => mockGrades;

    let upsertedData: any = null;
    (prisma.mastery.upsert as any) = async (args: any) => {
      upsertedData = args;
      return { id: 'm1', ...args.create };
    };

    try {
      // Call 1
      const res1 = await masteryService.recomputeMastery(studentId, conceptId);
      // Item 1: ratio 1.0 -> score 0.75
      // Item 2: ratio 0.0 -> score = (1 - 0.5)*0.75 + 0.5*0 = 0.375
      assert.equal(res1.score, 0.375);
      assert.equal(res1.attempts, 2);

      // Call 2 (Idempotency check)
      const res2 = await masteryService.recomputeMastery(studentId, conceptId);
      assert.equal(res2.score, res1.score);
      assert.equal(res2.attempts, res1.attempts);
    } finally {
      prisma.grade.findMany = originalFindMany;
      prisma.mastery.upsert = originalUpsert;
    }
  });
});

describe('Day 6: Assessments & Submissions Service Tests', () => {
  const teacherId = 'teacher-uuid-1';
  const studentId = 'student-uuid-1';
  const courseId = 'course-uuid-1';
  const conceptId = 'concept-uuid-1';
  const assessmentId = 'assessment-uuid-1';

  const mcqQuestion = {
    id: 'q-mcq-1',
    assessmentId,
    conceptId,
    type: QuestionType.MCQ,
    prompt: 'What is 2+2?',
    maxMarks: 5,
    options: ['3', '4', '5'],
    correctIndex: 1, // '4'
    modelAnswer: '2+2 equals 4',
  };

  const shortQuestion = {
    id: 'q-short-1',
    assessmentId,
    conceptId,
    type: QuestionType.SHORT,
    prompt: 'Explain 3NF normalization.',
    maxMarks: 10,
    modelAnswer: '3NF removes transitive dependencies.',
    options: [],
    correctIndex: null,
  };

  const mockAssessment = {
    id: assessmentId,
    courseId,
    title: 'Test Quiz',
    published: true,
    course: { id: courseId, teacherId },
    questions: [mcqQuestion, shortQuestion],
  };

  it('MCQ correct gives full marks, wrong gives 0', async () => {
    const originalAssessmentFindUnique = prisma.assessment.findUnique;
    const originalEnrollmentFindUnique = prisma.enrollment.findUnique;
    const originalSubmissionFindFirst = prisma.submission.findFirst;
    const originalTransaction = prisma.$transaction;

    (prisma.assessment.findUnique as any) = async () => mockAssessment;
    (prisma.enrollment.findUnique as any) = async () => ({ id: 'enr-1', userId: studentId, courseId });
    (prisma.submission.findFirst as any) = async () => null;

    let createdGrades: any[] = [];
    (prisma.$transaction as any) = async (cb: any) => {
      const tx = {
        submission: {
          create: async (args: any) => ({ id: 'sub-' + args.data.questionId, ...args.data }),
        },
        grade: {
          create: async (args: any) => {
            createdGrades.push(args.data);
            return { id: 'grade-1', ...args.data };
          },
          findMany: async () => [
            {
              totalMarks: createdGrades[0]?.totalMarks ?? 5,
              finalMarks: null,
              submission: { question: { maxMarks: 5, conceptId } },
            },
          ],
        },
        mastery: {
          upsert: async () => ({ id: 'm-1' }),
        },
      };
      return cb(tx);
    };

    try {
      // Answer MCQ correctly (index 1)
      const res = await assessmentsService.submitAssessment(assessmentId, studentId, [
        { questionId: 'q-mcq-1', selectedIndex: 1 },
      ]);
      assert.equal(res.mcqScore, 5);
      assert.equal(res.mcqMax, 5);
      assert.equal(createdGrades[0].totalMarks, 5);

      // Now answer MCQ incorrectly (index 0)
      createdGrades = [];
      const resWrong = await assessmentsService.submitAssessment(assessmentId, studentId, [
        { questionId: 'q-mcq-1', selectedIndex: 0 },
      ]);
      assert.equal(resWrong.mcqScore, 0);
      assert.equal(createdGrades[0].totalMarks, 0);
    } finally {
      prisma.assessment.findUnique = originalAssessmentFindUnique;
      prisma.enrollment.findUnique = originalEnrollmentFindUnique;
      prisma.submission.findFirst = originalSubmissionFindFirst;
      prisma.$transaction = originalTransaction;
    }
  });

  it('second submit returns 409', async () => {
    const originalAssessmentFindUnique = prisma.assessment.findUnique;
    const originalEnrollmentFindUnique = prisma.enrollment.findUnique;
    const originalSubmissionFindFirst = prisma.submission.findFirst;

    (prisma.assessment.findUnique as any) = async () => mockAssessment;
    (prisma.enrollment.findUnique as any) = async () => ({ id: 'enr-1' });
    // Already has existing submission
    (prisma.submission.findFirst as any) = async () => ({ id: 'existing-sub' });

    try {
      await assert.rejects(
        async () => {
          await assessmentsService.submitAssessment(assessmentId, studentId, []);
        },
        (err: any) => {
          assert.equal(err.statusCode, 409);
          assert.match(err.message, /already submitted/i);
          return true;
        }
      );
    } finally {
      prisma.assessment.findUnique = originalAssessmentFindUnique;
      prisma.enrollment.findUnique = originalEnrollmentFindUnique;
      prisma.submission.findFirst = originalSubmissionFindFirst;
    }
  });

  it('SHORT creates no Grade and does not change mastery', async () => {
    const originalAssessmentFindUnique = prisma.assessment.findUnique;
    const originalEnrollmentFindUnique = prisma.enrollment.findUnique;
    const originalSubmissionFindFirst = prisma.submission.findFirst;
    const originalTransaction = prisma.$transaction;

    (prisma.assessment.findUnique as any) = async () => ({
      ...mockAssessment,
      questions: [shortQuestion], // only SHORT
    });
    (prisma.enrollment.findUnique as any) = async () => ({ id: 'enr-1' });
    (prisma.submission.findFirst as any) = async () => null;

    let gradeCreated = false;
    let masteryRecomputed = false;

    (prisma.$transaction as any) = async (cb: any) => {
      const tx = {
        submission: {
          create: async (args: any) => ({ id: 'sub-short', ...args.data }),
        },
        grade: {
          create: async () => {
            gradeCreated = true;
          },
        },
        mastery: {
          upsert: async () => {
            masteryRecomputed = true;
          },
        },
      };
      return cb(tx);
    };

    try {
      const res = await assessmentsService.submitAssessment(assessmentId, studentId, [
        { questionId: 'q-short-1', answerText: 'Transitive dependencies removed.' },
      ]);
      assert.equal(res.pendingGrading, 1);
      assert.equal(res.autoGraded, 0);
      assert.equal(gradeCreated, false);
      assert.equal(masteryRecomputed, false);
    } finally {
      prisma.assessment.findUnique = originalAssessmentFindUnique;
      prisma.enrollment.findUnique = originalEnrollmentFindUnique;
      prisma.submission.findFirst = originalSubmissionFindFirst;
      prisma.$transaction = originalTransaction;
    }
  });

  it('question from a different assessment returns 400', async () => {
    const originalAssessmentFindUnique = prisma.assessment.findUnique;
    const originalEnrollmentFindUnique = prisma.enrollment.findUnique;
    const originalSubmissionFindFirst = prisma.submission.findFirst;

    (prisma.assessment.findUnique as any) = async () => mockAssessment;
    (prisma.enrollment.findUnique as any) = async () => ({ id: 'enr-1' });
    (prisma.submission.findFirst as any) = async () => null;

    try {
      await assert.rejects(
        async () => {
          await assessmentsService.submitAssessment(assessmentId, studentId, [
            { questionId: 'wrong-assessment-question-id', selectedIndex: 0 },
          ]);
        },
        /does not belong to this assessment/i
      );
    } finally {
      prisma.assessment.findUnique = originalAssessmentFindUnique;
      prisma.enrollment.findUnique = originalEnrollmentFindUnique;
      prisma.submission.findFirst = originalSubmissionFindFirst;
    }
  });

  it('student not enrolled returns 403', async () => {
    const originalAssessmentFindUnique = prisma.assessment.findUnique;
    const originalEnrollmentFindUnique = prisma.enrollment.findUnique;

    (prisma.assessment.findUnique as any) = async () => mockAssessment;
    (prisma.enrollment.findUnique as any) = async () => null; // not enrolled!

    try {
      await assert.rejects(
        async () => {
          await assessmentsService.submitAssessment(assessmentId, studentId, []);
        },
        (err: any) => {
          assert.equal(err.statusCode, 403);
          assert.match(err.message, /not enrolled/i);
          return true;
        }
      );
    } finally {
      prisma.assessment.findUnique = originalAssessmentFindUnique;
      prisma.enrollment.findUnique = originalEnrollmentFindUnique;
    }
  });

  it('unpublished assessment returns 403 on submit', async () => {
    const originalAssessmentFindUnique = prisma.assessment.findUnique;

    (prisma.assessment.findUnique as any) = async () => ({
      ...mockAssessment,
      published: false, // unpublished!
    });

    try {
      await assert.rejects(
        async () => {
          await assessmentsService.submitAssessment(assessmentId, studentId, []);
        },
        (err: any) => {
          assert.equal(err.statusCode, 403);
          assert.match(err.message, /unpublished/i);
          return true;
        }
      );
    } finally {
      prisma.assessment.findUnique = originalAssessmentFindUnique;
    }
  });

  it('student GET never contains correctIndex or modelAnswer', async () => {
    const originalAssessmentFindUnique = prisma.assessment.findUnique;
    const originalEnrollmentFindUnique = prisma.enrollment.findUnique;
    const originalSubmissionFindFirst = prisma.submission.findFirst;

    (prisma.assessment.findUnique as any) = async () => ({
      ...mockAssessment,
      questions: [
        {
          ...mcqQuestion,
          rubrics: [],
        },
        {
          ...shortQuestion,
          rubrics: [{ id: 'r1', description: 'Clear definition', marks: 5 }],
        },
      ],
    });
    (prisma.enrollment.findUnique as any) = async () => ({ id: 'enr-1' });
    (prisma.submission.findFirst as any) = async () => null;

    try {
      const res = await assessmentsService.getAssessmentById(assessmentId, studentId, Role.STUDENT);
      for (const q of res.questions) {
        assert.equal((q as any).correctIndex, undefined);
        assert.equal((q as any).modelAnswer, undefined);
        if (q.rubrics) {
          for (const r of q.rubrics) {
            assert.equal((r as any).marks, undefined);
          }
        }
      }
    } finally {
      prisma.assessment.findUnique = originalAssessmentFindUnique;
      prisma.enrollment.findUnique = originalEnrollmentFindUnique;
      prisma.submission.findFirst = originalSubmissionFindFirst;
    }
  });
});

describe('Day 6: Validation Tests', () => {
  it('rubric sum mismatch returns 400', async () => {
    let capturedStatus: number | null = null;
    let capturedJson: any = null;

    const req = {
      params: { id: 'test-assessment-id' },
      user: { userId: 'teacher-1', role: Role.TEACHER },
      body: {
        type: 'SHORT',
        conceptId: '11111111-1111-1111-1111-111111111111',
        prompt: 'Explain something.',
        maxMarks: 10,
        modelAnswer: 'Model answer text.',
        rubric: [
          { description: 'Part 1', marks: 4 },
          { description: 'Part 2', marks: 4 }, // Sum = 8, maxMarks = 10 -> Mismatch!
        ],
      },
    } as unknown as Request;

    const res = {
      status(code: number) {
        capturedStatus = code;
        return this;
      },
      json(data: any) {
        capturedJson = data;
        return this;
      },
    } as unknown as Response;

    await assessmentsController.addQuestion(req, res);

    assert.equal(capturedStatus, 400);
    assert.match(capturedJson.error, /sum exactly to maxMarks/i);
  });

  it('correctIndex out of range returns 400', async () => {
    let capturedStatus: number | null = null;
    let capturedJson: any = null;

    const req = {
      params: { id: 'test-assessment-id' },
      user: { userId: 'teacher-1', role: Role.TEACHER },
      body: {
        type: 'MCQ',
        conceptId: '11111111-1111-1111-1111-111111111111',
        prompt: 'Choose one.',
        maxMarks: 5,
        options: ['A', 'B', 'C'],
        correctIndex: 3, // Out of range (0..2)
      },
    } as unknown as Request;

    const res = {
      status(code: number) {
        capturedStatus = code;
        return this;
      },
      json(data: any) {
        capturedJson = data;
        return this;
      },
    } as unknown as Response;

    await assessmentsController.addQuestion(req, res);

    assert.equal(capturedStatus, 400);
    assert.match(capturedJson.error, /correctIndex/i);
  });

  it('concept from another course returns 400', async () => {
    const originalAssessmentFindUnique = prisma.assessment.findUnique;
    const originalConceptFindUnique = prisma.concept.findUnique;

    (prisma.assessment.findUnique as any) = async () => ({
      id: 'a1',
      courseId: 'course-1',
      published: false,
      course: { id: 'course-1', teacherId: 'teacher-1' },
    });
    // Concept belongs to course-2!
    (prisma.concept.findUnique as any) = async () => ({
      id: 'c1',
      courseId: 'course-2',
    });

    try {
      await assert.rejects(
        async () => {
          await assessmentsService.addQuestion(
            'a1',
            {
              type: 'MCQ',
              conceptId: 'c1',
              prompt: 'Prompt',
              maxMarks: 5,
              options: ['A', 'B'],
              correctIndex: 0,
            },
            'teacher-1',
            Role.TEACHER
          );
        },
        /same course/i
      );
    } finally {
      prisma.assessment.findUnique = originalAssessmentFindUnique;
      prisma.concept.findUnique = originalConceptFindUnique;
    }
  });

  it('editing a published assessment returns 409', async () => {
    const originalQuestionFindUnique = prisma.question.findUnique;

    (prisma.question.findUnique as any) = async () => ({
      id: 'q1',
      assessment: {
        published: true, // PUBLISHED!
        course: { teacherId: 'teacher-1' },
      },
    });

    try {
      await assert.rejects(
        async () => {
          await assessmentsService.updateQuestion(
            'q1',
            {
              type: 'MCQ',
              conceptId: 'c1',
              prompt: 'New Prompt',
              maxMarks: 5,
              options: ['A', 'B'],
              correctIndex: 0,
            },
            'teacher-1',
            Role.TEACHER
          );
        },
        (err: any) => {
          assert.equal(err.statusCode, 409);
          assert.match(err.message, /published/i);
          return true;
        }
      );
    } finally {
      prisma.question.findUnique = originalQuestionFindUnique;
    }
  });
});
