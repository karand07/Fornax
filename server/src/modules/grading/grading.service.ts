import { prisma } from '../../lib/prisma.js';
import { generateCompletion } from '../../lib/llm.js';

export class GradingService {
  async submitAssessment(data: {
    assessmentId: string;
    userId: string;
    content?: string;
    fileUrl?: string;
  }) {
    return prisma.submission.upsert({
      where: {
        assessmentId_userId: {
          assessmentId: data.assessmentId,
          userId: data.userId,
        },
      },
      update: {
        content: data.content,
        fileUrl: data.fileUrl,
        submittedAt: new Date(),
      },
      create: {
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
}

export const gradingService = new GradingService();
