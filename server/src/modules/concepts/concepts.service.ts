import { prisma } from '../../lib/prisma.js';
import { generateCompletion } from '../../lib/llm.js';
import {
  TOPIC_QUESTIONS_BY_ID,
  sampleVaryingQuestions,
  getTopicQuestionsForConcept,
} from '../adaptive/topic-questions.js';


export class ConceptsService {
  async getAllConcepts(courseId?: string) {
    return prisma.concept.findMany({
      where: courseId ? { courseId } : undefined,
      include: {
        course: {
          select: { id: true, title: true, code: true },
        },
        resources: {
          orderBy: { createdAt: 'asc' },
        },
        prerequisites: {
          include: {
            prerequisite: {
              select: { id: true, title: true, order: true },
            },
          },
        },
        prerequisiteFor: {
          include: {
            concept: {
              select: { id: true, title: true, order: true },
            },
          },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  async getConceptById(id: string) {
    const concept = await prisma.concept.findUnique({
      where: { id },
      include: {
        course: {
          select: { id: true, title: true, code: true },
        },
        resources: {
          orderBy: { createdAt: 'asc' },
        },
        prerequisites: {
          include: {
            prerequisite: {
              select: { id: true, title: true, order: true },
            },
          },
        },
        prerequisiteFor: {
          include: {
            concept: {
              select: { id: true, title: true, order: true },
            },
          },
        },
      },
    });

    if (!concept) {
      throw new Error('Concept not found');
    }

    return concept;
  }

  async createConcept(data: {
    title: string;
    description?: string;
    order?: number;
    courseId: string;
    prerequisiteIds?: string[];
  }) {
    const course = await prisma.course.findUnique({ where: { id: data.courseId } });
    if (!course) {
      throw new Error('Course not found');
    }

    const concept = await prisma.concept.create({
      data: {
        title: data.title,
        description: data.description,
        order: data.order ?? 0,
        courseId: data.courseId,
      },
    });

    if (data.prerequisiteIds && data.prerequisiteIds.length > 0) {
      for (const prereqId of data.prerequisiteIds) {
        if (prereqId !== concept.id) {
          await prisma.conceptPrerequisite.create({
            data: {
              conceptId: concept.id,
              prerequisiteId: prereqId,
            },
          });
        }
      }
    }

    return this.getConceptById(concept.id);
  }

  async updateConcept(
    id: string,
    data: {
      title?: string;
      description?: string;
      order?: number;
      prerequisiteIds?: string[];
    }
  ) {
    const existing = await prisma.concept.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Concept not found');
    }

    await prisma.concept.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        order: data.order,
      },
    });

    if (data.prerequisiteIds !== undefined) {
      // Remove old prerequisites
      await prisma.conceptPrerequisite.deleteMany({
        where: { conceptId: id },
      });

      // Add new prerequisites
      for (const prereqId of data.prerequisiteIds) {
        if (prereqId !== id) {
          await prisma.conceptPrerequisite.create({
            data: {
              conceptId: id,
              prerequisiteId: prereqId,
            },
          });
        }
      }
    }

    return this.getConceptById(id);
  }

  async deleteConcept(id: string) {
    const existing = await prisma.concept.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Concept not found');
    }

    await prisma.concept.delete({ where: { id } });
    return { success: true };
  }

  async addPrerequisite(conceptId: string, prerequisiteId: string) {
    if (conceptId === prerequisiteId) {
      throw new Error('A concept cannot be a prerequisite of itself');
    }

    const [concept, prereq] = await Promise.all([
      prisma.concept.findUnique({ where: { id: conceptId } }),
      prisma.concept.findUnique({ where: { id: prerequisiteId } }),
    ]);

    if (!concept || !prereq) {
      throw new Error('One or both concepts do not exist');
    }

    return prisma.conceptPrerequisite.upsert({
      where: {
        conceptId_prerequisiteId: {
          conceptId,
          prerequisiteId,
        },
      },
      update: {},
      create: {
        conceptId,
        prerequisiteId,
      },
    });
  }

  async removePrerequisite(conceptId: string, prerequisiteId: string) {
    const edge = await prisma.conceptPrerequisite.findUnique({
      where: {
        conceptId_prerequisiteId: {
          conceptId,
          prerequisiteId,
        },
      },
    });

    if (!edge) {
      throw new Error('Prerequisite relationship not found');
    }

    await prisma.conceptPrerequisite.delete({
      where: {
        conceptId_prerequisiteId: {
          conceptId,
          prerequisiteId,
        },
      },
    });

    return { success: true };
  }

