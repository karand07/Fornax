import { Router } from 'express';
import { authController } from './auth.controller.js';
import { authMiddleware } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/role.js';
import { Role } from '@prisma/client';

const router = Router();

router.post('/register', (req, res) => authController.register(req, res));
router.post('/login', (req, res) => authController.login(req, res));
router.get('/me', authMiddleware, (req, res) => authController.getMe(req, res));
router.get(
  '/users',
  authMiddleware,
  requireRole(Role.ADMIN),
  (req, res) => authController.getAllUsers(req, res)
);
router.patch(
  '/users/:id/role',
  authMiddleware,
  requireRole(Role.ADMIN),
  (req, res) => authController.updateUserRole(req, res)
);
router.post(
  '/users/:id/reset-face',
  authMiddleware,
  requireRole(Role.ADMIN),
  (req, res) => authController.resetUserFace(req, res)
);
router.delete(
  '/users/:id',
  authMiddleware,
  requireRole(Role.ADMIN),
  (req, res) => authController.deleteUser(req, res)
);

export default router;
