import { Router } from 'express';
import { profileController } from './profile.controller.js';
import { authMiddleware } from '../../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, (req, res) => profileController.getProfile(req, res));
router.patch('/', authMiddleware, (req, res) => profileController.updateProfile(req, res));
router.post('/face-enroll', authMiddleware, (req, res) => profileController.enrollFace(req, res));

export default router;