  /**
   * Adaptive Learning: Get Practice Questions for a Concept
   * Dynamically samples varying, topic-specific questions across difficulty tiers.
   */
  async getPracticeQuestions(conceptId: string) {
    const concept = await prisma.concept.findUnique({
      where: { id: conceptId },
      include: {
        prerequisites: {
          include: { prerequisite: true },
        },
        questions: {
          where: { type: 'MCQ' },
          select: {
            id: true,
            prompt: true,
            options: true,
            maxMarks: true,
            type: true,
          },
        },
      },
    });

    if (!concept) {
      throw new Error('Concept not found');
    }

    const prereqTitle = concept.prerequisites[0]?.prerequisite?.title;

    // Collect questions and assign tiered difficulty (BEGINNER, INTERMEDIATE, ADVANCED)
    const questions: Array<{
      id: string;
      prompt: string;
      options: string[];
      maxMarks: number;
      type: string;
      difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
      targetConcept?: string;
      isPrerequisiteAnchor?: boolean;
    }> = [];

    // 1. Sample fresh, varying topic-specific questions from our comprehensive question bank (1 per tier)
    const sampledTopicQuestions = sampleVaryingQuestions(concept.title, 1);
    for (const tq of sampledTopicQuestions) {
      questions.push({
        id: tq.id,
        prompt: tq.prompt,
        options: tq.options,
        maxMarks: 5,
        type: 'MCQ',
        difficulty: tq.difficulty,
      });
    }

    // 2. Include any existing teacher/course DB questions mapped to this concept
    concept.questions.forEach((q, idx) => {
      const diff: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' =
        idx === 0 ? 'BEGINNER' : idx === 1 ? 'INTERMEDIATE' : 'ADVANCED';
      if (!questions.some((existing) => existing.difficulty === diff)) {
        questions.push({
          id: q.id,
          prompt: q.prompt,
          options: q.options,
          maxMarks: q.maxMarks,
          type: q.type,
          difficulty: diff,
        });
      }
    });

    // 3. Ensure all 3 difficulty tiers are populated with topic-specific questions
    const tiers: Array<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'> = [
      'BEGINNER',
      'INTERMEDIATE',
      'ADVANCED',
    ];
    for (const tier of tiers) {
      if (!questions.some((q) => q.difficulty === tier)) {
        const fallbackPool = getTopicQuestionsForConcept(concept.title, tier);
        const fallbackQ = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
        if (fallbackQ) {
          questions.push({
            id: fallbackQ.id,
            prompt: fallbackQ.prompt,
            options: fallbackQ.options,
            maxMarks: 5,
            type: 'MCQ',
            difficulty: tier,
          });
        }
      }
    }

    // 4. Prerequisite Anchor Question if concept has an upstream prerequisite
    if (prereqTitle) {
      const prereqPool = getTopicQuestionsForConcept(prereqTitle, 'BEGINNER');
      const prereqQ = prereqPool[Math.floor(Math.random() * prereqPool.length)];
      if (prereqQ) {
        questions.push({
          id: prereqQ.id,
          prompt: `Foundation Check (${prereqTitle}): ${prereqQ.prompt}`,
          options: prereqQ.options,
          maxMarks: 5,
          type: 'MCQ',
          difficulty: 'BEGINNER',
          targetConcept: prereqTitle,
          isPrerequisiteAnchor: true,
        });
      }
    }

