import { Router } from 'express';
import { conceptsController } from './concepts.controller.js';
import { authMiddleware } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/role.js';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', authMiddleware, (req, res) => conceptsController.getAllConcepts(req, res));
router.get('/:id', authMiddleware, (req, res) => conceptsController.getConceptById(req, res));
router.get('/:id/practice', authMiddleware, (req, res) => conceptsController.getPracticeQuestions(req, res));
router.post('/:id/practice', authMiddleware, (req, res) => conceptsController.submitPractice(req, res));

router.post(
  '/',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => conceptsController.createConcept(req, res)
);

router.put(
  '/:id',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => conceptsController.updateConcept(req, res)
);

router.delete(
  '/:id',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => conceptsController.deleteConcept(req, res)
);

router.post(
  '/:id/prerequisites',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => conceptsController.addPrerequisite(req, res)
);

router.delete(
  '/:id/prerequisites/:prerequisiteId',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN),
  (req, res) => conceptsController.removePrerequisite(req, res)
);

export default router;
