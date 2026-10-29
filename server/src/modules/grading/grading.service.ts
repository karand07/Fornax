import { prisma } from '../../lib/prisma.js';
import { generateCompletion } from '../../lib/llm.js';
import { Role } from '@prisma/client';
import { getConfidenceLevel } from './grading.constants.js';

export class GradingService {
  async submitAssessment(data: {
    assessmentId: string;
    userId: string;
    content?: string;
    fileUrl?: string;
  }) {
    const existing = await prisma.submission.findFirst({
      where: {
        assessmentId: data.assessmentId,
        userId: data.userId,
      },
    });

    if (existing) {
      return prisma.submission.update({
        where: { id: existing.id },
        data: {
          content: data.content,
          fileUrl: data.fileUrl,
          submittedAt: new Date(),
        },
      });
    }

    return prisma.submission.create({
      data: {
        assessmentId: data.assessmentId,
        userId: data.userId,
        content: data.content,
        fileUrl: data.fileUrl,
      },
    });
  }

  async gradeSubmission(
    submissionId: string,
    data: { score: number; feedback?: string }
  ) {
    return prisma.submission.update({
      where: { id: submissionId },
      data: {
        score: data.score,
        feedback: data.feedback,
        gradedAt: new Date(),
      },
    });
  }

  async getAiAssistedFeedback(submissionId: string) {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        assessment: true,
        user: true,
      },
    });

    if (!submission) {
      throw new Error('Submission not found');
    }

    const prompt = `You are an academic instructor.
Assessment: ${submission.assessment.title}
Max Score: ${submission.assessment.maxScore}
Student Content: ${submission.content || 'No text content provided'}

Please provide concise, constructive feedback and an estimated score recommendation.`;

    const feedback = await generateCompletion(prompt, 'You are an objective and pedagogical grading assistant.');
    return { feedback };
  }

  async getSubmissionById(submissionId: string, teacherId: string, userRole: Role) {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        assessment: {
          include: { course: true },
        },
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        question: {
          include: {
            rubrics: { orderBy: { createdAt: 'asc' } },
          },
        },
        grade: true,
      },
    });

    if (!submission) {
      const err = new Error('Submission not found');
      (err as any).statusCode = 404;
      throw err;
    }

    if (userRole !== Role.ADMIN && submission.assessment.course.teacherId !== teacherId) {
      const err = new Error('Unauthorized: You do not own this course');
      (err as any).statusCode = 403;
      throw err;
    }

    if (!submission.grade) {
      return {
        id: submission.id,
        assessmentId: submission.assessmentId,
        questionId: submission.questionId,
        userId: submission.userId,
        student: submission.user,
        question: submission.question
          ? {
              id: submission.question.id,
              prompt: submission.question.prompt,
              maxMarks: submission.question.maxMarks,
              type: submission.question.type,
            }
          : null,
        answerText: submission.answerText,
        grade: null,
        submittedAt: submission.submittedAt,
        gradedAt: submission.gradedAt,
      };
    }

    let extraData: any = {};
    if (submission.feedback) {
      try {
        extraData = JSON.parse(submission.feedback);
      } catch {
        // ignore
      }
    }
    if (
      submission.grade.summary &&
      typeof submission.grade.summary === 'string' &&
      submission.grade.summary.trim().startsWith('{')
    ) {
      try {
        const parsedSummary = JSON.parse(submission.grade.summary);
        extraData = { ...extraData, ...parsedSummary };
      } catch {
        // ignore
      }
    }

    const rubrics = submission.question?.rubrics ?? [];
    const rawCriteriaList: any[] = Array.isArray(extraData.criteria) ? extraData.criteria : [];

    let criteria: any[] = [];
    if (rubrics.length > 0) {
      criteria = rubrics.map((rc, idx) => {
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
    } else if (rawCriteriaList.length > 0) {
      criteria = rawCriteriaList.map((c: any) => ({
        criterionId: c.criterionId,
        description: c.description ?? '',
        maxMarks: c.maxMarks ?? 0,
        awarded: c.awarded ?? 0,
        justification: c.justification ?? '',
        evidenceSpan: c.evidenceSpan ?? null,
      }));
    }

    const overriddenBy = extraData.overriddenBy ?? null;
    const autoMarks = submission.grade.totalMarks;
    const finalMarks = submission.grade.finalMarks ?? submission.grade.totalMarks;
    const overridden = Boolean(
      overriddenBy !== null ||
      (submission.grade.finalMarks !== null &&
        submission.grade.finalMarks !== undefined &&
        submission.grade.finalMarks !== submission.grade.totalMarks)
    );
    const provisional = Boolean(submission.grade.needsReview && overriddenBy === null && !overridden);
    const summary = (typeof extraData.summary === 'string' ? extraData.summary : submission.grade.summary) ?? null;
    const missingPoints =
      Array.isArray(submission.grade.missingPoints) && submission.grade.missingPoints.length > 0
        ? submission.grade.missingPoints
        : Array.isArray(extraData.missingPoints)
        ? extraData.missingPoints
        : [];

    const teacherGrade = {
      autoMarks,
      totalMarks: submission.grade.totalMarks,
      finalMarks,
      confidence: submission.grade.confidence,
      confidenceLevel: getConfidenceLevel(submission.grade.confidence),
      modelVersion: extraData.modelVersion ?? 'claude-3-5-sonnet',
      needsReview: submission.grade.needsReview,
      overriddenBy,
      overridden,
      provisional,
      summary,
      missingPoints,
      criteria,
      notes: extraData.notes ?? null,
    };

    return {
      id: submission.id,
      assessmentId: submission.assessmentId,
      questionId: submission.questionId,
      userId: submission.userId,
      student: submission.user,
      question: submission.question
        ? {
            id: submission.question.id,
            prompt: submission.question.prompt,
            maxMarks: submission.question.maxMarks,
            type: submission.question.type,
          }
        : null,
      answerText: submission.answerText,
      grade: teacherGrade,
      submittedAt: submission.submittedAt,
      gradedAt: submission.gradedAt,
    };
  }

  async getAssessmentSubmissions(assessmentId: string, teacherId: string, userRole: Role) {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { course: true },
    });

    if (!assessment) {
      const err = new Error('Assessment not found');
      (err as any).statusCode = 404;
      throw err;
    }

    if (userRole !== Role.ADMIN && assessment.course.teacherId !== teacherId) {
      const err = new Error('Unauthorized: You do not own this course');
      (err as any).statusCode = 403;
      throw err;
    }

    const submissions = await prisma.submission.findMany({
      where: {
        assessmentId,
        question: {
          type: 'SHORT',
        },
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        question: {
          select: { id: true, prompt: true, maxMarks: true, type: true },
        },
        grade: true,
      },
      orderBy: { submittedAt: 'desc' },
    });

    return submissions.map((s) => {
      let extraData: any = {};
      if (s.feedback) {
        try {
          extraData = JSON.parse(s.feedback);
        } catch {
          // ignore
        }
      }

      const overridden = s.grade
        ? Boolean(
            extraData.overriddenBy != null ||
            (s.grade.finalMarks !== null &&
              s.grade.finalMarks !== undefined &&
              s.grade.finalMarks !== s.grade.totalMarks)
          )
        : false;

      return {
        id: s.id,
        assessmentId: s.assessmentId,
        questionId: s.questionId,
        student: s.user,
        question: s.question,
        answerText: s.answerText,
        marks: s.grade ? (s.grade.finalMarks ?? s.grade.totalMarks) : null,
        autoMarks: s.grade ? s.grade.totalMarks : null,
        finalMarks: s.grade ? (s.grade.finalMarks ?? s.grade.totalMarks) : null,
        confidence: s.grade?.confidence ?? null,
        needsReview: s.grade ? s.grade.needsReview : false,
        overridden,
        submittedAt: s.submittedAt,
        gradedAt: s.gradedAt,
      };
    });
  }
}

export const gradingService = new GradingService();
