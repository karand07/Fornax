import { prisma } from '../../lib/prisma.js';


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
   */
  async getPracticeQuestions(conceptId: string) {
    const concept = await prisma.concept.findUnique({
      where: { id: conceptId },
      include: {
        questions: {
          where: { type: 'MCQ' },
          select: {
            id: true,
            prompt: true,
            options: true,
            maxMarks: true,
            type: true,
          },
          take: 3,
        },
      },
    });

    if (!concept) {
      throw new Error('Concept not found');
    }

    if (concept.questions.length > 0) {
      return {
        conceptId: concept.id,
        conceptTitle: concept.title,
        questions: concept.questions.map((q) => ({
          id: q.id,
          prompt: q.prompt,
          options: q.options,
          maxMarks: q.maxMarks,
          type: q.type,
        })),
      };
    }

    // Diagnostic fallback questions if no MCQ questions are authored yet
    const titleLower = concept.title.toLowerCase();
    let fallbackQuestions: Array<{
      id: string;
      prompt: string;
      options: string[];
      maxMarks: number;
      type: string;
    }> = [];

    if (titleLower.includes('transaction') || titleLower.includes('concurrency')) {
      fallbackQuestions = [
        {
          id: `diag-${concept.id}-1`,
          prompt: 'Which ACID property guarantees that all operations within a transaction either completely succeed or roll back with no partial effects?',
          options: ['Atomicity', 'Consistency', 'Isolation', 'Durability'],
          maxMarks: 5,
          type: 'MCQ',
        },
        {
          id: `diag-${concept.id}-2`,
          prompt: 'Which transaction isolation level provides complete protection against dirty reads, non-repeatable reads, and phantom reads?',
          options: ['Read Uncommitted', 'Read Committed', 'Repeatable Read', 'Serializable'],
          maxMarks: 5,
          type: 'MCQ',
        },
      ];
    } else if (titleLower.includes('storage') || titleLower.includes('index') || titleLower.includes('tree')) {
      fallbackQuestions = [
        {
          id: `diag-${concept.id}-1`,
          prompt: 'Why are B+ trees widely preferred over binary search trees for disk-based database indexes?',
          options: [
            'High node fan-out keeps tree height small and dramatically reduces disk seek latency',
            'They require zero disk storage overhead compared to raw tables',
            'They guarantee O(1) constant-time search performance',
            'They do not require rebalancing during row insertions',
          ],
          maxMarks: 5,
          type: 'MCQ',
        },
        {
          id: `diag-${concept.id}-2`,
          prompt: 'In a clustered index on a relational database table, how are the actual data rows stored on disk?',
          options: [
            'Physically sorted in the order of the clustered index search key',
            'Stored as an unordered heap file in insertion sequence',
            'Organized strictly into hash buckets based on primary key modulo',
            'Scattered randomly across unallocated filesystem blocks',
          ],
          maxMarks: 5,
          type: 'MCQ',
        },
      ];
    } else {
      fallbackQuestions = [
        {
          id: `diag-${concept.id}-1`,
          prompt: `What is the primary architectural purpose of the concept "${concept.title}" in relational database systems?`,
          options: [
            'Providing foundational theoretical guarantees and structural integrity',
            'Bypassing query planning to write directly to raw hardware disk blocks',
            'Disabling schema validation to maximize unvalidated insert throughput',
            'Replacing all secondary indexes with linear memory scans',
          ],
          maxMarks: 5,
          type: 'MCQ',
        },
      ];
    }

    return {
      conceptId: concept.id,
      conceptTitle: concept.title,
      questions: fallbackQuestions,
    };
  }

  /**
   * Adaptive Learning: Submit Practice Drill Answers & Update Mastery
   */
  async submitPractice(
    conceptId: string,
    userId: string,
    answers: Array<{ questionId: string; selectedIndex: number }>
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
    const scoredResults: Array<{
      questionId: string;
      prompt: string;
      isCorrect: boolean;
      selectedIndex: number;
      correctIndex: number;
      correctAnswer: string;
      explanation: string;
      ratio: number;
    }> = [];

    for (const ans of answers) {
      const q = questionMap.get(ans.questionId);
      if (q && q.correctIndex !== null) {
        const isCorrect = ans.selectedIndex === q.correctIndex;
        if (isCorrect) correctCount++;
        scoredResults.push({
          questionId: q.id,
          prompt: q.prompt,
          isCorrect,
          selectedIndex: ans.selectedIndex,
          correctIndex: q.correctIndex,
          correctAnswer: q.options[q.correctIndex] || 'Option ' + q.correctIndex,
          explanation: q.modelAnswer || (isCorrect ? 'Correct! Excellent grasp of this concept.' : 'Review this concept in your study materials.'),
          ratio: isCorrect ? 1.0 : 0.0,
        });
      } else {
        // Fallback diagnostic grading (first option 0 is correct in fallback bank)
        const isCorrect = ans.selectedIndex === (ans.questionId.endsWith('2') && concept.title.toLowerCase().includes('transaction') ? 3 : 0);
        if (isCorrect) correctCount++;
        scoredResults.push({
          questionId: ans.questionId,
          prompt: `Conceptual practice question for ${concept.title}`,
          isCorrect,
          selectedIndex: ans.selectedIndex,
          correctIndex: ans.questionId.endsWith('2') && concept.title.toLowerCase().includes('transaction') ? 3 : 0,
          correctAnswer: isCorrect ? 'Your selected answer' : 'Foundational option',
          explanation: isCorrect ? 'Correct! Strong understanding of foundational theory.' : 'Review this topic to strengthen your prerequisite foundation.',
          ratio: isCorrect ? 1.0 : 0.0,
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
      results: scoredResults,
    };
  }
}

export const conceptsService = new ConceptsService();
