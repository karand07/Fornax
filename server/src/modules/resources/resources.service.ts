import { prisma } from '../../lib/prisma.js';
import { ResourceDifficulty, ResourceType } from '@prisma/client';

export class ResourcesService {
  async getAllResources(filters?: {
    conceptId?: string;
    difficulty?: ResourceDifficulty;
    type?: ResourceType;
  }) {
    return prisma.resource.findMany({
      where: {
        conceptId: filters?.conceptId,
        difficulty: filters?.difficulty,
        type: filters?.type,
      },
      include: {
        concept: {
          select: {
            id: true,
            title: true,
            order: true,
            courseId: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getResourceById(id: string) {
    const resource = await prisma.resource.findUnique({
      where: { id },
      include: {
        concept: {
          select: {
            id: true,
            title: true,
            order: true,
            course: {
              select: { id: true, title: true, code: true },
            },
          },
        },
      },
    });

    if (!resource) {
      throw new Error('Resource not found');
    }

    return resource;
  }

  async createResource(data: {
    title: string;
    description?: string;
    url?: string;
    type?: ResourceType;
    difficulty?: ResourceDifficulty;
    conceptId: string;
  }) {
    const concept = await prisma.concept.findUnique({
      where: { id: data.conceptId },
    });
    if (!concept) {
      throw new Error('Concept not found');
    }

    return prisma.resource.create({
      data: {
        title: data.title,
        description: data.description,
        url: data.url,
        type: data.type ?? ResourceType.ARTICLE,
        difficulty: data.difficulty ?? ResourceDifficulty.BEGINNER,
        conceptId: data.conceptId,
      },
      include: {
        concept: {
          select: { id: true, title: true, order: true },
        },
      },
    });
  }

  async updateResource(
    id: string,
    data: {
      title?: string;
      description?: string;
      url?: string;
      type?: ResourceType;
      difficulty?: ResourceDifficulty;
    }
  ) {
    const existing = await prisma.resource.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Resource not found');
    }

    return prisma.resource.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        url: data.url,
        type: data.type,
        difficulty: data.difficulty,
      },
      include: {
        concept: {
          select: { id: true, title: true, order: true },
        },
      },
    });
  }

  async deleteResource(id: string) {
    const existing = await prisma.resource.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Resource not found');
    }

    await prisma.resource.delete({ where: { id } });
    return { success: true };
  }
}

export const resourcesService = new ResourcesService();
