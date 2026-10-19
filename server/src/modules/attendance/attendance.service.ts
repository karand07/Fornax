import { prisma } from '../../lib/prisma.js';
import { isFaceMatch } from '../../lib/face.js';
import crypto from 'crypto';

export class AttendanceService {
  async createSession(courseId: string, title: string) {
    const qrCodeToken = crypto.randomBytes(16).toString('hex');
    return prisma.classSession.create({
      data: {
        courseId,
        title,
        qrCodeToken,
        isActive: true,
      },
    });
  }

  async closeSession(sessionId: string) {
    return prisma.classSession.update({
      where: { id: sessionId },
      data: { isActive: false },
    });
  }

  async checkInViaQR(sessionId: string, userId: string, qrCodeToken: string) {
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error('Class session not found');
    }

    if (!session.isActive) {
      throw new Error('Attendance session is closed');
    }

    if (session.qrCodeToken !== qrCodeToken) {
      throw new Error('Invalid or expired QR token');
    }

    return prisma.attendanceRecord.upsert({
      where: {
        sessionId_userId: {
          sessionId,
          userId,
        },
      },
      update: {
        status: 'PRESENT',
        verifiedBy: 'QR',
        timestamp: new Date(),
      },
      create: {
        sessionId,
        userId,
        status: 'PRESENT',
        verifiedBy: 'QR',
      },
    });
  }

  async checkInViaFace(sessionId: string, userId: string, incomingDescriptor: number[]) {
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error('Class session not found');
    }

    if (!session.isActive) {
      throw new Error('Attendance session is closed');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.faceDescriptor) {
      throw new Error('Face descriptor is not enrolled for this user. Please register face profile first.');
    }

    const storedDescriptor: number[] = JSON.parse(user.faceDescriptor);
    const matched = isFaceMatch(storedDescriptor, incomingDescriptor);

    if (!matched) {
      throw new Error('Facial verification failed. Descriptors do not match.');
    }

    return prisma.attendanceRecord.upsert({
      where: {
        sessionId_userId: {
          sessionId,
          userId,
        },
      },
      update: {
        status: 'PRESENT',
        verifiedBy: 'FACE',
        timestamp: new Date(),
      },
      create: {
        sessionId,
        userId,
        status: 'PRESENT',
        verifiedBy: 'FACE',
      },
    });
  }

  async getSessionRecords(sessionId: string) {
    return prisma.attendanceRecord.findMany({
      where: { sessionId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { timestamp: 'desc' },
    });
  }

  async getStudentAttendance(userId: string) {
    return prisma.attendanceRecord.findMany({
      where: { userId },
      include: {
        session: {
          include: {
            course: { select: { code: true, title: true } },
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    });
  }
}

export const attendanceService = new AttendanceService();
