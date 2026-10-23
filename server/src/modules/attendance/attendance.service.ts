import { prisma } from '../../lib/prisma.js';
import { isFaceMatch } from '../../lib/face.js';
import { generateRotatingHMAC, verifyRotatingCode } from '../../lib/token.js';
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
      include: {
        course: {
          select: { id: true, code: true, title: true },
        },
      },
    });
  }

  async startSession(sessionId: string) {
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error('Class session not found');
    }

    return prisma.classSession.update({
      where: { id: sessionId },
      data: { isActive: true },
      include: {
        course: {
          select: { id: true, code: true, title: true },
        },
      },
    });
  }

  async closeSession(sessionId: string) {
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error('Class session not found');
    }

    return prisma.classSession.update({
      where: { id: sessionId },
      data: { isActive: false },
      include: {
        course: {
          select: { id: true, code: true, title: true },
        },
      },
    });
  }

  async getSession(sessionId: string) {
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
      include: {
        course: {
          select: { id: true, code: true, title: true },
        },
        _count: {
          select: { attendances: true },
        },
      },
    });

    if (!session) {
      throw new Error('Class session not found');
    }

    return session;
  }

  async getSessionCode(sessionId: string) {
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error('Class session not found');
    }

    if (!session.isActive) {
      throw new Error('Class session is closed. Start the session to generate rotating codes.');
    }

    const codeData = generateRotatingHMAC(sessionId);
    return {
      sessionId: session.id,
      isActive: session.isActive,
      ...codeData,
    };
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

    // Verify rotating HMAC code (or static session.qrCodeToken as fallback)
    const isRotatingValid = verifyRotatingCode(sessionId, qrCodeToken);
    const isStaticValid = session.qrCodeToken && session.qrCodeToken === qrCodeToken;

    if (!isRotatingValid && !isStaticValid) {
      throw new Error('Invalid or expired attendance code. Please check the screen for the current code.');
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
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
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
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
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