    return {
      conceptId: concept.id,
      conceptTitle: concept.title,
      adaptiveConfig: {
        startingDifficulty: 'BEGINNER' as const,
        targetQuestions: 3,
        difficultyTiers: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
      },
      questions,
    };
  }

  /**
   * Adaptive Learning: Submit Practice Drill Answers & Update Mastery
   */
  async submitPractice(
    conceptId: string,
    userId: string,
    answers: Array<{ questionId: string; selectedIndex: number; difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' }>
  ) {
    const concept = await prisma.concept.findUnique({
      where: { id: conceptId },
    });

    if (!concept) {
      throw new Error('Concept not found');
    }

    // Check DB questions
    const questionIds = answers.map((a) => a.questionId);
    const dbQuestions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
    });
    const questionMap = new Map(dbQuestions.map((q) => [q.id, q]));

    let correctCount = 0;
    const difficultyRank: Record<string, number> = { BEGINNER: 1, INTERMEDIATE: 2, ADVANCED: 3 };
    let peakDifficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' = 'BEGINNER';
    const trajectory: string[] = [];

    const scoredResults: Array<{
      questionId: string;
      prompt: string;
      isCorrect: boolean;
      selectedIndex: number;
      correctIndex: number;
      selectedAnswer: string;
      correctAnswer: string;
      options: string[];
      explanation: string;
      ratio: number;
      difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    }> = [];

    for (let i = 0; i < answers.length; i++) {
      const ans = answers[i];
      const diff = ans.difficulty || (i === 0 ? 'BEGINNER' : i === 1 ? 'INTERMEDIATE' : 'ADVANCED');
      trajectory.push(diff);

      const q = questionMap.get(ans.questionId);
      const tq = TOPIC_QUESTIONS_BY_ID.get(ans.questionId);

      if (q && q.correctIndex !== null) {
        const isCorrect = ans.selectedIndex === q.correctIndex;
        if (isCorrect) {
          correctCount++;
          if (difficultyRank[diff] >= difficultyRank[peakDifficulty]) {
            peakDifficulty = diff;
          }
        }
        scoredResults.push({
          questionId: q.id,
          prompt: q.prompt,
          isCorrect,
          selectedIndex: ans.selectedIndex,
          correctIndex: q.correctIndex,
          selectedAnswer: q.options[ans.selectedIndex] || `Option ${ans.selectedIndex + 1}`,
          correctAnswer: q.options[q.correctIndex] || `Option ${q.correctIndex + 1}`,
          options: q.options,
          explanation: q.modelAnswer || (isCorrect ? 'Correct! Excellent grasp of this concept.' : 'Review this concept in your study materials.'),
          ratio: isCorrect ? 1.0 : 0.0,
          difficulty: diff,
        });
      } else if (tq) {
        const isCorrect = ans.selectedIndex === tq.correctIndex;
        if (isCorrect) {
          correctCount++;
          if (difficultyRank[diff] >= difficultyRank[peakDifficulty]) {
            peakDifficulty = diff;
          }
        }
        scoredResults.push({
          questionId: tq.id,
          prompt: tq.prompt,
          isCorrect,
          selectedIndex: ans.selectedIndex,
          correctIndex: tq.correctIndex,
          selectedAnswer: tq.options[ans.selectedIndex] || `Option ${ans.selectedIndex + 1}`,
          correctAnswer: tq.options[tq.correctIndex] || `Option ${tq.correctIndex + 1}`,
          options: tq.options,
          explanation: tq.explanation,
          ratio: isCorrect ? 1.0 : 0.0,
          difficulty: diff,
        });
      } else {
        // Fallback safety if unrecognized ID
        const isCorrect = ans.selectedIndex === 0;
        if (isCorrect) {
          correctCount++;
          if (difficultyRank[diff] >= difficultyRank[peakDifficulty]) {
            peakDifficulty = diff;
          }
        }
        scoredResults.push({
          questionId: ans.questionId,
          prompt: `Conceptual practice question for ${concept.title}`,
          isCorrect,
          selectedIndex: ans.selectedIndex,
          correctIndex: 0,
          selectedAnswer: `Option ${ans.selectedIndex + 1}`,
          correctAnswer: 'Option 1',
          options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
          explanation: isCorrect ? 'Correct! Strong understanding of foundational theory.' : 'Review this topic to strengthen your foundation.',
          ratio: isCorrect ? 1.0 : 0.0,
          difficulty: diff,
        });
      }
    }

    // Retrieve current mastery record
    const currentMastery = await prisma.mastery.findUnique({
      where: { userId_conceptId: { userId, conceptId } },
    });

    const currentScore = currentMastery ? currentMastery.score : 0.5;
    const currentAttempts = currentMastery ? currentMastery.attempts : 0;

    // Apply EMA update formula (§5 mastery algorithm)
    let score = currentScore;
    let attempts = currentAttempts;

    for (const item of scoredResults) {
      const alpha = attempts < 3 ? 0.5 : 0.3;
      score = (1 - alpha) * score + alpha * item.ratio;
      attempts++;
    }

    score = Math.round(score * 10000) / 10000;

    // Persist updated mastery score
    await prisma.mastery.upsert({
      where: { userId_conceptId: { userId, conceptId } },
      create: { userId, conceptId, score, attempts },
      update: { score, attempts },
    });

    return {
      conceptId,
      conceptTitle: concept.title,
      totalQuestions: scoredResults.length,
      correctCount,
      previousScore: currentScore,
      newScore: score,
      delta: Math.round((score - currentScore) * 10000) / 10000,
      peakDifficultyAchieved: peakDifficulty,
      trajectory,
      results: scoredResults,
    };
  }

  /**
   * Explain student misconception using Gemini LLM (or pedagogic fallback)
   */
  async explainMisconception(
    conceptId: string,
    params: {
      questionPrompt: string;
      options?: string[];
      selectedAnswer: string;
      correctAnswer: string;
      generalExplanation?: string;
    }
  ) {
    const concept = await prisma.concept.findUnique({
      where: { id: conceptId },
      include: {
        prerequisites: {
          include: { prerequisite: true },
        },
      },
    });

    const conceptTitle = concept?.title || 'Database Systems';
    const prereqNames =
      concept?.prerequisites.map((p) => p.prerequisite.title).join(', ') ||
      'Foundation Principles';

    let aiResponseText = '';
    let usedLlm = false;

    const systemPrompt = `You are an expert university computer science professor and adaptive AI tutor.
A student answered a practice question incorrectly. Provide a pedagogical breakdown in valid JSON format with three exact keys:
- "misconceptionDiagnosis": Explain why the student's selected answer was tempting, what exact cognitive trap or conflated rule caused it.
- "corePrinciple": Explain the definitive rule or theorem that makes the correct answer true, linking it to foundational prerequisites (${prereqNames}).
- "memoryRule": Provide a 1-sentence intuitive rule of thumb, mental model, or mnemonic to never confuse these again.
Return ONLY valid JSON matching: {"misconceptionDiagnosis": "...", "corePrinciple": "...", "memoryRule": "..."}`;

    const prompt = `Course Concept: ${conceptTitle}
Prerequisites: ${prereqNames}
Question: ${params.questionPrompt}
${params.options && params.options.length > 0 ? `Available Options: ${params.options.join(' | ')}` : ''}
Student's Selected Answer (Incorrect): ${params.selectedAnswer}
Correct Answer: ${params.correctAnswer}
Standard Explanation: ${params.generalExplanation || 'None'}`;

    try {
      aiResponseText = await generateCompletion(prompt, systemPrompt);
      if (aiResponseText && !aiResponseText.includes('is not configured')) {
        usedLlm = true;
      }
    } catch (err) {
      console.warn('[AI Tutor] LLM call failed, using heuristic remediation:', err);
    }

    if (usedLlm) {
      try {
        const cleaned = aiResponseText.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
        const parsed = JSON.parse(cleaned);
        if (parsed.misconceptionDiagnosis && parsed.corePrinciple && parsed.memoryRule) {
          return {
            misconceptionDiagnosis: parsed.misconceptionDiagnosis,
            corePrinciple: parsed.corePrinciple,
            memoryRule: parsed.memoryRule,
            source: 'gemini' as const,
          };
        }
      } catch {
        if (aiResponseText.length > 20) {
          return {
            misconceptionDiagnosis: `Selecting "${params.selectedAnswer}" is a frequent misconception in ${conceptTitle}.`,
            corePrinciple: aiResponseText.slice(0, 350),
            memoryRule: `Key Takeaway: In ${conceptTitle}, verify against "${params.correctAnswer}".`,
            source: 'gemini' as const,
          };
        }
      }
    }

    // Heuristic pedagogical fallback when LLM API key is unconfigured or in offline environment
    return {
      misconceptionDiagnosis: `You selected "${params.selectedAnswer}". Students often pick this because it resembles a related rule, but it applies to a different stage or constraint in ${conceptTitle} rather than addressing the core question condition.`,
      corePrinciple: `The correct answer is "${params.correctAnswer}". In ${conceptTitle}, this principle is fundamental because it satisfies the formal definition and builds directly on ${prereqNames}. ${params.generalExplanation || ''}`.trim(),
      memoryRule: `Rule of Thumb: For ${conceptTitle}, remember that "${params.correctAnswer}" is the definitive requirement, whereas "${params.selectedAnswer}" is either secondary or belongs to an adjacent normal form / isolation tier.`,
      source: 'heuristic' as const,
    };
  }
}

export const conceptsService = new ConceptsService();
