import { prisma } from '../../lib/prisma.js';
import { Role, QuestionType } from '@prisma/client';
import { masteryService } from '../mastery/mastery.service.js';
import { computeMastery, GradedItem } from '../../lib/mastery.js';
import { getConfidenceLevel } from '../grading/grading.constants.js';
import { processAndStoreScan, deleteStoredScan } from '../../lib/scan.js';
import { processHandwrittenSubmissions } from '../grading/transcribe.js';

export interface McqQuestionInput {
  type: 'MCQ';
  conceptId: string;
  prompt: string;
  maxMarks: number;
  options: string[];
  correctIndex: number;
  modelAnswer?: string;
}

export interface ShortQuestionInput {
  type: 'SHORT' | 'HANDWRITTEN';
  conceptId: string;
  prompt: string;
  maxMarks: number;
  modelAnswer: string;
  rubric: { description: string; marks: number }[];
}

export type QuestionInput = McqQuestionInput | ShortQuestionInput;

export class AssessmentsService {
  async createAssessment(courseId: string, title: string, teacherId: string, userRole: Role) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new Error('Course not found');
    }

    if (userRole !== Role.ADMIN && course.teacherId !== teacherId) {
      throw new Error('Unauthorized: You do not own this course');
    }

    return prisma.assessment.create({
      data: {
        courseId,
        title,
        published: false,
      },
    });
  }

  async getCourseAssessments(courseId: string, userId: string, userRole: Role) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new Error('Course not found');
    }

    const isTeacher = userRole === Role.ADMIN || course.teacherId === userId;

    if (isTeacher) {
      // Teacher sees all assessments with question count and submission count
      const assessments = await prisma.assessment.findMany({
        where: { courseId },
        include: {
          questions: { select: { id: true, maxMarks: true } },
          submissions: { select: { userId: true }, distinct: ['userId'] },
        },
        orderBy: { createdAt: 'desc' },
      });

      return assessments.map((a) => ({
        id: a.id,
        courseId: a.courseId,
        title: a.title,
        published: a.published,
        questionCount: a.questions.length,
        totalMarks: a.questions.reduce((sum, q) => sum + q.maxMarks, 0),
        submissionCount: a.submissions.length,
        createdAt: a.createdAt,
      }));
    }

    // Student: must be enrolled, sees published only
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (!enrollment) {
      throw new Error('Unauthorized: You are not enrolled in this course');
    }

    const assessments = await prisma.assessment.findMany({
      where: { courseId, published: true },
      include: {
        questions: { select: { id: true, maxMarks: true } },
        submissions: {
          where: { userId },
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return assessments.map((a) => ({
      id: a.id,
      title: a.title,
      questionCount: a.questions.length,
      totalMarks: a.questions.reduce((sum, q) => sum + q.maxMarks, 0),
      submitted: a.submissions.length > 0,
    }));
  }

  async addQuestion(assessmentId: string, data: QuestionInput, teacherId: string, userRole: Role) {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { course: true },
    });

    if (!assessment) {
      throw new Error('Assessment not found');
    }

    if (userRole !== Role.ADMIN && assessment.course.teacherId !== teacherId) {
      throw new Error('Unauthorized: You do not own this course');
    }

    if (assessment.published) {
      const err = new Error('Cannot add questions to a published assessment');
      (err as any).statusCode = 409;
      throw err;
    }

    // Validate concept belongs to the same course
    const concept = await prisma.concept.findUnique({
      where: { id: data.conceptId },
    });

    if (!concept || concept.courseId !== assessment.courseId) {
      throw new Error('Concept must belong to the same course as the assessment');
    }

    if (data.type === 'MCQ') {
      if (data.correctIndex < 0 || data.correctIndex >= data.options.length) {
        throw new Error('correctIndex must be between 0 and options.length - 1');
      }

      return prisma.question.create({
        data: {
          assessmentId,
          conceptId: data.conceptId,
          type: QuestionType.MCQ,
          prompt: data.prompt,
          maxMarks: data.maxMarks,
          options: data.options,
          correctIndex: data.correctIndex,
          modelAnswer: data.modelAnswer ?? null,
        },
      });
    }

    if (data.type === 'SHORT' || data.type === 'HANDWRITTEN') {
      const sumMarks = data.rubric.reduce((sum, r) => sum + r.marks, 0);
      if (Math.abs(sumMarks - data.maxMarks) > 0.001) {
        throw new Error(
          `Rubric marks sum (${sumMarks}) must equal maxMarks (${data.maxMarks}) within 0.001 tolerance`
        );
      }

      return prisma.$transaction(async (tx) => {
        const question = await tx.question.create({
          data: {
            assessmentId,
            conceptId: data.conceptId,
            type: data.type === 'HANDWRITTEN' ? QuestionType.HANDWRITTEN : QuestionType.SHORT,
            prompt: data.prompt,
            maxMarks: data.maxMarks,
            modelAnswer: data.modelAnswer,
          },
        });

        await tx.rubricCriterion.createMany({
          data: data.rubric.map((r) => ({
            questionId: question.id,
            description: r.description,
            marks: r.marks,
          })),
        });

        return tx.question.findUnique({
          where: { id: question.id },
          include: { rubrics: true },
        });
      });
    }

    throw new Error('Unsupported question type');
  }

  async updateQuestion(questionId: string, data: QuestionInput, teacherId: string, userRole: Role) {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { assessment: { include: { course: true } } },
    });

    if (!question) {
      throw new Error('Question not found');
    }

    if (userRole !== Role.ADMIN && question.assessment.course.teacherId !== teacherId) {
      throw new Error('Unauthorized: You do not own this course');
    }

    if (question.assessment.published) {
      const err = new Error('Cannot edit questions in a published assessment');
      (err as any).statusCode = 409;
      throw err;
    }

    const concept = await prisma.concept.findUnique({
      where: { id: data.conceptId },
    });

    if (!concept || concept.courseId !== question.assessment.courseId) {
      throw new Error('Concept must belong to the same course as the assessment');
    }

    if (data.type === 'MCQ') {
      if (data.correctIndex < 0 || data.correctIndex >= data.options.length) {
        throw new Error('correctIndex must be between 0 and options.length - 1');
      }

      return prisma.question.update({
        where: { id: questionId },
        data: {
          conceptId: data.conceptId,
          type: QuestionType.MCQ,
          prompt: data.prompt,
          maxMarks: data.maxMarks,
          options: data.options,
          correctIndex: data.correctIndex,
          modelAnswer: data.modelAnswer ?? null,
        },
      });
    }

    if (data.type === 'SHORT' || data.type === 'HANDWRITTEN') {
      const sumMarks = data.rubric.reduce((sum, r) => sum + r.marks, 0);
      if (Math.abs(sumMarks - data.maxMarks) > 0.001) {
        throw new Error(
          `Rubric marks sum (${sumMarks}) must equal maxMarks (${data.maxMarks}) within 0.001 tolerance`
        );
      }

      return prisma.$transaction(async (tx) => {
        await tx.rubricCriterion.deleteMany({ where: { questionId } });

        await tx.rubricCriterion.createMany({
          data: data.rubric.map((r) => ({
            questionId,
            description: r.description,
            marks: r.marks,
          })),
        });

        return tx.question.update({
          where: { id: questionId },
          data: {
            conceptId: data.conceptId,
            type: data.type === 'HANDWRITTEN' ? QuestionType.HANDWRITTEN : QuestionType.SHORT,
            prompt: data.prompt,
            maxMarks: data.maxMarks,
            modelAnswer: data.modelAnswer,
            options: [],
            correctIndex: null,
          },
          include: { rubrics: true },
        });
      });
    }

    throw new Error('Unsupported question type');
  }

  async deleteQuestion(questionId: string, teacherId: string, userRole: Role) {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { assessment: { include: { course: true } } },
    });

    if (!question) {
      throw new Error('Question not found');
    }

    if (userRole !== Role.ADMIN && question.assessment.course.teacherId !== teacherId) {
      throw new Error('Unauthorized: You do not own this course');
    }

    if (question.assessment.published) {
      const err = new Error('Cannot delete questions in a published assessment');
      (err as any).statusCode = 409;
      throw err;
    }

    return prisma.question.delete({
      where: { id: questionId },
    });
  }

  async publishAssessment(assessmentId: string, teacherId: string, userRole: Role) {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { course: true, questions: true },
    });

    if (!assessment) {
      throw new Error('Assessment not found');
    }

    if (userRole !== Role.ADMIN && assessment.course.teacherId !== teacherId) {
      throw new Error('Unauthorized: You do not own this course');
    }

    if (assessment.questions.length === 0) {
      throw new Error('Assessment must have at least 1 question to be published');
    }

    return prisma.assessment.update({
      where: { id: assessmentId },
      data: { published: true },
    });
  }

  async getAssessmentById(assessmentId: string, userId: string, userRole: Role) {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        course: { select: { id: true, code: true, title: true, teacherId: true } },
        questions: {
          include: { rubrics: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!assessment) {
      throw new Error('Assessment not found');
    }

    const isTeacher = userRole === Role.ADMIN || assessment.course.teacherId === userId;

    if (isTeacher) {
      // Teacher gets the full version
      return assessment;
    }

    // Student: must be enrolled and assessment must be published
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: assessment.courseId,
        },
      },
    });

    if (!enrollment) {
      const err = new Error('Unauthorized: You are not enrolled in this course');
      (err as any).statusCode = 403;
      throw err;
    }

    if (!assessment.published) {
      const err = new Error('Assessment not found');
      (err as any).statusCode = 404;
      throw err;
    }

    const existingSubmission = await prisma.submission.findFirst({
      where: { assessmentId, userId },
    });

    // Sanitize questions for student: omit correctIndex, modelAnswer, and rubric marks
    const sanitizedQuestions = assessment.questions.map((q) => ({
      id: q.id,
      assessmentId: q.assessmentId,
      conceptId: q.conceptId,
      type: q.type,
      prompt: q.prompt,
      maxMarks: q.maxMarks,
      options: q.options,
      rubrics: q.rubrics.map((r) => ({
        id: r.id,
        description: r.description,
      })),
    }));

    return {
      id: assessment.id,
      courseId: assessment.courseId,
      title: assessment.title,
      description: assessment.description,
      published: assessment.published,
      submitted: Boolean(existingSubmission),
      questions: sanitizedQuestions,
      course: assessment.course,
    };
  }

  async submitAssessment(
    assessmentId: string,
    studentId: string,
    answers: { questionId: string; selectedIndex?: number; answerText?: string }[],
    scanFiles?: Map<string, Express.Multer.File>
  ) {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        course: true,
        questions: true,
      },
    });

    if (!assessment) {
      throw new Error('Assessment not found');
    }

    if (!assessment.published) {
      const err = new Error('Cannot submit to an unpublished assessment');
      (err as any).statusCode = 403;
      throw err;
    }

    // Check student enrolled
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: studentId,
          courseId: assessment.courseId,
        },
      },
    });

    if (!enrollment) {
      const err = new Error('Unauthorized: You are not enrolled in this course');
      (err as any).statusCode = 403;
      throw err;
    }

    // Reject with 409 if student already has any submission for this assessment
    const existingSubmission = await prisma.submission.findFirst({
      where: { assessmentId, userId: studentId },
    });

    if (existingSubmission) {
      const err = new Error('You have already submitted this assessment');
      (err as any).statusCode = 409;
      throw err;
    }

    // Validate question IDs
    const questionMap = new Map(assessment.questions.map((q) => [q.id, q]));
    const seenQuestionIds = new Set<string>();

    // Validate scans: each scan must correspond to a HANDWRITTEN question of this assessment
    if (scanFiles && scanFiles.size > 0) {
      for (const [qId] of scanFiles.entries()) {
        const q = questionMap.get(qId);
        if (!q) {
          throw new Error(`Question ${qId} does not belong to this assessment`);
        }
        if (q.type !== QuestionType.HANDWRITTEN) {
          const err = new Error(`Scans can only be submitted for HANDWRITTEN questions (question ${qId} is ${q.type})`);
          (err as any).statusCode = 400;
          throw err;
        }
      }
    }

    for (const a of answers) {
      if (seenQuestionIds.has(a.questionId)) {
        throw new Error(`Duplicate answer for question ID: ${a.questionId}`);
      }
      seenQuestionIds.add(a.questionId);

      const q = questionMap.get(a.questionId);
      if (!q) {
        throw new Error(`Question ${a.questionId} does not belong to this assessment`);
      }

      if (q.type === QuestionType.MCQ && a.selectedIndex !== undefined) {
        if (a.selectedIndex < 0 || a.selectedIndex >= q.options.length) {
          throw new Error(`Selected option index out of range for question ${q.id}`);
        }
      }

      if (q.type === QuestionType.HANDWRITTEN) {
        if (a.answerText && a.answerText.trim().length > 0 && scanFiles?.has(a.questionId)) {
          const err = new Error(`Question ${a.questionId} cannot carry both text and a scan`);
          (err as any).statusCode = 400;
          throw err;
        }
      }
    }

    // Process and store scans BEFORE transaction
    const storedScans = new Map<string, { relPath: string; base64: string; mediaType: 'image/jpeg' }>();
    if (scanFiles && scanFiles.size > 0) {
      for (const [qId, file] of scanFiles.entries()) {
        const stored = await processAndStoreScan(file.buffer);
        storedScans.set(qId, stored);
      }
    }

    const answerMap = new Map(answers.map((a) => [a.questionId, a]));
    const handwrittenSubIds: string[] = [];

    let txResult;
    try {
      txResult = await prisma.$transaction(async (tx) => {
        let autoGraded = 0;
        let pendingGrading = 0;
        let mcqScore = 0;
        let mcqMax = 0;
        let submissionCount = 0;
        const gradedConceptIds = new Set<string>();

        for (const q of assessment.questions) {
          const ans = answerMap.get(q.id);

          if (q.type === QuestionType.MCQ) {
            mcqMax += q.maxMarks;
            const isAnswered = ans !== undefined && ans.selectedIndex !== undefined;
            const selectedIndex = isAnswered ? ans.selectedIndex! : null;
            const isCorrect = isAnswered && selectedIndex === q.correctIndex;
            const marks = isCorrect ? q.maxMarks : 0;
            mcqScore += marks;
            autoGraded++;
            submissionCount++;
            gradedConceptIds.add(q.conceptId);

            const sub = await tx.submission.create({
              data: {
                assessmentId,
                questionId: q.id,
                userId: studentId,
                selectedIndex,
                score: marks,
                submittedAt: new Date(),
                gradedAt: new Date(),
              },
            });

            await tx.grade.create({
              data: {
                submissionId: sub.id,
                totalMarks: marks,
                confidence: 1.0,
                needsReview: false,
                graderType: 'AUTO',
                summary: q.modelAnswer ?? null,
                missingPoints: [],
              },
            });
          } else if (q.type === QuestionType.SHORT) {
            if (ans && ans.answerText && ans.answerText.trim().length > 0) {
              pendingGrading++;
              submissionCount++;
              await tx.submission.create({
                data: {
                  assessmentId,
                  questionId: q.id,
                  userId: studentId,
                  answerText: ans.answerText.trim(),
                  submittedAt: new Date(),
                },
              });
            }
            // Questions left unanswered are skipped for SHORT
          } else if (q.type === QuestionType.HANDWRITTEN) {
            if (storedScans.has(q.id)) {
              const scan = storedScans.get(q.id)!;
              pendingGrading++;
              submissionCount++;
              const sub = await tx.submission.create({
                data: {
                  assessmentId,
                  questionId: q.id,
                  userId: studentId,
                  scanPath: scan.relPath,
                  ocrStatus: null,
                  submittedAt: new Date(),
                },
              });
              handwrittenSubIds.push(sub.id);
            }
            // Questions left without scan are skipped for HANDWRITTEN
          }
        }

        // Recompute mastery for distinct conceptIds among newly graded questions
        for (const conceptId of gradedConceptIds) {
          await masteryService.recomputeMastery(studentId, conceptId, tx);
        }

        return {
          submissionCount,
          autoGraded,
          pendingGrading,
          mcqScore,
          mcqMax,
        };
      });
    } catch (err) {
      // Rollback: delete stored scan files
      for (const scan of storedScans.values()) {
        await deleteStoredScan(scan.relPath);
      }
      throw err;
    }

    // AFTER commit: run processHandwrittenSubmissions with GRADING_CONCURRENCY
    const handwrittenReceived = handwrittenSubIds.length;
    let handwrittenNeedReview = 0;
    if (handwrittenSubIds.length > 0) {
      try {
        const procResult = await processHandwrittenSubmissions(handwrittenSubIds);
        handwrittenNeedReview = procResult.needReview;
      } catch (err) {
        console.error('Error in post-submit processHandwrittenSubmissions:', err);
      }
    }

    return {
      ...txResult,
      handwrittenReceived,
      handwrittenNeedReview,
    };
  }

  async getMyResult(assessmentId: string, studentId: string) {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        questions: {
          include: {
            concept: true,
            rubrics: { orderBy: { createdAt: 'asc' } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!assessment) {
      const err = new Error('Assessment not found');
      (err as any).statusCode = 404;
      throw err;
    }

    // Verify student is enrolled in the course
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: studentId,
          courseId: assessment.courseId,
        },
      },
    });

    if (!enrollment) {
      const err = new Error('You are not enrolled in this course');
      (err as any).statusCode = 403;
      throw err;
    }

    const submissions = await prisma.submission.findMany({
      where: { assessmentId, userId: studentId },
      include: { grade: true },
    });

    if (submissions.length === 0) {
      const err = new Error('You have not submitted this assessment yet');
      (err as any).statusCode = 403;
      throw err;
    }

    const subMap = new Map(submissions.map((s) => [s.questionId, s]));

    const questions = assessment.questions.map((q) => {
      const sub = subMap.get(q.id);
      const grade = sub?.grade;
      const isGraded = Boolean(grade);
      const marksObtained = grade ? (grade.finalMarks ?? grade.totalMarks) : null;

      if (q.type === QuestionType.MCQ) {
        const gradeInfo = isGraded && grade
          ? {
              marks: grade.finalMarks ?? grade.totalMarks,
              confidence: grade.confidence,
              summary: grade.summary,
            }
          : null;

        return {
          questionId: q.id,
          conceptId: q.conceptId,
          conceptName: q.concept.title,
          prompt: q.prompt,
          type: q.type,
          maxMarks: q.maxMarks,
          options: q.options,
          studentAnswer: sub?.selectedIndex ?? null,
          submissionId: sub?.id ?? null,
          scanPath: sub?.scanPath ?? null,
          ocrStatus: sub?.ocrStatus ?? null,
          ocrOriginal: sub?.ocrOriginal ?? null,
          correctIndex: q.correctIndex,
          explanation: q.modelAnswer ?? null,
          marksObtained: marksObtained ?? 0,
          status: 'GRADED' as const,
          grade: gradeInfo,
        };
      }

      // SHORT question
      let shortGradeInfo = null;
      if (isGraded && grade) {
        let extraData: any = {};
        if (sub?.feedback) {
          try {
            extraData = JSON.parse(sub.feedback);
          } catch {
            // not json
          }
        }
        if (grade.summary && typeof grade.summary === 'string' && grade.summary.trim().startsWith('{')) {
          try {
            const parsedSummary = JSON.parse(grade.summary);
            extraData = { ...extraData, ...parsedSummary };
          } catch {
            // not json
          }
        }

        const rawCriteriaList: any[] = Array.isArray(extraData.criteria) ? extraData.criteria : [];
        const criteria = q.rubrics.map((rc, idx) => {
          const match = rawCriteriaList.find((c: any) => c.criterionId === rc.id) ?? rawCriteriaList[idx];
          return {
            criterionId: rc.id,
            description: rc.description,
            maxMarks: rc.marks,
            awarded: typeof match?.awarded === 'number' ? match.awarded : 0,
            justification: match?.justification ?? '',
            evidenceSpan: match?.evidenceSpan ?? null,
          };
        });

        const overriddenBy = grade.overriddenBy ?? extraData.overriddenBy ?? null;
        const reviewedBy = grade.reviewedBy ?? null;
        const overrideNote = grade.overrideNote ?? null;
        const autoMarks = grade.totalMarks;
        const finalMarks = grade.finalMarks ?? grade.totalMarks;
        const overridden = Boolean(
          overriddenBy !== null ||
          (grade.finalMarks !== null && grade.finalMarks !== undefined && grade.finalMarks !== grade.totalMarks)
        );
        const provisional = Boolean(grade.needsReview && overriddenBy === null && !overridden && reviewedBy === null);
        const reviewed = Boolean(reviewedBy !== null && !overridden);
        const summary = (typeof extraData.summary === 'string' ? extraData.summary : grade.summary) ?? null;
        const missingPoints = Array.isArray(grade.missingPoints) && grade.missingPoints.length > 0
          ? grade.missingPoints
          : Array.isArray(extraData.missingPoints)
          ? extraData.missingPoints
          : [];

        shortGradeInfo = {
          criteria,
          missingPoints,
          summary,
          confidenceLevel: getConfidenceLevel(grade.confidence),
          provisional,
          reviewed,
          overridden,
          overrideNote,
          autoMarks,
          finalMarks,
        };
      }

      return {
        questionId: q.id,
        conceptId: q.conceptId,
        conceptName: q.concept.title,
        prompt: q.prompt,
        type: q.type,
        maxMarks: q.maxMarks,
        studentAnswer: sub?.answerText ?? null,
        submissionId: sub?.id ?? null,
        scanPath: sub?.scanPath ?? null,
        ocrStatus: sub?.ocrStatus ?? null,
        ocrOriginal: sub?.ocrOriginal ?? null,
        marksObtained,
        status: isGraded ? ('GRADED' as const) : ('PENDING' as const),
        grade: shortGradeInfo,
        rubrics: q.rubrics,
      };
    });

    // Summary calculation
    let totalAwarded = 0;
    let totalMax = 0;
    let gradedCount = 0;
    let pendingCount = 0;
    let gradedMax = 0;

    for (const q of questions) {
      totalMax += q.maxMarks;
      if (q.status === 'GRADED') {
        gradedCount++;
        totalAwarded += q.marksObtained ?? 0;
        gradedMax += q.maxMarks;
      } else {
        pendingCount++;
      }
    }

    const percentage =
      gradedCount > 0 && gradedMax > 0
        ? Math.round((totalAwarded / gradedMax) * 10000) / 100
        : null;

    const summary = {
      totalAwarded,
      totalMax,
      gradedCount,
      pendingCount,
      percentage,
    };

    // Concepts calculation:
    // Only include concepts that had at least one GRADED question in this assessment.
    const conceptMap = new Map<
      string,
      { conceptId: string; name: string; awarded: number; max: number; hasGraded: boolean }
    >();

    for (const q of questions) {
      if (!conceptMap.has(q.conceptId)) {
        conceptMap.set(q.conceptId, {
          conceptId: q.conceptId,
          name: q.conceptName,
          awarded: 0,
          max: 0,
          hasGraded: false,
        });
      }
      const c = conceptMap.get(q.conceptId)!;
      c.max += q.maxMarks;
      if (q.status === 'GRADED') {
        c.hasGraded = true;
        c.awarded += q.marksObtained ?? 0;
      }
    }

    const conceptsResult = [];
    for (const c of conceptMap.values()) {
      if (!c.hasGraded) continue;

      // masteryAfter = current Mastery score (default 0.5 if none)
      const currentMastery = await prisma.mastery.findUnique({
        where: {
          userId_conceptId: {
            userId: studentId,
            conceptId: c.conceptId,
          },
        },
      });
      const masteryAfter = currentMastery?.score ?? 0.5;

      // masteryBefore = computeMastery over this student's graded items for that concept EXCLUDING submissions from this assessment
      const priorGrades = await prisma.grade.findMany({
        where: {
          submission: {
            userId: studentId,
            assessmentId: { not: assessmentId },
            question: {
              conceptId: c.conceptId,
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

      const priorItems: GradedItem[] = [];
      for (const g of priorGrades) {
        const q = g.submission.question;
        if (q && q.maxMarks > 0) {
          const marks = g.finalMarks ?? g.totalMarks;
          priorItems.push({ ratio: marks / q.maxMarks });
        }
      }
      const masteryBefore = computeMastery(priorItems).score;

      conceptsResult.push({
        conceptId: c.conceptId,
        name: c.name,
        awarded: c.awarded,
        max: c.max,
        masteryBefore,
        masteryAfter,
      });
    }

    return {
      summary,
      concepts: conceptsResult,
      questions,
    };
  }

  async getResultsSummary(assessmentId: string, teacherId: string, userRole: Role) {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        course: true,
        questions: {
          include: {
            submissions: {
              include: { grade: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!assessment) {
      throw new Error('Assessment not found');
    }

    if (userRole !== Role.ADMIN && assessment.course.teacherId !== teacherId) {
      throw new Error('Unauthorized: You do not own this course');
    }

    return assessment.questions.map((q) => {
      const gradedSubs = q.submissions.filter((s) => s.grade !== null);
      let averageRatio = 0;

      if (gradedSubs.length > 0 && q.maxMarks > 0) {
        const sumRatio = gradedSubs.reduce((acc, s) => {
          const marks = s.grade!.finalMarks ?? s.grade!.totalMarks;
          return acc + marks / q.maxMarks;
        }, 0);
        averageRatio = Math.round((sumRatio / gradedSubs.length) * 10000) / 10000;
      }

      return {
        questionId: q.id,
        prompt: q.prompt,
        type: q.type,
        maxMarks: q.maxMarks,
        submissionCount: q.submissions.length,
        averageRatio,
      };
    });
  }
}

export const assessmentsService = new AssessmentsService();
