import { Router } from 'express';
import { faceController } from './face.controller.js';
import { authMiddleware } from '../../middleware/auth.js';

const router = Router();

router.post('/enroll', authMiddleware, (req, res) => faceController.enroll(req, res));
router.get('/status', authMiddleware, (req, res) => faceController.getStatus(req, res));

export default router;
