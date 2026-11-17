import { Router } from 'express';
import { submissionsController } from './submissions.controller.js';
import { authMiddleware } from '../../middleware/auth.js';

const router = Router();

router.get('/:id/scan', authMiddleware, (req, res) =>
  submissionsController.getScan(req, res)
);

export default router;
