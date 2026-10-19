import { prisma } from '../../lib/prisma.js';

export class MasteryService {
  async getStudentMastery(userId: string) {
    return prisma.masteryScore.findMany({
      where: { userId },
      orderBy: { topic: 'asc' },
    });
  }

  async updateMastery(userId: string, topic: string, level: number) {
    return prisma.masteryScore.upsert({
      where: {
        userId_topic: {
          userId,
          topic,
        },
      },
      update: { level },
      create: {
        userId,
        topic,
        level,
      },
    });
  }
}

export const masteryService = new MasteryService();
