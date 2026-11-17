import path from 'path';
import fs from 'fs';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { Role } from '@prisma/client';

export class SubmissionsService {
  async getScanPath(
    submissionId: string,
    userId: string,
    userRole: Role
  ): Promise<string> {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        assessment: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!submission) {
      const err = new Error('Submission not found');
      (err as any).statusCode = 404;
      throw err;
    }

    const isStudentOwner = submission.userId === userId;
    const isTeacherOwner = submission.assessment.course.teacherId === userId;
    const isAdmin = userRole === Role.ADMIN;

    if (!isStudentOwner && !isTeacherOwner && !isAdmin) {
      const err = new Error('Unauthorized: You do not have permission to view this scan');
      (err as any).statusCode = 403;
      throw err;
    }

    if (!submission.scanPath) {
      const err = new Error('No scan found for this submission');
      (err as any).statusCode = 404;
      throw err;
    }

    const scanDir = path.resolve(process.cwd(), env.SCAN_DIR);
    const resolvedPath = path.resolve(scanDir, submission.scanPath);

    if (!resolvedPath.startsWith(scanDir)) {
      const err = new Error('Access denied: Path traversal detected');
      (err as any).statusCode = 403;
      throw err;
    }

    if (!fs.existsSync(resolvedPath)) {
      const err = new Error('Scan file not found');
      (err as any).statusCode = 404;
      throw err;
    }

    return resolvedPath;
  }
}

export const submissionsService = new SubmissionsService();
