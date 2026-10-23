import { Request, Response } from 'express';
import { z } from 'zod';
import { resourcesService } from './resources.service.js';
import { ResourceDifficulty, ResourceType } from '@prisma/client';

const createResourceSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  type: z.enum(['DOCUMENT', 'VIDEO', 'ARTICLE', 'EXERCISE']).optional(),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  conceptId: z.string().uuid('Valid concept ID is required'),
});

const updateResourceSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().optional(),
  url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  type: z.enum(['DOCUMENT', 'VIDEO', 'ARTICLE', 'EXERCISE']).optional(),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
});

export class ResourcesController {
  async getAllResources(req: Request, res: Response): Promise<void> {
    try {
      const conceptId = typeof req.query.conceptId === 'string' ? req.query.conceptId : undefined;
      const difficulty =
        typeof req.query.difficulty === 'string' &&
        Object.values(ResourceDifficulty).includes(req.query.difficulty as ResourceDifficulty)
          ? (req.query.difficulty as ResourceDifficulty)
          : undefined;
      const type =
        typeof req.query.type === 'string' &&
        Object.values(ResourceType).includes(req.query.type as ResourceType)
          ? (req.query.type as ResourceType)
          : undefined;

      const resources = await resourcesService.getAllResources({
        conceptId,
        difficulty,
        type,
      });
      res.status(200).json(resources);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch resources';
      res.status(500).json({ error: msg });
    }
  }

  async getResourceById(req: Request, res: Response): Promise<void> {
    try {
      const resource = await resourcesService.getResourceById(req.params.id);
      res.status(200).json(resource);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Resource not found';
      res.status(404).json({ error: msg });
    }
  }

  async createResource(req: Request, res: Response): Promise<void> {
    const parseResult = createResourceSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ error });
      return;
    }

    try {
      const resource = await resourcesService.createResource(parseResult.data);
      res.status(201).json(resource);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create resource';
      res.status(400).json({ error: msg });
    }
  }

  async updateResource(req: Request, res: Response): Promise<void> {
    const parseResult = updateResourceSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ error });
      return;
    }

    try {
      const resource = await resourcesService.updateResource(req.params.id, parseResult.data);
      res.status(200).json(resource);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update resource';
      res.status(400).json({ error: msg });
    }
  }

  async deleteResource(req: Request, res: Response): Promise<void> {
    try {
      const result = await resourcesService.deleteResource(req.params.id);
      res.status(200).json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete resource';
      res.status(400).json({ error: msg });
    }
  }
}

export const resourcesController = new ResourcesController();
