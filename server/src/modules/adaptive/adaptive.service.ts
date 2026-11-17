import { prisma } from '../../lib/prisma.js';
import { masteryService } from '../mastery/mastery.service.js';
import { computeRisk } from '../profile/risk.js';
import { attendanceService } from '../attendance/attendance.service.js';
import { generateCompletion } from '../../lib/llm.js';
import { Role } from '@prisma/client';
import crypto from 'crypto';

export interface GeneratedQuizQuestion {
  id: string;
  conceptId: string;
  conceptTitle: string;
  prompt: string;
  options: string[];
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
}

interface StoredQuizQuestion extends GeneratedQuizQuestion {
  correctIndex: number;
  explanation: string;
}

interface StoredQuizSession {
  quizId: string;
  studentId: string;
  courseId: string;
  quizTitle: string;
  createdAt: number;
  questions: StoredQuizQuestion[];
}

// In-memory quiz session store with 2-hour TTL
const quizSessionCache = new Map<string, StoredQuizSession>();

function cleanExpiredSessions() {
  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
  for (const [id, session] of quizSessionCache.entries()) {
    if (session.createdAt < twoHoursAgo) {
      quizSessionCache.delete(id);
    }
  }
}

export class AdaptiveService {
  /**
   * Generates a personalized adaptive challenge quiz based on student mastery gaps
   */
  async generateAdaptiveQuiz(
    studentId: string,
    courseId: string,
    requesterId: string,
    requesterRole: Role
  ) {
    cleanExpiredSessions();

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        concepts: {
          include: {
            prerequisites: {
              include: { prerequisite: true },
            },
            questions: {
              where: { type: 'MCQ', correctIndex: { not: null } },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!course) {
      const err = new Error('Course not found');
      (err as any).statusCode = 404;
      throw err;
    }

    // 1. Fetch student's live course mastery
    const concepts = await masteryService.getCourseMasteryForStudent(
      studentId,
      courseId,
      requesterId,
      requesterRole
    );

    // 2. Identify weak concepts (< 0.70) or concepts needing reinforcement
    const weakConcepts = concepts
      .filter((c) => c.score < 0.7)
      .sort((a, b) => a.score - b.score);

    const targetConcepts =
      weakConcepts.length > 0 ? weakConcepts.slice(0, 3) : concepts.slice(0, 3);

    const conceptSummary = targetConcepts
      .map((c) => `${c.name} (Current Mastery: ${Math.round(c.score * 100)}%)`)
      .join(', ');

    const quizId = `ai-quiz-${crypto.randomUUID()}`;
    const quizTitle = `Adaptive Booster: ${targetConcepts.map((c) => c.name).slice(0, 2).join(' & ')}`;

    let generatedQuestions: StoredQuizQuestion[] = [];
    let usedLlm = false;

    // 3. Attempt dynamic generation with Gemini 1.5 Flash
    const systemPrompt = `You are an expert university professor creating an adaptive computer science diagnostic quiz.
The student needs remediation on: ${conceptSummary}.
Generate a targeted 3-question diagnostic quiz in valid JSON format.
Each question must test practical application and core principles for one of the target concepts.
Return JSON matching this exact structure:
{
  "questions": [
    {
      "conceptTitle": "Name of one of the target concepts",
      "prompt": "Clear, rigorous question prompt",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctIndex": 0,
      "difficulty": "BEGINNER" | "INTERMEDIATE" | "ADVANCED",
      "explanation": "Why the correct answer is right and the key principle."
    }
  ]
}`;

    const prompt = `Course: ${course.title} (${course.code})
Target Concepts to Test: ${conceptSummary}
Generate 3 distinct multiple-choice questions focusing on common misunderstandings and core rules.`;

    try {
      const llmOutput = await generateCompletion(prompt, systemPrompt);
      if (llmOutput && !llmOutput.includes('is not configured')) {
        const cleaned = llmOutput.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
          generatedQuestions = parsed.questions.map((q: any, idx: number) => {
            const matchedConcept =
              targetConcepts.find(
                (tc) =>
                  tc.name.toLowerCase().includes(String(q.conceptTitle || '').toLowerCase()) ||
                  String(q.conceptTitle || '').toLowerCase().includes(tc.name.toLowerCase())
              ) || targetConcepts[idx % targetConcepts.length];

            const diff =
              idx === 0
                ? ('BEGINNER' as const)
                : idx === 1
                ? ('INTERMEDIATE' as const)
                : ('ADVANCED' as const);

            return {
              id: `${quizId}-q-${idx + 1}`,
              conceptId: matchedConcept.conceptId,
              conceptTitle: matchedConcept.name,
              prompt: q.prompt,
              options: Array.isArray(q.options) && q.options.length === 4 ? q.options : ['A', 'B', 'C', 'D'],
              correctIndex: typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < 4 ? q.correctIndex : 0,
              difficulty: q.difficulty || diff,
              explanation: q.explanation || 'Key conceptual rule verified.',
            };
          });
          usedLlm = true;
        }
      }
    } catch (err) {
      console.warn('[Adaptive Quiz] Gemini generation call failed, falling back to course question bank:', err);
    }

    // 4. Fallback / Augment from verified course DB questions & rich diagnostic banks
    if (!usedLlm || generatedQuestions.length < 3) {
      const fallbackList: StoredQuizQuestion[] = [];

      for (let i = 0; i < targetConcepts.length && fallbackList.length < 3; i++) {
        const tc = targetConcepts[i];
        const dbConcept = course.concepts.find((c) => c.id === tc.conceptId);
        const dbQ = dbConcept?.questions[0];

        if (dbQ && dbQ.options.length >= 2 && dbQ.correctIndex !== null) {
          fallbackList.push({
            id: `${quizId}-q-${fallbackList.length + 1}`,
            conceptId: tc.conceptId,
            conceptTitle: tc.name,
            prompt: dbQ.prompt,
            options: dbQ.options,
            correctIndex: dbQ.correctIndex,
            difficulty: fallbackList.length === 0 ? 'BEGINNER' : fallbackList.length === 1 ? 'INTERMEDIATE' : 'ADVANCED',
            explanation: dbQ.modelAnswer || 'Correct! Foundational rule validated.',
          });
        } else {
          // Domain diagnostic question
          fallbackList.push({
            id: `${quizId}-q-${fallbackList.length + 1}`,
            conceptId: tc.conceptId,
            conceptTitle: tc.name,
            prompt: `In relational database design, which property is fundamental to the correct application of "${tc.name}"?`,
            options: [
              'Preserving integrity constraints, non-redundant dependencies, and valid keys',
              'Bypassing query planning to write unvalidated records directly to disk',
              'Disabling transaction isolation to maximize concurrent throughput',
              'Allowing duplicate rows without unique primary keys',
            ],
            correctIndex: 0,
            difficulty: fallbackList.length === 0 ? 'BEGINNER' : fallbackList.length === 1 ? 'INTERMEDIATE' : 'ADVANCED',
            explanation: `Ensuring structural integrity and avoiding redundant anomalies is the definitive requirement for ${tc.name}.`,
          });
        }
      }
      generatedQuestions = fallbackList;
    }

    // 5. Store session securely on server for grading verification
    quizSessionCache.set(quizId, {
      quizId,
      studentId,
      courseId,
      quizTitle,
      createdAt: Date.now(),
      questions: generatedQuestions,
    });

    // 6. Return safe payload to client (hiding correctIndex and model explanations until submit)
    const clientQuestions: GeneratedQuizQuestion[] = generatedQuestions.map((q) => ({
      id: q.id,
      conceptId: q.conceptId,
      conceptTitle: q.conceptTitle,
      prompt: q.prompt,
      options: q.options,
      difficulty: q.difficulty,
    }));

    return {
      quizId,
      quizTitle,
      targetConcepts: targetConcepts.map((c) => ({
        id: c.conceptId,
        name: c.name,
        score: c.score,
      })),
      estimatedTimeMinutes: 5,
      questions: clientQuestions,
      source: usedLlm ? ('gemini' as const) : ('course-bank' as const),
    };
  }

  /**
   * Submits adaptive quiz answers, calculates multi-concept EMA updates, and returns performance deltas
   */
  async submitAdaptiveQuiz(
    studentId: string,
    params: {
      courseId: string;
      quizId: string;
      answers: Array<{
        questionId: string;
        conceptId: string;
        selectedIndex: number;
        difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
      }>;
    }
  ) {
    const session = quizSessionCache.get(params.quizId);

    // If session expired or missing, reconstruct verification mapping from fallback
    const questionMap = new Map<string, StoredQuizQuestion>();
    if (session) {
      session.questions.forEach((q) => questionMap.set(q.id, q));
    }

    let correctCount = 0;
    const conceptRatios = new Map<string, { total: number; correct: number; ratios: number[] }>();

    const scoredResults: Array<{
      questionId: string;
      conceptId: string;
      conceptTitle: string;
      prompt: string;
      isCorrect: boolean;
      selectedIndex: number;
      correctIndex: number;
      selectedAnswer: string;
      correctAnswer: string;
      options: string[];
      explanation: string;
      difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    }> = [];

    for (const ans of params.answers) {
      const q = questionMap.get(ans.questionId);
      const correctIdx = q ? q.correctIndex : 0;
      const isCorrect = ans.selectedIndex === correctIdx;
      if (isCorrect) correctCount++;

      const cId = ans.conceptId || q?.conceptId || '';
      if (cId) {
        if (!conceptRatios.has(cId)) {
          conceptRatios.set(cId, { total: 0, correct: 0, ratios: [] });
        }
        const bucket = conceptRatios.get(cId)!;
        bucket.total++;
        if (isCorrect) bucket.correct++;
        bucket.ratios.push(isCorrect ? 1.0 : 0.0);
      }

      const options = q?.options || [
        'Preserving integrity constraints, non-redundant dependencies, and valid keys',
        'Bypassing query planning to write unvalidated records directly to disk',
        'Disabling transaction isolation to maximize concurrent throughput',
        'Allowing duplicate rows without unique primary keys',
      ];

      scoredResults.push({
        questionId: ans.questionId,
        conceptId: cId,
        conceptTitle: q?.conceptTitle || 'Course Concept',
        prompt: q?.prompt || 'Diagnostic Assessment Question',
        isCorrect,
        selectedIndex: ans.selectedIndex,
        correctIndex: correctIdx,
        selectedAnswer: options[ans.selectedIndex] || `Option ${ans.selectedIndex + 1}`,
        correctAnswer: options[correctIdx] || options[0],
        options,
        explanation: q?.explanation || (isCorrect ? 'Correct! Strong understanding verified.' : 'Review this concept to master core principles.'),
        difficulty: ans.difficulty || q?.difficulty || 'INTERMEDIATE',
      });
    }

    // 1. Multi-concept EMA updates
    const conceptUpdates: Array<{
      conceptId: string;
      conceptTitle: string;
      previousScore: number;
      newScore: number;
      delta: number;
    }> = [];

    for (const [conceptId, stats] of conceptRatios.entries()) {
      const conceptRow = await prisma.concept.findUnique({
        where: { id: conceptId },
        select: { title: true },
      });

      const masteryRecord = await prisma.mastery.findUnique({
        where: { userId_conceptId: { userId: studentId, conceptId } },
      });

      const prevScore = masteryRecord ? masteryRecord.score : 0.5;
      let score = prevScore;
      let attempts = masteryRecord ? masteryRecord.attempts : 0;

      for (const ratio of stats.ratios) {
        const alpha = attempts < 3 ? 0.5 : 0.3;
        score = (1 - alpha) * score + alpha * ratio;
        attempts++;
      }

      score = Math.round(score * 10000) / 10000;

      await prisma.mastery.upsert({
        where: { userId_conceptId: { userId: studentId, conceptId } },
        create: { userId: studentId, conceptId, score, attempts },
        update: { score, attempts },
      });

      conceptUpdates.push({
        conceptId,
        conceptTitle: conceptRow?.title || 'Concept',
        previousScore: prevScore,
        newScore: score,
        delta: Math.round((score - prevScore) * 10000) / 10000,
      });
    }

    // 2. Re-compute overall student profile metrics & risk
    const allCourseConcepts = await prisma.concept.findMany({
      where: { courseId: params.courseId },
      include: {
        masteries: {
          where: { userId: studentId },
        },
      },
    });

    const assessedConcepts = allCourseConcepts.filter(
      (c) => c.masteries.length > 0 && c.masteries[0].attempts > 0
    );

    const newAvgMastery =
      assessedConcepts.length > 0
        ? assessedConcepts.reduce((acc, c) => acc + c.masteries[0].score, 0) /
          assessedConcepts.length
        : null;

    const attendance = await attendanceService.getMyCourseAttendance(studentId, params.courseId);
    const newRisk = computeRisk({ attendanceRate: attendance.rate, avgMastery: newAvgMastery });

    // Clean session from cache
    quizSessionCache.delete(params.quizId);

    return {
      quizTitle: session?.quizTitle || 'Adaptive Performance Booster',
      totalQuestions: scoredResults.length,
      correctCount,
      accuracyPercentage: Math.round((correctCount / scoredResults.length) * 100),
      conceptUpdates,
      newAvgMastery: newAvgMastery ? Math.round(newAvgMastery * 10000) / 10000 : null,
      riskLevel: newRisk.level,
      results: scoredResults,
    };
  }
}

export const adaptiveService = new AdaptiveService();
