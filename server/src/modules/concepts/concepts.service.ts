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
}

export const conceptsService = new ConceptsService();
