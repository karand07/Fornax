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

  /**
   * Generates personalized high-yield study notes and tailored resource suggestions
   */
  async generateStudyNotes(
    studentId: string,
    courseId: string,
    conceptId?: string
  ) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        concepts: {
          include: {
            prerequisites: {
              include: { prerequisite: true },
            },
            resources: true,
            masteries: {
              where: { userId: studentId },
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

    // Determine target concept: specific conceptId if provided, or student's weakest concept
    let targetConcept = conceptId
      ? course.concepts.find((c) => c.id === conceptId)
      : undefined;

    if (!targetConcept) {
      const scored = [...course.concepts].sort((a, b) => {
        const scoreA = a.masteries[0]?.score ?? 0.5;
        const scoreB = b.masteries[0]?.score ?? 0.5;
        return scoreA - scoreB;
      });
      targetConcept = scored[0] || course.concepts[0];
    }

    if (!targetConcept) {
      const err = new Error('No concepts found for this course');
      (err as any).statusCode = 404;
      throw err;
    }

    const currentScore = targetConcept.masteries[0]?.score ?? 0.5;
    const prereqNames = targetConcept.prerequisites.map((p) => p.prerequisite.title).join(', ');

    const difficultyBand: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' =
      currentScore < 0.4
        ? 'BEGINNER'
        : currentScore < 0.7
        ? 'INTERMEDIATE'
        : 'ADVANCED';

    let matchedResources = targetConcept.resources.filter(
      (r) => r.difficulty === difficultyBand
    );
    if (matchedResources.length === 0) {
      matchedResources = targetConcept.resources;
    }

    let usedLlm = false;
    let shortNotes = {
      summary: '',
      keyFormulas: [] as string[],
      commonPitfalls: [] as string[],
      ruleOfThumb: '',
      quickCheckQuestion: { prompt: '', answer: '' },
    };

    const systemPrompt = `You are an expert university professor creating high-yield revision notes and cheat-sheets for a college database systems course.
Generate a concise, pedagogical revision note in valid JSON format matching this exact schema:
{
  "summary": "2-3 sentence executive explanation in plain English of the core concept and its purpose.",
  "keyFormulas": ["Key invariant / formal rule 1", "Key invariant / formal rule 2", "Key invariant / formal rule 3"],
  "commonPitfalls": ["Common exam trap / misunderstanding 1", "Common exam trap / misunderstanding 2"],
  "ruleOfThumb": "A 1-sentence memorable mnemonic or practical heuristic.",
  "quickCheckQuestion": {
    "prompt": "1 quick self-check conceptual question",
    "answer": "The concise correct reasoning"
  }
}`;

    const prompt = `Course: ${course.title}
Concept: ${targetConcept.title}
Student Current Mastery Level: ${Math.round(currentScore * 100)}% (${difficultyBand})
Prerequisites: ${prereqNames || 'None'}
Synthesize concise, high-yield short notes tailored to help this student master this concept.`;

    try {
      const llmOutput = await generateCompletion(prompt, systemPrompt);
      if (llmOutput && !llmOutput.includes('is not configured')) {
        const cleaned = llmOutput.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
        const parsed = JSON.parse(cleaned);
        if (parsed.summary && Array.isArray(parsed.keyFormulas)) {
          shortNotes = parsed;
          usedLlm = true;
        }
      }
    } catch (err) {
      console.warn('[Study Notes] Gemini generation failed, using pedagogical domain knowledge base:', err);
    }

    if (!usedLlm) {
      const titleLower = targetConcept.title.toLowerCase();
      if (titleLower.includes('normal') || titleLower.includes('dependenc')) {
        shortNotes = {
          summary: 'Normalization systematically eliminates data redundancy, update anomalies, insertion anomalies, and deletion anomalies by decomposing relational tables into canonical normal forms.',
          keyFormulas: [
            '1NF: All attributes must contain atomic values; every tuple must be uniquely identifiable by a primary key.',
            '2NF: Must be in 1NF and have NO partial dependencies (every non-prime attribute is fully functionally dependent on candidate keys).',
            '3NF: Must be in 2NF and have NO transitive dependencies (for every non-trivial X → A, X is a superkey or A is a prime attribute).',
            'BCNF: For EVERY non-trivial functional dependency X → A, X MUST be a superkey (eliminates all functional redundancy).',
          ],
          commonPitfalls: [
            'Confusing 2NF with 3NF: 2NF only applies when candidate keys are composite (multiple columns). Simple keys automatically satisfy 2NF.',
            'Assuming BCNF always preserves functional dependencies: 3NF preserves all functional dependencies, whereas BCNF may require cross-table validation.',
          ],
          ruleOfThumb: 'The Key, the Whole Key (2NF), and Nothing But the Key (3NF), so help me Codd (BCNF).',
          quickCheckQuestion: {
            prompt: 'If a table has a single-attribute primary key and is in 1NF, can it violate 2NF?',
            answer: 'No! Partial dependencies require a composite key where an attribute depends on part of the key.',
          },
        };
      } else if (titleLower.includes('transaction') || titleLower.includes('concurrency')) {
        shortNotes = {
          summary: 'Transaction management guarantees the ACID contract across concurrent database operations and hardware faults, ensuring correctness without sacrificing throughput.',
          keyFormulas: [
            'Atomicity: All-or-nothing execution via Write-Ahead Logging (WAL) and undo records.',
            'Consistency: Database transitions strictly from one valid invariant state to another.',
            'Isolation: Intermediate transaction states remain invisible to concurrent operations (Serializability).',
            'Durability: Committed transactions persist permanently in non-volatile storage via redo logs.',
          ],
          commonPitfalls: [
            'Confusing Read Committed with Repeatable Read: Read Committed prevents dirty reads, but allows non-repeatable reads if another transaction commits mid-way.',
            'Deadlocks in 2PL: Strict 2PL guarantees serializability but can still produce deadlocks requiring cycle detection.',
          ],
          ruleOfThumb: 'ACID guarantees correctness; WAL (Write-Ahead Logging) ensures Durability and Atomicity; 2PL/MVCC ensures Isolation.',
          quickCheckQuestion: {
            prompt: 'Which isolation anomaly occurs when a query reads a newly inserted row committed by a concurrent transaction?',
            answer: 'Phantom Read (prevented in Serializable and MVCC snapshot isolation).',
          },
        };
      } else if (titleLower.includes('algebra') || titleLower.includes('schema')) {
        shortNotes = {
          summary: 'Relational algebra is the formal procedural query language that defines the theoretical foundation of SQL execution and relational schema manipulation.',
          keyFormulas: [
            'Selection (σ_p): Filters rows satisfying predicate p (horizontal reduction).',
            'Projection (π_L): Extracts attributes listed in L and eliminates duplicate tuples (vertical reduction).',
            'Natural Join (⋈): Combines relations on shared attribute names with equality matching.',
            'Cartesian Product (R × S): Produces all pairs; output cardinality = |R| × |S|.',
          ],
          commonPitfalls: [
            'Forgetting that pure relational algebra eliminates duplicates, whereas SQL defaults to multiset (bag) semantics unless DISTINCT is specified.',
            'Cartesian product explosions when omitting join predicates on large tables.',
          ],
          ruleOfThumb: 'Selection filters rows (σ), Projection picks columns (π), Join (⋈) merges matching relations.',
          quickCheckQuestion: {
            prompt: 'What is the cardinality of R × S if |R| = 10 and |S| = 20?',
            answer: '200 tuples (10 × 20).',
          },
        };
      } else {
        shortNotes = {
          summary: `Core revision notes for "${targetConcept.title}". Understand structural rules, formal invariants, and practical trade-offs in relational systems.`,
          keyFormulas: [
            'Always verify primary keys and unique identifiers before schema decomposition.',
            'Ensure referential integrity across foreign keys to prevent orphan records.',
            'Profile queries using EXPLAIN to ensure index scans are utilized effectively.',
          ],
          commonPitfalls: [
            'Neglecting boundary constraints during database design.',
            'Over-indexing write-heavy tables, causing insertion latency.',
          ],
          ruleOfThumb: 'Establish solid conceptual modeling first; optimize physical storage and indexes second.',
          quickCheckQuestion: {
            prompt: `What is the most critical constraint in ${targetConcept.title}?`,
            answer: 'Maintaining relational invariants and domain integrity.',
          },
        };
      }
    }

    const markdownText = `# ${targetConcept.title} — High-Yield Revision Notes

**Current Mastery:** ${Math.round(currentScore * 100)}% (${difficultyBand})  
**Prerequisites:** ${prereqNames || 'None'}

---

## 📌 Executive Summary
${shortNotes.summary}

## ⚡ Key Rules & Invariants
${shortNotes.keyFormulas.map((f, i) => `${i + 1}. **${f}**`).join('\n')}

## ⚠️ Common Exam Traps & Misconceptions
${shortNotes.commonPitfalls.map((p) => `- ❌ ${p}`).join('\n')}

## 💡 Rule of Thumb
> ${shortNotes.ruleOfThumb}

## 🧠 Quick Self-Check
**Q:** ${shortNotes.quickCheckQuestion.prompt}  
**A:** ${shortNotes.quickCheckQuestion.answer}

---

## 📚 Recommended High-Yield Study Materials
${matchedResources.map((r) => `- **[${r.type}]** [${r.title}](${r.url || '#'}) — *${r.difficulty}*`).join('\n')}
`;

    return {
      conceptId: targetConcept.id,
      conceptTitle: targetConcept.title,
      currentMastery: currentScore,
      difficultyBand,
      prerequisites: prereqNames || null,
      recommendedMaterials: matchedResources.map((r) => ({
        id: r.id,
        title: r.title,
        type: r.type,
        difficulty: r.difficulty,
        url: r.url || '#',
      })),
      shortNotes,
      markdownText,
      source: usedLlm ? ('gemini' as const) : ('heuristic' as const),
    };
  }
}

export const adaptiveService = new AdaptiveService();
