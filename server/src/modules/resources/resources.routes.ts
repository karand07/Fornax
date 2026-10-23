import { Router } from 'express';
import { resourcesController } from './resources.controller.js';
import { authMiddleware } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/role.js';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', authMiddleware, (req, res) => resourcesController.getAllResources(req, res));
router.get('/:id', authMiddleware, (req, res) => resourcesController.getResourceById(req, res));

router.post(
  '/',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => resourcesController.createResource(req, res)
);

router.put(
  '/:id',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => resourcesController.updateResource(req, res)
);

router.delete(
  '/:id',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => resourcesController.deleteResource(req, res)
);

export default router;
