import { Request, Response } from 'express';
import { z } from 'zod';
import { authService } from './auth.service.js';
import type { Role } from '@prisma/client';

const roleEnum = z.enum(['STUDENT', 'TEACHER', 'ADMIN'] as const);

const registerSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: roleEnum.optional(),
});

const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ error });
      return;
    }

    try {
      const result = await authService.register(parseResult.data);
      res.status(201).json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      res.status(400).json({ error: msg });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ error });
      return;
    }

    try {
      const result = await authService.login(parseResult.data);
      res.status(200).json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      res.status(401).json({ error: msg });
    }
  }

  async getMe(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const user = await authService.getMe(req.user.userId);
      res.status(200).json(user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve profile';
      res.status(404).json({ error: msg });
    }
  }

  async getAllUsers(_req: Request, res: Response): Promise<void> {
    try {
      const users = await authService.getAllUsers();
      res.status(200).json(users);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve users';
      res.status(500).json({ error: msg });
    }
  }

  async updateUserRole(req: Request, res: Response): Promise<void> {
    const updateRoleSchema = z.object({
      role: roleEnum,
    });
    const parseResult = updateRoleSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = parseResult.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ error });
      return;
    }

    try {
      const updated = await authService.updateUserRole(req.params.id, parseResult.data.role);
      res.status(200).json(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update user role';
      res.status(400).json({ error: msg });
    }
  }

  async resetUserFace(req: Request, res: Response): Promise<void> {
    try {
      const updated = await authService.resetUserFace(req.params.id);
      res.status(200).json(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reset biometric descriptor';
      res.status(400).json({ error: msg });
    }
  }

  async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const requesterId = req.user?.userId;
      if (!requesterId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const result = await authService.deleteUser(req.params.id, requesterId);
      res.status(200).json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete user';
      res.status(400).json({ error: msg });
    }
  }
}

export const authController = new AuthController();
