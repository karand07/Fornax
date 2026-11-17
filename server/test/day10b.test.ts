import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { gradingService } from '../src/modules/grading/grading.service.js';
import { masteryService } from '../src/modules/mastery/mastery.service.js';
import { prisma } from '../src/lib/prisma.js';
import { Role, QuestionType } from '@prisma/client';

describe('Day 10b: Review Queue, OCR Edit, Re-grade, Approve & Override Tests', () => {
  describe('1. Review Queue Filtering, Reasons & Ordering', () => {
    it('includes handwritten graded, low-confidence typed, UNREADABLE, and ungraded; excludes approved & overridden', async () => {
      const origFindUnique = prisma.course.findUnique;
      const origFindMany = prisma.submission.findMany;

      const submissionsMock = [
        // 1. Approved handwritten (should be excluded from pending)
        {
          id: 'sub-approved',
          assessmentId: 'a1',
          questionId: 'q1',
          userId: 'u1',
          answerText: 'approved text',
          ocrOriginal: 'approved text',
          ocrStatus: 'OK',
          scanPath: 'scan1.jpg',
          submittedAt: new Date('2026-01-01T10:00:00Z'),
          user: { id: 'u1', firstName: 'Alice', lastName: 'A', email: 'alice@test.com' },
          assessment: { id: 'a1', title: 'Exam 1', courseId: 'c1' },
          question: { id: 'q1', prompt: 'Prompt 1', maxMarks: 5, type: QuestionType.HANDWRITTEN },
          grade: {
            id: 'g-approved',
            totalMarks: 4,
            finalMarks: 4,
            confidence: 0.9,
            needsReview: false,
            reviewedBy: 'teacher-1',
            overriddenBy: null,
          },
        },
        // 2. Overridden short answer (should be excluded from pending)
        {
          id: 'sub-overridden',
          assessmentId: 'a1',
          questionId: 'q2',
          userId: 'u2',
          answerText: 'overridden text',
          ocrOriginal: null,
          ocrStatus: null,
          scanPath: null,
          submittedAt: new Date('2026-01-01T10:05:00Z'),
          user: { id: 'u2', firstName: 'Bob', lastName: 'B', email: 'bob@test.com' },
          assessment: { id: 'a1', title: 'Exam 1', courseId: 'c1' },
          question: { id: 'q2', prompt: 'Prompt 2', maxMarks: 5, type: QuestionType.SHORT },
          grade: {
            id: 'g-overridden',
            totalMarks: 2,
            finalMarks: 5,
            confidence: 0.85,
            needsReview: false,
            reviewedBy: null,
            overriddenBy: 'teacher-1',
          },
        },
        // 3. Handwritten graded, pending review (reasons: HANDWRITTEN)
        {
          id: 'sub-hw-pending',
          assessmentId: 'a1',
          questionId: 'q3',
          userId: 'u3',
          answerText: 'Valid long handwritten response explaining database normalization',
          ocrOriginal: 'Valid long handwritten response explaining database normalization',
          ocrStatus: 'OK',
          scanPath: 'scan3.jpg',
          submittedAt: new Date('2026-01-01T10:10:00Z'),
          user: { id: 'u3', firstName: 'Charlie', lastName: 'C', email: 'charlie@test.com' },
          assessment: { id: 'a1', title: 'Exam 1', courseId: 'c1' },
          question: { id: 'q3', prompt: 'Prompt 3', maxMarks: 5, type: QuestionType.HANDWRITTEN },
          grade: {
            id: 'g-hw',
            totalMarks: 4,
            finalMarks: 4,
            confidence: 0.88,
            needsReview: true,
            reviewedBy: null,
            overriddenBy: null,
          },
        },
        // 4. Low confidence typed (reasons: LOW_CONFIDENCE)
        {
          id: 'sub-low-conf',
          assessmentId: 'a1',
          questionId: 'q4',
          userId: 'u4',
          answerText: 'Relational databases use B-tree index tables',
          ocrOriginal: null,
          ocrStatus: null,
          scanPath: null,
          submittedAt: new Date('2026-01-01T10:15:00Z'),
          user: { id: 'u4', firstName: 'Dave', lastName: 'D', email: 'dave@test.com' },
          assessment: { id: 'a1', title: 'Exam 1', courseId: 'c1' },
          question: { id: 'q4', prompt: 'Prompt 4', maxMarks: 5, type: QuestionType.SHORT },
          grade: {
            id: 'g-low',
            totalMarks: 3,
            finalMarks: 3,
            confidence: 0.55,
            needsReview: true,
            reviewedBy: null,
            overriddenBy: null,
          },
        },
        // 5. Unreadable handwritten scan without grade (reasons: HANDWRITTEN, UNREADABLE, UNGRADED)
        {
          id: 'sub-unreadable',
          assessmentId: 'a1',
          questionId: 'q5',
          userId: 'u5',
          answerText: '',
          ocrOriginal: '',
          ocrStatus: 'UNREADABLE',
          scanPath: 'scan5.jpg',
          submittedAt: new Date('2026-01-01T10:20:00Z'),
          user: { id: 'u5', firstName: 'Eve', lastName: 'E', email: 'eve@test.com' },
          assessment: { id: 'a1', title: 'Exam 1', courseId: 'c1' },
          question: { id: 'q5', prompt: 'Prompt 5', maxMarks: 5, type: QuestionType.HANDWRITTEN },
          grade: null,
        },
      ];

      (prisma.course.findUnique as any) = async () => ({ id: 'c1', teacherId: 'teacher-1' });
      (prisma.submission.findMany as any) = async () => submissionsMock;

      try {
        const pendingQueue = await gradingService.getReviewQueue(
          { courseId: 'c1', status: 'pending' },
          'teacher-1',
          Role.TEACHER
        );

        assert.equal(pendingQueue.total, 3);
        const subIds = pendingQueue.items.map((i) => i.submissionId);
        assert.ok(!subIds.includes('sub-approved'), 'Approved must be excluded');
        assert.ok(!subIds.includes('sub-overridden'), 'Overridden must be excluded');
        assert.ok(subIds.includes('sub-hw-pending'));
        assert.ok(subIds.includes('sub-low-conf'));
        assert.ok(subIds.includes('sub-unreadable'));

        // Ordering rule check: UNGRADED / UNREADABLE first, then lowest confidence
        assert.equal(pendingQueue.items[0].submissionId, 'sub-unreadable', 'UNREADABLE/UNGRADED first');
        assert.equal(pendingQueue.items[1].submissionId, 'sub-low-conf', 'Lowest confidence next (0.55)');
        assert.equal(pendingQueue.items[2].submissionId, 'sub-hw-pending', 'Higher confidence last (0.88)');

        // Check reasons
        const unreadableItem = pendingQueue.items[0];
        assert.ok(unreadableItem.reasons.includes('UNREADABLE'));
        assert.ok(unreadableItem.reasons.includes('UNGRADED'));

        const lowConfItem = pendingQueue.items[1];
        assert.ok(lowConfItem.reasons.includes('LOW_CONFIDENCE'));

        // Test done queue
        const doneQueue = await gradingService.getReviewQueue(
          { courseId: 'c1', status: 'done' },
          'teacher-1',
          Role.TEACHER
        );
        assert.equal(doneQueue.total, 2);
        const doneIds = doneQueue.items.map((i) => i.submissionId);
        assert.ok(doneIds.includes('sub-approved'));
        assert.ok(doneIds.includes('sub-overridden'));
      } finally {
        prisma.course.findUnique = origFindUnique;
        prisma.submission.findMany = origFindMany;
      }
    });

    it('rejects with 403 when another teacher attempts to view queue', async () => {
      const origFindUnique = prisma.course.findUnique;
      (prisma.course.findUnique as any) = async () => ({ id: 'c1', teacherId: 'teacher-1' });

      try {
        await assert.rejects(async () => {
          await gradingService.getReviewQueue(
            { courseId: 'c1', status: 'pending' },
            'teacher-other',
            Role.TEACHER
          );
        }, (err: any) => err.statusCode === 403);
      } finally {
        prisma.course.findUnique = origFindUnique;
      }
    });
  });

  describe('2. OCR Transcript Correction (PATCH /submissions/:id/ocr)', () => {
    it('updates answerText, ocrEditedBy, ocrEditedAt, writes audit log, and preserves ocrOriginal', async () => {
      const origFindUnique = prisma.submission.findUnique;
      const origUpdate = prisma.submission.update;
      const origAuditCreate = prisma.auditLog.create;

      const subRecord = {
        id: 'sub-hw-1',
        answerText: 'First 2x = 6 then x = 4',
        ocrOriginal: 'First 2x = 6 then x = 4',
        ocrEditedBy: null,
        ocrEditedAt: null,
        question: { id: 'q1', type: QuestionType.HANDWRITTEN, conceptId: 'cp1' },
        assessment: { id: 'a1', course: { id: 'c1', teacherId: 'teacher-1' } },
      };

      let updatedData: any = null;
      let auditWritten: any = null;

      (prisma.submission.findUnique as any) = async () => subRecord;
      (prisma.submission.update as any) = async (args: any) => {
        updatedData = args.data;
        return { ...subRecord, ...args.data };
      };
      (prisma.auditLog.create as any) = async (args: any) => {
        auditWritten = args.data;
        return { id: 'audit-1', ...args.data };
      };

      try {
        const result = await gradingService.updateOcrTranscript(
          'sub-hw-1',
          'First 2x = 6 then x = 3',
          'teacher-1',
          Role.TEACHER
        );

        assert.equal(result.answerText, 'First 2x = 6 then x = 3');
        assert.equal(updatedData.ocrOriginal, undefined, 'ocrOriginal must NEVER be updated');
        assert.equal(updatedData.ocrEditedBy, 'teacher-1');
        assert.ok(updatedData.ocrEditedAt instanceof Date);

        assert.ok(auditWritten, 'Audit log must be written');
        assert.equal(auditWritten.action, 'OCR_EDIT');
        assert.equal(auditWritten.entityType, 'Submission');
        assert.equal(auditWritten.entityId, 'sub-hw-1');
        assert.equal(auditWritten.after.wordEdits, 1);
      } finally {
        prisma.submission.findUnique = origFindUnique;
        prisma.submission.update = origUpdate;
        prisma.auditLog.create = origAuditCreate;
      }
    });

    it('returns 200 without writing to DB if text is unchanged', async () => {
      const origFindUnique = prisma.submission.findUnique;
      const origUpdate = prisma.submission.update;

      let updateCalled = false;
      (prisma.submission.findUnique as any) = async () => ({
        id: 'sub-hw-2',
        answerText: 'Exact same text',
        ocrOriginal: 'Exact same text',
        question: { id: 'q1', type: QuestionType.HANDWRITTEN, conceptId: 'cp1' },
        assessment: { id: 'a1', course: { id: 'c1', teacherId: 'teacher-1' } },
      });
      (prisma.submission.update as any) = async () => {
        updateCalled = true;
      };

      try {
        const res = await gradingService.updateOcrTranscript(
          'sub-hw-2',
          'Exact same text',
          'teacher-1',
          Role.TEACHER
        );

        assert.equal(updateCalled, false, 'Database update must not be called when text is unchanged');
        assert.equal(res.id, 'sub-hw-2');
      } finally {
        prisma.submission.findUnique = origFindUnique;
        prisma.submission.update = origUpdate;
      }
    });
  });

  describe('3. Re-grade (POST /submissions/:id/regrade)', () => {
    it('returns 409 if override exists and force is false', async () => {
      const origFindUnique = prisma.submission.findUnique;

      (prisma.submission.findUnique as any) = async () => ({
        id: 'sub-regrade-1',
        answerText: 'Some valid text',
        question: { id: 'q1', type: QuestionType.HANDWRITTEN, conceptId: 'cp1' },
        assessment: { id: 'a1', course: { id: 'c1', teacherId: 'teacher-1' } },
        grade: { id: 'g1', overriddenBy: 'teacher-1', finalMarks: 5 },
      });

      try {
        await assert.rejects(async () => {
          await gradingService.regradeSubmission(
            'sub-regrade-1',
            false,
            'teacher-1',
            Role.TEACHER
          );
        }, (err: any) => err.statusCode === 409 && err.message.includes('override exists'));
      } finally {
        prisma.submission.findUnique = origFindUnique;
      }
    });

    it('with force=true, clears override fields, writes REGRADE_FORCE audit, and proceeds to grade', async () => {
      const origFindUnique = prisma.submission.findUnique;
      const origGradeUpdate = prisma.grade.update;
      const origAuditCreate = prisma.auditLog.create;
      const origGradeSub = (gradingService as any).gradeShortOrHandwrittenSubmission;
      const origGetSubById = gradingService.getSubmissionById;

      let gradeUpdatedData: any = null;
      let auditLogData: any = null;
      let gradeSubmissionCalled = false;

      (prisma.submission.findUnique as any) = async () => ({
        id: 'sub-regrade-2',
        answerText: 'Corrected text',
        question: {
          id: 'q1',
          type: QuestionType.HANDWRITTEN,
          conceptId: 'cp1',
          prompt: 'Solve equation',
          maxMarks: 5,
          rubrics: [],
        },
        assessment: { id: 'a1', course: { id: 'c1', teacherId: 'teacher-1' } },
        grade: { id: 'g1', overriddenBy: 'teacher-1', finalMarks: 5, totalMarks: 2 },
      });

      (prisma.grade.update as any) = async (args: any) => {
        gradeUpdatedData = { ...gradeUpdatedData, ...args.data };
        return { id: 'g1', ...gradeUpdatedData };
      };

      (prisma.auditLog.create as any) = async (args: any) => {
        auditLogData = args.data;
        return { id: 'audit-2', ...args.data };
      };

      (gradingService as any).gradeShortOrHandwrittenSubmission = async () => {
        gradeSubmissionCalled = true;
        return { id: 'g1', totalMarks: 4, needsReview: true };
      };

      (gradingService as any).getSubmissionById = async () => ({
        id: 'sub-regrade-2',
        grade: { totalMarks: 4, finalMarks: 4 },
      });

      try {
        await gradingService.regradeSubmission(
          'sub-regrade-2',
          true,
          'teacher-1',
          Role.TEACHER
        );

        assert.equal(gradeUpdatedData.finalMarks, null);
        assert.equal(gradeUpdatedData.overriddenBy, null);
        assert.equal(gradeUpdatedData.overriddenAt, null);
        assert.equal(gradeUpdatedData.overrideNote, null);
        assert.equal(gradeUpdatedData.reviewedBy, null);

        assert.ok(auditLogData);
        assert.equal(auditLogData.action, 'REGRADE_FORCE');
        assert.equal(gradeSubmissionCalled, true);
      } finally {
        prisma.submission.findUnique = origFindUnique;
        prisma.grade.update = origGradeUpdate;
        prisma.auditLog.create = origAuditCreate;
        (gradingService as any).gradeShortOrHandwrittenSubmission = origGradeSub;
        gradingService.getSubmissionById = origGetSubById;
      }
    });

    it('returns 400 if answerText is empty for handwritten submission', async () => {
      const origFindUnique = prisma.submission.findUnique;

      (prisma.submission.findUnique as any) = async () => ({
        id: 'sub-empty-hw',
        answerText: '   ',
        question: { id: 'q1', type: QuestionType.HANDWRITTEN, conceptId: 'cp1' },
        assessment: { id: 'a1', course: { id: 'c1', teacherId: 'teacher-1' } },
        grade: null,
      });

      try {
        await assert.rejects(async () => {
          await gradingService.regradeSubmission(
            'sub-empty-hw',
            false,
            'teacher-1',
            Role.TEACHER
          );
        }, (err: any) => err.statusCode === 400 && err.message.includes('Add the transcribed text first'));
      } finally {
        prisma.submission.findUnique = origFindUnique;
      }
    });
  });

  describe('4. Approve Grade (POST /submissions/:id/approve)', () => {
    it('rejects with 409 if gradeStale is true', async () => {
      const origFindUnique = prisma.submission.findUnique;

      (prisma.submission.findUnique as any) = async () => ({
        id: 'sub-stale',
        answerText: 'Edited recently',
        ocrEditedAt: new Date('2026-02-01T12:00:00Z'),
        question: { id: 'q1', type: QuestionType.HANDWRITTEN, conceptId: 'cp1' },
        assessment: { id: 'a1', course: { id: 'c1', teacherId: 'teacher-1' } },
        grade: {
          id: 'g-stale',
          gradedAt: new Date('2026-02-01T10:00:00Z'), // graded before edit -> stale!
          needsReview: true,
          reviewedBy: null,
        },
      });

      try {
        await assert.rejects(async () => {
          await gradingService.approveGrade('sub-stale', 'teacher-1', Role.TEACHER);
        }, (err: any) => err.statusCode === 409 && err.message.includes('text changed after grading'));
      } finally {
        prisma.submission.findUnique = origFindUnique;
      }
    });

    it('sets reviewedBy, reviewedAt, needsReview=false, marks unchanged, and writes APPROVE audit log', async () => {
      const origFindUnique = prisma.submission.findUnique;
      const origTx = prisma.$transaction;
      const origGetSubById = gradingService.getSubmissionById;

      let gradeUpdatedData: any = null;
      let auditLogData: any = null;

      (prisma.submission.findUnique as any) = async () => ({
        id: 'sub-approve-ok',
        answerText: 'Clean text',
        ocrEditedAt: null,
        question: { id: 'q1', type: QuestionType.HANDWRITTEN, conceptId: 'cp1' },
        assessment: { id: 'a1', course: { id: 'c1', teacherId: 'teacher-1' } },
        grade: {
          id: 'g-ok',
          totalMarks: 4,
          finalMarks: 4,
          gradedAt: new Date(),
          needsReview: true,
          reviewedBy: null,
        },
      });

      (prisma.$transaction as any) = async (cb: any) => {
        const fakeTx = {
          grade: {
            update: async (args: any) => {
              gradeUpdatedData = args.data;
              return { id: 'g-ok', ...args.data };
            },
          },
          auditLog: {
            create: async (args: any) => {
              auditLogData = args.data;
              return { id: 'audit-approve', ...args.data };
            },
          },
        };
        return cb(fakeTx);
      };

      (gradingService as any).getSubmissionById = async () => ({
        id: 'sub-approve-ok',
        grade: { needsReview: false, reviewedBy: 'teacher-1' },
      });

      try {
        const res = await gradingService.approveGrade('sub-approve-ok', 'teacher-1', Role.TEACHER);

        assert.equal(gradeUpdatedData.needsReview, false);
        assert.equal(gradeUpdatedData.reviewedBy, 'teacher-1');
        assert.ok(gradeUpdatedData.reviewedAt instanceof Date);

        assert.ok(auditLogData);
        assert.equal(auditLogData.action, 'APPROVE');
        assert.equal(auditLogData.entityType, 'Grade');
        assert.equal(auditLogData.entityId, 'g-ok');
      } finally {
        prisma.submission.findUnique = origFindUnique;
        prisma.$transaction = origTx;
        gradingService.getSubmissionById = origGetSubById;
      }
    });
  });

  describe('5. Override Marks (POST /submissions/:id/override)', () => {
    it('rejects marks above question maxMarks with 400', async () => {
      const origFindUnique = prisma.submission.findUnique;

      (prisma.submission.findUnique as any) = async () => ({
        id: 'sub-ov-1',
        question: { id: 'q1', maxMarks: 5, conceptId: 'cp1' },
        assessment: { course: { id: 'c1', teacherId: 'teacher-1' } },
        grade: { id: 'g1', totalMarks: 3 },
      });

      try {
        await assert.rejects(async () => {
          await gradingService.overrideGrade(
            'sub-ov-1',
            { finalMarks: 5.5, note: 'Good answer overall' },
            'teacher-1',
            Role.TEACHER
          );
        }, (err: any) => err.statusCode === 400 && err.message.includes('must be between 0 and 5'));
      } finally {
        prisma.submission.findUnique = origFindUnique;
      }
    });

    it('rejects marks not in step of 0.25 (e.g. 3.1) with 400', async () => {
      const origFindUnique = prisma.submission.findUnique;

      (prisma.submission.findUnique as any) = async () => ({
        id: 'sub-ov-2',
        question: { id: 'q1', maxMarks: 5, conceptId: 'cp1' },
        assessment: { course: { id: 'c1', teacherId: 'teacher-1' } },
        grade: { id: 'g1', totalMarks: 3 },
      });

      try {
        await assert.rejects(async () => {
          await gradingService.overrideGrade(
            'sub-ov-2',
            { finalMarks: 3.1, note: 'Good answer overall' },
            'teacher-1',
            Role.TEACHER
          );
        }, (err: any) => err.statusCode === 400 && err.message.includes('steps of 0.25'));
      } finally {
        prisma.submission.findUnique = origFindUnique;
      }
    });

    it('creates MANUAL grade if none exists, recomputes mastery, writes OVERRIDE audit log', async () => {
      const origFindUnique = prisma.submission.findUnique;
      const origTx = prisma.$transaction;
      const origRecompute = masteryService.recomputeMastery;
      const origGetSubById = gradingService.getSubmissionById;

      let gradeCreated: any = null;
      let submissionScoreUpdated: any = null;
      let auditLogCreated: any = null;
      let masteryRecomputed = false;

      (prisma.submission.findUnique as any) = async () => ({
        id: 'sub-manual-grade',
        userId: 'student-1',
        question: { id: 'q1', maxMarks: 5, conceptId: 'concept-algebra' },
        assessment: { course: { id: 'c1', teacherId: 'teacher-1' } },
        grade: null, // No grade existed before
      });

      (masteryService.recomputeMastery as any) = async () => {
        masteryRecomputed = true;
      };

      (prisma.$transaction as any) = async (cb: any) => {
        const fakeTx = {
          grade: {
            create: async (args: any) => {
              gradeCreated = args.data;
              return { id: 'g-manual', ...args.data };
            },
          },
          submission: {
            update: async (args: any) => {
              submissionScoreUpdated = args.data.score;
            },
          },
          auditLog: {
            create: async (args: any) => {
              auditLogCreated = args.data;
              return { id: 'audit-ov', ...args.data };
            },
          },
        };
        return cb(fakeTx);
      };

      (gradingService as any).getSubmissionById = async () => ({
        id: 'sub-manual-grade',
        grade: { totalMarks: 3.75, finalMarks: 3.75 },
      });

      try {
        const res = await gradingService.overrideGrade(
          'sub-manual-grade',
          { finalMarks: 3.75, note: 'Manually graded from illegible scan' },
          'teacher-1',
          Role.TEACHER
        );

        assert.ok(gradeCreated);
        assert.equal(gradeCreated.graderType, 'MANUAL');
        assert.equal(gradeCreated.totalMarks, 3.75);
        assert.equal(gradeCreated.finalMarks, 3.75);
        assert.equal(gradeCreated.confidence, 1);
        assert.equal(gradeCreated.needsReview, false);
        assert.equal(gradeCreated.overrideNote, 'Manually graded from illegible scan');

        assert.equal(submissionScoreUpdated, 3.75);
        assert.ok(auditLogCreated);
        assert.equal(auditLogCreated.action, 'OVERRIDE');
        assert.equal(auditLogCreated.after.finalMarks, 3.75);
        assert.equal(masteryRecomputed, true);
      } finally {
        prisma.submission.findUnique = origFindUnique;
        prisma.$transaction = origTx;
        masteryService.recomputeMastery = origRecompute;
        gradingService.getSubmissionById = origGetSubById;
      }
    });

    it('when Grade exists: never changes totalMarks (AI), updates finalMarks, writes OVERRIDE audit log with before/after', async () => {
      const origFindUnique = prisma.submission.findUnique;
      const origTx = prisma.$transaction;
      const origRecompute = masteryService.recomputeMastery;
      const origGetSubById = gradingService.getSubmissionById;

      let gradeUpdated: any = null;
      let auditLogCreated: any = null;

      (prisma.submission.findUnique as any) = async () => ({
        id: 'sub-existing-grade',
        userId: 'student-2',
        question: { id: 'q1', maxMarks: 5, conceptId: 'concept-db' },
        assessment: { course: { id: 'c1', teacherId: 'teacher-1' } },
        grade: {
          id: 'g-existing',
          totalMarks: 2.0, // AI original score
          finalMarks: 2.0,
          overriddenBy: null,
          overrideNote: null,
        },
      });

      (masteryService.recomputeMastery as any) = async () => {};

      (prisma.$transaction as any) = async (cb: any) => {
        const fakeTx = {
          grade: {
            update: async (args: any) => {
              gradeUpdated = args.data;
              return { id: 'g-existing', totalMarks: 2.0, ...args.data };
            },
          },
          submission: {
            update: async () => {},
          },
          auditLog: {
            create: async (args: any) => {
              auditLogCreated = args.data;
              return { id: 'audit-ov-2', ...args.data };
            },
          },
        };
        return cb(fakeTx);
      };

      (gradingService as any).getSubmissionById = async () => ({
        id: 'sub-existing-grade',
        grade: { totalMarks: 2.0, finalMarks: 4.5 },
      });

      try {
        await gradingService.overrideGrade(
          'sub-existing-grade',
          { finalMarks: 4.5, note: 'Awarding extra partial marks for reasoning' },
          'teacher-1',
          Role.TEACHER
        );

        assert.equal(gradeUpdated.totalMarks, undefined, 'totalMarks must NEVER be touched during override');
        assert.equal(gradeUpdated.finalMarks, 4.5);
        assert.equal(gradeUpdated.overriddenBy, 'teacher-1');
        assert.equal(gradeUpdated.needsReview, false);

        assert.ok(auditLogCreated);
        assert.equal(auditLogCreated.action, 'OVERRIDE');
        assert.equal(auditLogCreated.before.autoMarks, 2.0);
        assert.equal(auditLogCreated.after.finalMarks, 4.5);
      } finally {
        prisma.submission.findUnique = origFindUnique;
        prisma.$transaction = origTx;
        masteryService.recomputeMastery = origRecompute;
        gradingService.getSubmissionById = origGetSubById;
      }
    });
  });

  describe('6. Audit Log Endpoint (GET /api/grading/audit)', () => {
    it('returns audit entries ordered by createdAt desc and resolves actor name', async () => {
      const origFindUnique = prisma.submission.findUnique;
      const origAuditFindMany = prisma.auditLog.findMany;
      const origUserFindMany = prisma.user.findMany;

      (prisma.submission.findUnique as any) = async () => ({
        id: 'sub-audit-view',
        assessment: { course: { id: 'c1', teacherId: 'teacher-1' } },
      });

      (prisma.auditLog.findMany as any) = async () => [
        {
          id: 'log-2',
          actorId: 'teacher-1',
          action: 'OVERRIDE',
          entityType: 'Submission',
          entityId: 'sub-audit-view',
          before: { autoMarks: 2 },
          after: { finalMarks: 4, note: 'Adjusted' },
          createdAt: new Date('2026-02-01T11:00:00Z'),
        },
        {
          id: 'log-1',
          actorId: 'teacher-1',
          action: 'OCR_EDIT',
          entityType: 'Submission',
          entityId: 'sub-audit-view',
          before: null,
          after: { wordEdits: 2 },
          createdAt: new Date('2026-02-01T10:00:00Z'),
        },
      ];

      (prisma.user.findMany as any) = async () => [
        { id: 'teacher-1', firstName: 'Jane', lastName: 'Doe', email: 'jane@univ.edu' },
      ];

      try {
        const history = await gradingService.getAuditHistory(
          { entityType: 'Submission', entityId: 'sub-audit-view' },
          'teacher-1',
          Role.TEACHER
        );

        assert.equal(history.length, 2);
        assert.equal(history[0].actorName, 'Jane Doe');
        assert.equal(history[0].action, 'OVERRIDE');
        assert.equal(history[1].actorName, 'Jane Doe');
        assert.equal(history[1].action, 'OCR_EDIT');
      } finally {
        prisma.submission.findUnique = origFindUnique;
        prisma.auditLog.findMany = origAuditFindMany;
        prisma.user.findMany = origUserFindMany;
      }
    });

    it('rejects with 403 when another teacher attempts to inspect audit log', async () => {
      const origFindUnique = prisma.submission.findUnique;

      (prisma.submission.findUnique as any) = async () => ({
        id: 'sub-audit-view-other',
        assessment: { course: { id: 'c1', teacherId: 'teacher-1' } },
      });

      try {
        await assert.rejects(async () => {
          await gradingService.getAuditHistory(
            { entityType: 'Submission', entityId: 'sub-audit-view-other' },
            'teacher-rogue',
            Role.TEACHER
          );
        }, (err: any) => err.statusCode === 403);
      } finally {
        prisma.submission.findUnique = origFindUnique;
      }
    });
  });
});
