import express from 'express';
import cors from 'cors';
import path from 'path';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error.js';

import authRouter from './modules/auth/auth.routes.js';
import coursesRouter from './modules/courses/courses.routes.js';
import attendanceRouter from './modules/attendance/attendance.routes.js';
import assessmentsRouter from './modules/assessments/assessments.routes.js';
import gradingRouter from './modules/grading/grading.routes.js';
import masteryRouter from './modules/mastery/mastery.routes.js';
import profileRouter from './modules/profile/profile.routes.js';
import analyticsRouter from './modules/analytics/analytics.routes.js';
import conceptsRouter from './modules/concepts/concepts.routes.js';
import resourcesRouter from './modules/resources/resources.routes.js';
import faceRouter from './modules/face/face.routes.js';

const app = express();

// Middlewares
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// Health check
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Module routes
app.use('/api/auth', authRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/concepts', conceptsRouter);
app.use('/api/resources', resourcesRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/assessments', assessmentsRouter);
app.use('/api/grading', gradingRouter);
app.use('/api/mastery', masteryRouter);
app.use('/api/profile', profileRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/face', faceRouter);

// Error Handling Middleware
app.use(errorHandler);

const PORT = env.PORT;
app.listen(PORT, () => {
  console.log(`🚀 Fornax API Server running on port ${PORT}`);
});

export default app;
