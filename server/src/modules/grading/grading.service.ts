import { prisma } from '../../lib/prisma.js';
import { generateCompletion, LlmClient, defaultLlmClient } from '../../lib/llm.js';
import { Role } from '@prisma/client';
import {
  getConfidenceLevel,
  LLM_MODEL,
  PROMPT_VERSION,
} from './grading.constants.js';
import { TRANSCRIBE_PROMPT_VERSION } from './transcribe.js';
import { masteryService } from '../mastery/mastery.service.js';
import { writeAudit } from '../../lib/audit.js';
import { computeWordLevenshtein } from '../../lib/wer.js';

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
    dataOrOptions?: {
      score?: number;
      feedback?: string;
      forceReview?: boolean;
      llm?: LlmClient;
    }
  ) {
    if (dataOrOptions && typeof dataOrOptions.score === 'number') {
      return prisma.submission.update({
        where: { id: submissionId },
        data: {
          score: dataOrOptions.score,
          feedback: dataOrOptions.feedback,
          gradedAt: new Date(),
        },
      });
    }

    return this.gradeShortOrHandwrittenSubmission(submissionId, dataOrOptions);
  }

  async gradeShortOrHandwrittenSubmission(
    submissionId: string,
    options?: { forceReview?: boolean; llm?: LlmClient }
  ) {
    const sub = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        question: {
          include: {
            rubrics: { orderBy: { createdAt: 'asc' } },
          },
        },
        assessment: true,
      },
    });

    if (!sub || !sub.question) {
      throw new Error('Submission or question not found');
    }

    const { question } = sub;
    const isHandwritten = question.type === 'HANDWRITTEN';

    // Blank-answer shortcut applies to typed SHORT only.
    // For handwriting, an empty transcript is UNREADABLE, never an automatic zero.
    const rawAnswer = (sub.answerText || '').trim();
    if (!isHandwritten && rawAnswer.length === 0) {
      const now = new Date();
      return prisma.$transaction(async (tx) => {
        await tx.grade.upsert({
          where: { submissionId: sub.id },
          create: {
            submissionId: sub.id,
            totalMarks: 0,
            finalMarks: 0,
            confidence: 1.0,
            needsReview: false,
            graderType: 'AUTO',
            summary: 'No answer provided.',
            missingPoints: [],
            gradedAt: now,
          },
          update: {
            totalMarks: 0,
            finalMarks: 0,
            confidence: 1.0,
            needsReview: false,
            graderType: 'AUTO',
            summary: 'No answer provided.',
            missingPoints: [],
            gradedAt: now,
          },
        });

        await tx.submission.update({
          where: { id: sub.id },
          data: {
            score: 0,
            gradedAt: now,
            feedback: JSON.stringify({
              criteria: question.rubrics.map((r) => ({
                criterionId: r.id,
                description: r.description,
                maxMarks: r.marks,
                awarded: 0,
                justification: 'No answer provided.',
                evidenceSpan: null,
              })),
              modelVersion: `${LLM_MODEL}|${PROMPT_VERSION}`,
            }),
          },
        });
      });
    }

    if (isHandwritten && rawAnswer.length === 0) {
      // Empty handwriting transcript is UNREADABLE, never an automatic zero. Do not create a grade.
      return null;
    }

    const systemPrompt = `You are an academic grader evaluating a student answer against rubric criteria.
Evaluate each criterion independently and award marks between 0 and maxMarks.
For each criterion, find exact supporting evidence text (evidenceSpan) from the student answer if present. If no supporting text is present in the answer, evidenceSpan MUST be null.
Return ONLY valid JSON matching this schema:
{
  "criteria": [
    {
      "criterionId": string,
      "awarded": number,
      "justification": string,
      "evidenceSpan": string | null
    }
  ],
  "summary": string,
  "missingPoints": string[],
  "confidence": number,
  "notes": string
}`;

    const userPrompt = `Question Prompt: ${question.prompt}
Max Marks: ${question.maxMarks}
Model Answer: ${question.modelAnswer || 'N/A'}

Rubric Criteria:
${question.rubrics.map((r) => `- ID: ${r.id} | Max Marks: ${r.marks} | Description: ${r.description}`).join('\n')}

Student Answer:
"${sub.answerText}"`;

    const client = options?.llm || defaultLlmClient;
    let responseText = '';
    if (client.generateCompletion) {
      responseText = await client.generateCompletion(userPrompt, systemPrompt);
    } else {
      responseText = await generateCompletion(userPrompt, systemPrompt);
    }

    let parsed: any;
    try {
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        criteria: question.rubrics.map((r) => ({
          criterionId: r.id,
          awarded: 0,
          justification: 'Could not parse grader evaluation.',
          evidenceSpan: null,
        })),
        summary: 'Evaluation pending review.',
        missingPoints: [],
        confidence: 0.5,
      };
    }

    const criteriaResults = question.rubrics.map((rc, idx) => {
      const match = Array.isArray(parsed.criteria)
        ? parsed.criteria.find((c: any) => c.criterionId === rc.id) ?? parsed.criteria[idx]
        : null;

      let awarded = typeof match?.awarded === 'number' ? match.awarded : 0;
      if (awarded < 0) awarded = 0;
      if (awarded > rc.marks) awarded = rc.marks;

      let evidenceSpan = match?.evidenceSpan ?? null;
      if (typeof evidenceSpan === 'string') {
        const spanClean = evidenceSpan.trim();
        if (spanClean.length === 0 || !rawAnswer.toLowerCase().includes(spanClean.toLowerCase())) {
          evidenceSpan = null;
        }
      } else {
        evidenceSpan = null;
      }

      return {
        criterionId: rc.id,
        description: rc.description,
        maxMarks: rc.marks,
        awarded,
        justification: match?.justification || '',
        evidenceSpan,
      };
    });

    const totalAwarded = Math.min(
      question.maxMarks,
      Math.max(
        0,
        criteriaResults.reduce((sum, c) => sum + c.awarded, 0)
      )
    );

    const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.85;
    const needsReview = options?.forceReview === true ? true : confidence < 0.8;
    const now = new Date();

    const modelVersion = isHandwritten
      ? `${LLM_MODEL}|${PROMPT_VERSION}|${TRANSCRIBE_PROMPT_VERSION}`
      : `${LLM_MODEL}|${PROMPT_VERSION}`;

    return prisma.$transaction(async (tx) => {
      const grade = await tx.grade.upsert({
        where: { submissionId: sub.id },
        create: {
          submissionId: sub.id,
          totalMarks: totalAwarded,
          finalMarks: null,
          confidence,
          needsReview,
          graderType: 'LLM',
          summary: parsed.summary || 'AI evaluation complete.',
          missingPoints: Array.isArray(parsed.missingPoints) ? parsed.missingPoints : [],
          gradedAt: now,
        },
        update: {
          totalMarks: totalAwarded,
          confidence,
          needsReview,
          graderType: 'LLM',
          summary: parsed.summary || 'AI evaluation complete.',
          missingPoints: Array.isArray(parsed.missingPoints) ? parsed.missingPoints : [],
          gradedAt: now,
        },
      });

      await tx.submission.update({
        where: { id: sub.id },
        data: {
          score: totalAwarded,
          feedback: JSON.stringify({
            criteria: criteriaResults,
            modelVersion,
            notes: parsed.notes || null,
          }),
          gradedAt: now,
        },
      });

      await masteryService.recomputeMastery(sub.userId, question.conceptId, tx);

      return grade;
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

    const scanAvailable = Boolean(submission.scanPath);
    const ocrEdited = Boolean(
      submission.ocrOriginal && submission.answerText !== submission.ocrOriginal
    );
    const gradeStale = Boolean(
      submission.ocrEditedAt &&
        submission.grade?.gradedAt &&
        new Date(submission.ocrEditedAt).getTime() > new Date(submission.grade.gradedAt).getTime()
    );

    const queueNav = await this.getQueueNavigation(
      submission.assessment.courseId,
      submission.id
    );

    if (!submission.grade) {
      return {
        id: submission.id,
        assessmentId: submission.assessmentId,
        courseId: submission.assessment.courseId,
        course: {
          id: submission.assessment.course.id,
          code: submission.assessment.course.code,
          title: submission.assessment.course.title,
        },
        questionId: submission.questionId,
        userId: submission.userId,
        student: submission.user,
        question: submission.question
          ? {
              id: submission.question.id,
              prompt: submission.question.prompt,
              maxMarks: submission.question.maxMarks,
              type: submission.question.type,
              modelAnswer: submission.question.modelAnswer ?? null,
              rubrics: submission.question.rubrics,
            }
          : null,
        answerText: submission.answerText,
        scanAvailable,
        scanPath: submission.scanPath ?? null,
        ocrStatus: submission.ocrStatus ?? null,
        ocrOriginal: submission.ocrOriginal ?? null,
        ocrEdited,
        ocrEditedAt: submission.ocrEditedAt ?? null,
        gradeStale: false,
        grade: null,
        queue: queueNav,
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

    const overriddenBy = submission.grade.overriddenBy ?? extraData.overriddenBy ?? null;
    const reviewedBy = submission.grade.reviewedBy ?? null;

    let reviewedByName: string | null = null;
    if (reviewedBy) {
      const reviewer = await prisma.user.findUnique({
        where: { id: reviewedBy },
        select: { firstName: true, lastName: true },
      });
      if (reviewer) {
        reviewedByName = `${reviewer.firstName} ${reviewer.lastName}`.trim();
      }
    }

    let overriddenByName: string | null = null;
    if (overriddenBy) {
      const overrider = await prisma.user.findUnique({
        where: { id: overriddenBy },
        select: { firstName: true, lastName: true },
      });
      if (overrider) {
        overriddenByName = `${overrider.firstName} ${overrider.lastName}`.trim();
      }
    }

    const autoMarks = submission.grade.totalMarks;
    const finalMarks = submission.grade.finalMarks ?? submission.grade.totalMarks;
    const overridden = Boolean(
      overriddenBy !== null ||
      (submission.grade.finalMarks !== null &&
        submission.grade.finalMarks !== undefined &&
        submission.grade.finalMarks !== submission.grade.totalMarks)
    );
    const provisional = Boolean(
      submission.grade.needsReview && overriddenBy === null && !overridden && reviewedBy === null
    );
    const reviewed = Boolean(reviewedBy !== null && !overridden);
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
      overriddenByName,
      overriddenAt: submission.grade.overriddenAt,
      overrideNote: submission.grade.overrideNote,
      reviewedBy,
      reviewedByName,
      reviewedAt: submission.grade.reviewedAt,
      overridden,
      provisional,
      reviewed,
      summary,
      missingPoints,
      criteria,
      notes: extraData.notes ?? null,
    };

    return {
      id: submission.id,
      assessmentId: submission.assessmentId,
      courseId: submission.assessment.courseId,
      course: {
        id: submission.assessment.course.id,
        code: submission.assessment.course.code,
        title: submission.assessment.course.title,
      },
      questionId: submission.questionId,
      userId: submission.userId,
      student: submission.user,
      question: submission.question
        ? {
            id: submission.question.id,
            prompt: submission.question.prompt,
            maxMarks: submission.question.maxMarks,
            type: submission.question.type,
            modelAnswer: submission.question.modelAnswer ?? null,
            rubrics: submission.question.rubrics,
          }
        : null,
      answerText: submission.answerText,
      scanAvailable,
      scanPath: submission.scanPath ?? null,
      ocrStatus: submission.ocrStatus ?? null,
      ocrOriginal: submission.ocrOriginal ?? null,
      ocrEdited,
      ocrEditedAt: submission.ocrEditedAt ?? null,
      gradeStale,
      grade: teacherGrade,
      queue: queueNav,
      submittedAt: submission.submittedAt,
      gradedAt: submission.gradedAt,
    };
  }

  async getReviewQueue(
    filters: {
      courseId?: string;
      assessmentId?: string;
      status?: 'pending' | 'done';
      limit?: number;
      offset?: number;
    },
    teacherId: string,
    userRole: Role
  ) {
    if (filters.courseId) {
      if (userRole !== Role.ADMIN) {
        const course = await prisma.course.findUnique({ where: { id: filters.courseId } });
        if (!course || course.teacherId !== teacherId) {
          const err = new Error('Unauthorized: You do not own this course');
          (err as any).statusCode = 403;
          throw err;
        }
      }
    } else if (filters.assessmentId) {
      const assessment = await prisma.assessment.findUnique({
        where: { id: filters.assessmentId },
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
    }

    let courseFilter: any = undefined;
    if (filters.courseId) {
      courseFilter = filters.courseId;
    } else if (userRole !== Role.ADMIN) {
      const teacherCourses = await prisma.course.findMany({
        where: { teacherId },
        select: { id: true },
      });
      courseFilter = { in: teacherCourses.map((c) => c.id) };
    }

    const whereClause: any = {
      question: {
        type: { in: ['SHORT', 'HANDWRITTEN'] },
      },
    };

    if (courseFilter) {
      whereClause.assessment = {
        courseId: courseFilter,
      };
    }

    if (filters.assessmentId) {
      whereClause.assessmentId = filters.assessmentId;
    }

    const submissions = await prisma.submission.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        assessment: {
          select: {
            id: true,
            title: true,
            courseId: true,
            course: { select: { id: true, code: true, title: true } },
          },
        },
        question: { select: { id: true, prompt: true, maxMarks: true, type: true } },
        grade: true,
      },
    });

    const isPendingTarget = (filters.status ?? 'pending') === 'pending';

    const filtered = submissions.filter((s) => {
      if (isPendingTarget) {
        // pending = submissions of SHORT or HANDWRITTEN questions where:
        // (Grade exists AND needsReview = true AND reviewedBy is null AND overriddenBy is null)
        // OR (HANDWRITTEN with no Grade, i.e. UNREADABLE or FAILED)
        // OR (typed SHORT with no Grade because grading failed).
        if (!s.grade) {
          return true;
        }
        return (
          s.grade.needsReview === true &&
          s.grade.reviewedBy === null &&
          s.grade.overriddenBy === null
        );
      } else {
        // done = Grades with reviewedBy or overriddenBy set.
        if (!s.grade) return false;
        return s.grade.reviewedBy !== null || s.grade.overriddenBy !== null;
      }
    });

    const mapped = filtered
      .filter((s) => s.question !== null)
      .map((s) => {
        const q = s.question!;
        const marks = s.grade ? (s.grade.finalMarks ?? s.grade.totalMarks) : null;
        const confidence = s.grade?.confidence ?? null;

        const reasons: string[] = [];
        if (q.type === 'HANDWRITTEN') {
          reasons.push('HANDWRITTEN');
        }
        if (s.grade && typeof s.grade.confidence === 'number' && s.grade.confidence < 0.7) {
          reasons.push('LOW_CONFIDENCE');
        }
        if ((s.answerText || '').length < 15) {
          reasons.push('VERY_SHORT_ANSWER');
        }
        if (!s.grade) {
          reasons.push('UNGRADED');
        }
        if (s.ocrStatus === 'UNREADABLE') {
          reasons.push('UNREADABLE');
        }
        if (s.ocrStatus === 'FAILED') {
          reasons.push('OCR_FAILED');
        }

        return {
          submissionId: s.id,
          studentName: `${s.user.firstName} ${s.user.lastName}`.trim(),
          courseId: s.assessment.courseId,
          courseCode: s.assessment.course?.code,
          courseTitle: s.assessment.course?.title,
          assessmentTitle: s.assessment.title,
          questionPrompt: (q.prompt || '').slice(0, 120),
          type: q.type,
          maxMarks: q.maxMarks,
          marks,
          confidence,
          reasons,
          submittedAt: s.submittedAt,
        };
      });

    // Order: UNGRADED/UNREADABLE first, then lowest confidence, then oldest
    mapped.sort((a, b) => {
      const aUngradedOrUnreadable =
        a.marks === null ||
        a.reasons.includes('UNREADABLE') ||
        a.reasons.includes('OCR_FAILED') ||
        a.reasons.includes('UNGRADED');
      const bUngradedOrUnreadable =
        b.marks === null ||
        b.reasons.includes('UNREADABLE') ||
        b.reasons.includes('OCR_FAILED') ||
        b.reasons.includes('UNGRADED');

      if (aUngradedOrUnreadable && !bUngradedOrUnreadable) return -1;
      if (!aUngradedOrUnreadable && bUngradedOrUnreadable) return 1;

      const aConf = a.confidence ?? 0;
      const bConf = b.confidence ?? 0;
      if (aConf !== bConf) {
        return aConf - bConf; // lowest confidence first
      }

      return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime(); // oldest first
    });

    const offset = filters.offset ?? 0;
    const limit = filters.limit ?? 50;
    const items = mapped.slice(offset, offset + limit);

    return {
      items,
      total: mapped.length,
    };
  }

  async getQueueNavigation(courseId: string, currentSubmissionId: string) {
    const queue = await this.getReviewQueue(
      { courseId, status: 'pending', limit: 1000, offset: 0 },
      '',
      Role.ADMIN
    );

    const index = queue.items.findIndex((item) => item.submissionId === currentSubmissionId);
    if (index === -1) {
      return { prevId: null, nextId: null };
    }

    const prevId = index > 0 ? queue.items[index - 1].submissionId : null;
    const nextId = index < queue.items.length - 1 ? queue.items[index + 1].submissionId : null;
    return { prevId, nextId };
  }

  async updateOcrTranscript(
    submissionId: string,
    text: string,
    teacherId: string,
    userRole: Role
  ) {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        assessment: { include: { course: true } },
        question: true,
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

    if (!submission.question) {
      const err = new Error('Question not found');
      (err as any).statusCode = 404;
      throw err;
    }

    if (submission.question.type !== 'HANDWRITTEN') {
      const err = new Error('OCR correction is only allowed for HANDWRITTEN questions');
      (err as any).statusCode = 400;
      throw err;
    }

    if (submission.answerText === text) {
      return submission;
    }

    const werResult = computeWordLevenshtein(submission.answerText || '', text);

    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        answerText: text,
        ocrEditedBy: teacherId,
        ocrEditedAt: new Date(),
      },
    });

    await writeAudit(null, {
      actorId: teacherId,
      action: 'OCR_EDIT',
      entityType: 'Submission',
      entityId: submissionId,
      before: {
        length: (submission.answerText || '').length,
        wordCount: werResult.refWords,
      },
      after: {
        length: text.length,
        wordCount: werResult.hypWords,
        wordEdits: werResult.edits,
      },
    });

    return updated;
  }

  async regradeSubmission(
    submissionId: string,
    force: boolean | undefined,
    teacherId: string,
    userRole: Role
  ) {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        assessment: { include: { course: true } },
        question: {
          include: { rubrics: { orderBy: { createdAt: 'asc' } } },
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

    if (!submission.question) {
      const err = new Error('Question not found');
      (err as any).statusCode = 404;
      throw err;
    }

    if (
      submission.question.type === 'HANDWRITTEN' &&
      (!submission.answerText || submission.answerText.trim().length === 0)
    ) {
      const err = new Error('Add the transcribed text first');
      (err as any).statusCode = 400;
      throw err;
    }

    const hasOverride = Boolean(
      submission.grade &&
        (submission.grade.overriddenBy !== null || submission.grade.finalMarks !== null)
    );

    if (hasOverride && !force) {
      const err = new Error('An override exists. Confirm force re-grade to clear it.');
      (err as any).statusCode = 409;
      throw err;
    }

    if (hasOverride && force) {
      await writeAudit(null, {
        actorId: teacherId,
        action: 'REGRADE_FORCE',
        entityType: 'Grade',
        entityId: submission.grade!.id,
        before: {
          finalMarks: submission.grade!.finalMarks,
          overriddenBy: submission.grade!.overriddenBy,
          overrideNote: submission.grade!.overrideNote,
        },
        after: null,
      });

      await prisma.grade.update({
        where: { id: submission.grade!.id },
        data: {
          finalMarks: null,
          overriddenBy: null,
          overriddenAt: null,
          overrideNote: null,
        },
      });
    }

    if (submission.grade) {
      await prisma.grade.update({
        where: { id: submission.grade.id },
        data: {
          reviewedBy: null,
          reviewedAt: null,
        },
      });
    }

    await this.gradeShortOrHandwrittenSubmission(submissionId, {
      forceReview: submission.question.type === 'HANDWRITTEN',
    });

    return this.getSubmissionById(submissionId, teacherId, userRole);
  }

  async approveGrade(submissionId: string, teacherId: string, userRole: Role) {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        assessment: { include: { course: true } },
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
      const err = new Error('No grade exists to approve. Grade or override first.');
      (err as any).statusCode = 400;
      throw err;
    }

    const gradeStale = Boolean(
      submission.ocrEditedAt &&
        submission.grade.gradedAt &&
        new Date(submission.ocrEditedAt).getTime() > new Date(submission.grade.gradedAt).getTime()
    );

    if (gradeStale) {
      const err = new Error('The text changed after grading. Re-grade first.');
      (err as any).statusCode = 409;
      throw err;
    }

    if (submission.grade.reviewedBy === teacherId && submission.grade.needsReview === false) {
      return { success: true, message: 'Already approved' };
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.grade.update({
        where: { id: submission.grade!.id },
        data: {
          reviewedBy: teacherId,
          reviewedAt: now,
          needsReview: false,
        },
      });

      await writeAudit(tx, {
        actorId: teacherId,
        action: 'APPROVE',
        entityType: 'Grade',
        entityId: submission.grade!.id,
        before: {
          needsReview: submission.grade!.needsReview,
          reviewedBy: submission.grade!.reviewedBy,
        },
        after: {
          needsReview: false,
          reviewedBy: teacherId,
        },
      });
    });

    return { success: true, message: 'Grade approved successfully' };
  }

  async overrideGrade(
    submissionId: string,
    data: { finalMarks: number; note: string },
    teacherId: string,
    userRole: Role
  ) {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        assessment: { include: { course: true } },
        question: true,
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

    if (!submission.question) {
      const err = new Error('Question not found');
      (err as any).statusCode = 404;
      throw err;
    }

    const { finalMarks, note } = data;
    const conceptId = submission.question.conceptId;

    if (finalMarks < 0 || finalMarks > submission.question.maxMarks) {
      const err = new Error(
        `finalMarks must be between 0 and ${submission.question.maxMarks}`
      );
      (err as any).statusCode = 400;
      throw err;
    }

    const remainder = Math.round(finalMarks * 100) % 25;
    if (remainder !== 0) {
      const err = new Error('finalMarks must be in steps of 0.25');
      (err as any).statusCode = 400;
      throw err;
    }

    if (!note || note.trim().length < 5 || note.trim().length > 500) {
      const err = new Error('Note must be between 5 and 500 characters');
      (err as any).statusCode = 400;
      throw err;
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      let gradeId: string;

      if (!submission.grade) {
        // Create manual grade when none exists
        const newGrade = await tx.grade.create({
          data: {
            submissionId,
            graderType: 'MANUAL',
            totalMarks: finalMarks,
            finalMarks,
            confidence: 1.0,
            needsReview: false,
            summary: note.trim(),
            overrideNote: note.trim(),
            overriddenBy: teacherId,
            overriddenAt: now,
            reviewedBy: teacherId,
            reviewedAt: now,
            gradedAt: now,
            missingPoints: [],
          },
        });
        gradeId = newGrade.id;

        await tx.submission.update({
          where: { id: submissionId },
          data: {
            score: finalMarks,
            gradedAt: now,
          },
        });

        await writeAudit(tx, {
          actorId: teacherId,
          action: 'OVERRIDE',
          entityType: 'Grade',
          entityId: gradeId,
          before: null,
          after: { finalMarks, note: note.trim() },
        });
      } else {
        // totalMarks (AI value) is NEVER changed!
        gradeId = submission.grade.id;
        await tx.grade.update({
          where: { id: gradeId },
          data: {
            finalMarks,
            overriddenBy: teacherId,
            overriddenAt: now,
            overrideNote: note.trim(),
            reviewedBy: teacherId,
            reviewedAt: now,
            needsReview: false,
          },
        });

        await tx.submission.update({
          where: { id: submissionId },
          data: {
            score: finalMarks,
          },
        });

        await writeAudit(tx, {
          actorId: teacherId,
          action: 'OVERRIDE',
          entityType: 'Grade',
          entityId: gradeId,
          before: {
            autoMarks: submission.grade.totalMarks,
            finalMarks: submission.grade.finalMarks,
          },
          after: { finalMarks, note: note.trim() },
        });
      }

      await masteryService.recomputeMastery(
        submission.userId,
        conceptId,
        tx
      );
    });

    return this.getSubmissionById(submissionId, teacherId, userRole);
  }

  async getAuditHistory(
    params: { entityType: string; entityId: string },
    teacherId: string,
    userRole: Role
  ) {
    const { entityType, entityId } = params;

    if (entityType === 'Submission') {
      const sub = await prisma.submission.findUnique({
        where: { id: entityId },
        include: { assessment: { include: { course: true } } },
      });
      if (!sub) {
        const err = new Error('Submission not found');
        (err as any).statusCode = 404;
        throw err;
      }
      if (userRole !== Role.ADMIN && sub.assessment.course.teacherId !== teacherId) {
        const err = new Error('Unauthorized: You do not own this course');
        (err as any).statusCode = 403;
        throw err;
      }
    } else if (entityType === 'Grade') {
      const grade = await prisma.grade.findUnique({
        where: { id: entityId },
        include: {
          submission: {
            include: { assessment: { include: { course: true } } },
          },
        },
      });
      if (!grade) {
        const err = new Error('Grade not found');
        (err as any).statusCode = 404;
        throw err;
      }
      if (
        userRole !== Role.ADMIN &&
        grade.submission.assessment.course.teacherId !== teacherId
      ) {
        const err = new Error('Unauthorized: You do not own this course');
        (err as any).statusCode = 403;
        throw err;
      }
    }

    const logs = await prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });

    const actorIds = [...new Set(logs.map((l) => l.actorId))];
    const users = await prisma.user.findMany({
      where: { id: { in: actorIds } },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return logs.map((log) => {
      const actor = userMap.get(log.actorId);
      const actorName = actor
        ? `${actor.firstName} ${actor.lastName}`.trim()
        : 'System';
      return {
        id: log.id,
        actorId: log.actorId,
        actor: actor || null,
        actorName,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        before: log.before,
        after: log.after,
        createdAt: log.createdAt,
      };
    });
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
