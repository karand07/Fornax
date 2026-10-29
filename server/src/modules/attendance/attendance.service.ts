import { prisma } from '../../lib/prisma.js';
import { isFaceMatch, euclidean } from '../../lib/face.js';
import { generateRotatingHMAC, verifyRotatingCode, isValid } from '../../lib/token.js';
import { evaluateAttendanceIntegrity } from './attendance.rule.js';
import { Role, AttendanceStatus } from '@prisma/client';
import { Candidate, Match, matchPhoto, mergePhotoMatches, classify } from '../../lib/match.js';
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

  async closeSession(sessionId: string, teacherId?: string, userRole?: Role) {
    return prisma.$transaction(async (tx) => {
      const session = await tx.classSession.findUnique({
        where: { id: sessionId },
        include: {
          course: {
            include: {
              enrollments: { select: { userId: true } },
            },
          },
          attendances: { select: { userId: true } },
        },
      });

      if (!session) {
        throw new Error('Class session not found');
      }

      if (teacherId && userRole && userRole !== Role.ADMIN && session.course.teacherId !== teacherId) {
        throw new Error('Unauthorized: You do not own this course');
      }

      const existingUserIds = new Set(session.attendances.map((a) => a.userId));
      const missingStudentIds = session.course.enrollments
        .map((e) => e.userId)
        .filter((userId) => !existingUserIds.has(userId));

      if (missingStudentIds.length > 0) {
        await tx.attendanceRecord.createMany({
          data: missingStudentIds.map((userId) => ({
            sessionId,
            userId,
            status: 'ABSENT' as const,
            method: 'MANUAL',
            reviewedBy: null,
            verifiedBy: 'MANUAL',
            integrityScore: 0.0,
            codeValid: false,
            networkOk: false,
            livenessPassed: false,
          })),
          skipDuplicates: true,
        });
      }

      return tx.classSession.update({
        where: { id: sessionId },
        data: { isActive: false },
        include: {
          course: {
            select: { id: true, code: true, title: true },
          },
        },
      });
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

  async getMyCourseAttendance(studentId: string, courseId: string) {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: studentId,
          courseId,
        },
      },
    });

    if (!enrollment) {
      const err = new Error('You are not enrolled in this course');
      (err as any).statusCode = 403;
      throw err;
    }

    const sessions = await prisma.classSession.findMany({
      where: { courseId },
      include: {
        attendances: {
          where: { userId: studentId },
        },
      },
      orderBy: { sessionDate: 'desc' },
    });

    // An active (not ended) session is excluded.
    // A session is ended if windowEndsAt is not null or isActive is false.
    const endedSessions = sessions.filter((s) => {
      if (s.isActive && (!s.windowEndsAt || s.windowEndsAt.getTime() > Date.now())) {
        return false;
      }
      return s.windowEndsAt !== null || !s.isActive;
    });

    let present = 0;
    let flagged = 0;
    let absent = 0;

    const history = endedSessions.map((s) => {
      const rec = s.attendances[0];
      const status: AttendanceStatus = rec ? rec.status : AttendanceStatus.ABSENT;
      if (status === AttendanceStatus.PRESENT) {
        present++;
      } else if (status === AttendanceStatus.FLAGGED) {
        flagged++;
      } else {
        // Sessions with no record count as absent
        absent++;
      }
      return {
        sessionId: s.id,
        date: s.sessionDate,
        status,
      };
    });

    const totalSessions = endedSessions.length;

    // Rate rule, document it in a code comment: rate = present / totalSessions, where "present" = status PRESENT. FLAGGED counts as not present until a teacher approves it. totalSessions = 0 gives rate null.
    const rate = totalSessions === 0 ? null : present / totalSessions;

    return {
      totalSessions,
      present,
      flagged,
      absent,
      rate,
      history: history.slice(0, 20),
    };
  }

  async openMarkingWindow(sessionId: string, teacherId: string, userRole: Role, seconds: number = 90) {
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
      include: {
        course: { select: { id: true, teacherId: true } },
      },
    });

    if (!session) {
      throw new Error('Class session not found');
    }

    if (userRole !== Role.ADMIN && session.course.teacherId !== teacherId) {
      throw new Error('Unauthorized: You do not own this course');
    }

    if (!session.isActive) {
      throw new Error('Session must be active to open marking window');
    }

    const windowEndsAt = new Date(Date.now() + seconds * 1000);

    const updated = await prisma.classSession.update({
      where: { id: sessionId },
      data: { windowEndsAt },
      select: { windowEndsAt: true },
    });

    return { windowEndsAt: updated.windowEndsAt };
  }

  async checkCode(sessionId: string, studentId: string, code: string) {
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
      include: {
        course: { select: { id: true } },
      },
    });

    if (!session) {
      throw new Error('Class session not found');
    }

    // Verify student is enrolled in the course
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: studentId,
          courseId: session.courseId,
        },
      },
    });

    if (!enrollment) {
      throw new Error('You are not enrolled in this course');
    }

    if (!session.isActive) {
      throw new Error('Attendance session is closed');
    }

    if (!session.windowEndsAt || session.windowEndsAt.getTime() <= Date.now()) {
      throw new Error('Attendance marking window is closed');
    }

    if (!isValid(sessionId, code)) {
      throw new Error('Invalid or expired attendance code');
    }

    // Rejects if the student already has a PRESENT or approved record for this session
    const existing = await prisma.attendanceRecord.findUnique({
      where: {
        sessionId_userId: {
          sessionId,
          userId: studentId,
        },
      },
    });

    if (existing && (existing.status === 'PRESENT' || existing.reviewedBy !== null)) {
      throw new Error('Attendance has already been marked or confirmed for this session');
    }

    const secondsLeft = Math.max(0, Math.ceil((session.windowEndsAt.getTime() - Date.now()) / 1000));
    return { ok: true, secondsLeft };
  }

  async markSelfAttendance(
    sessionId: string,
    studentId: string,
    clientIp: string,
    code: string,
    submittedDescriptor: number[],
    livenessPassed: boolean
  ) {
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
      include: {
        course: { select: { id: true, allowedIpPrefixes: true } },
      },
    });

    if (!session) {
      throw new Error('Class session not found');
    }

    // Student must be enrolled
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: studentId,
          courseId: session.courseId,
        },
      },
    });

    if (!enrollment) {
      throw new Error('You are not enrolled in this course');
    }

    // Server-side revalidation: session active, window open, code valid
    if (!session.isActive) {
      throw new Error('Attendance session is closed');
    }

    if (!session.windowEndsAt || session.windowEndsAt.getTime() <= Date.now()) {
      throw new Error('Attendance marking window is closed');
    }

    if (!isValid(sessionId, code)) {
      throw new Error('Invalid or expired attendance code');
    }

    // Student must have a stored faceDescriptor
    const user = await prisma.user.findUnique({
      where: { id: studentId },
    });

    if (!user || !user.faceDescriptor) {
      throw new Error('Enroll your face first');
    }

    const storedDescriptor: number[] = JSON.parse(user.faceDescriptor);
    const d = euclidean(submittedDescriptor, storedDescriptor);

    // Network check
    const allowedPrefixes = session.course.allowedIpPrefixes || [];
    const normalizedIp = clientIp.replace(/^::ffff:/, '');
    const networkOk = allowedPrefixes.some(
      (prefix) => clientIp.startsWith(prefix) || normalizedIp.startsWith(prefix)
    );

    // Hard reject if d >= 0.6 (no record created)
    if (d >= 0.6) {
      throw new Error('Face verification failed: biometric distance too high');
    }

    // Status & integrity evaluation (§5.4)
    const evalResult = evaluateAttendanceIntegrity(d, livenessPassed, networkOk);

    // Never overwrite a record that is already PRESENT, or one reviewed by a teacher (reviewedBy != null)
    const existing = await prisma.attendanceRecord.findUnique({
      where: {
        sessionId_userId: {
          sessionId,
          userId: studentId,
        },
      },
    });

    if (existing && (existing.status === 'PRESENT' || existing.reviewedBy !== null)) {
      throw new Error('Attendance record has already been confirmed or reviewed');
    }

    // Upsert on (sessionId, studentId)
    await prisma.attendanceRecord.upsert({
      where: {
        sessionId_userId: {
          sessionId,
          userId: studentId,
        },
      },
      create: {
        sessionId,
        userId: studentId,
        status: evalResult.status,
        faceDistance: Math.round(d * 1000) / 1000,
        livenessPassed,
        codeValid: true,
        networkOk,
        integrityScore: evalResult.integrityScore,
        method: 'SELF',
        verifiedBy: 'FACE',
      },
      update: {
        status: evalResult.status,
        faceDistance: Math.round(d * 1000) / 1000,
        livenessPassed,
        codeValid: true,
        networkOk,
        integrityScore: evalResult.integrityScore,
        method: 'SELF',
        verifiedBy: 'FACE',
        timestamp: new Date(),
      },
    });

    return {
      status: evalResult.status,
      integrityScore: evalResult.integrityScore,
      message: evalResult.message,
    };
  }

  async reviewRecord(
    recordId: string,
    teacherId: string,
    userRole: Role,
    status: 'PRESENT' | 'ABSENT'
  ) {
    const record = await prisma.attendanceRecord.findUnique({
      where: { id: recordId },
      include: {
        session: {
          include: {
            course: { select: { teacherId: true } },
          },
        },
      },
    });

    if (!record) {
      throw new Error('Attendance record not found');
    }

    if (userRole !== Role.ADMIN && record.session.course.teacherId !== teacherId) {
      throw new Error('Unauthorized: You do not own this course');
    }

    // TODO: Day 13 - Write an audit entry for teacher attendance review

    return prisma.attendanceRecord.update({
      where: { id: recordId },
      data: {
        status,
        reviewedBy: teacherId,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }
  async processClassPhoto(
    sessionId: string,
    teacherId: string,
    userRole: Role,
    photos: number[][][]
  ) {
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
      include: {
        course: {
          include: {
            enrollments: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    faceDescriptor: true,
                  },
                },
              },
            },
          },
        },
        attendances: true,
      },
    });

    if (!session) {
      throw new Error('Class session not found');
    }

    if (userRole !== Role.ADMIN && session.course.teacherId !== teacherId) {
      throw new Error('Unauthorized: You do not own this course');
    }

    if (!session.isActive) {
      throw new Error('Class session is closed');
    }

    // Map enrolled students
    const enrolledStudents = session.course.enrollments.map((e) => e.user);

    // Filter enrolled candidates with valid faceDescriptor
    const candidates: Candidate[] = [];
    for (const student of enrolledStudents) {
      if (student.faceDescriptor) {
        try {
          const parsed = JSON.parse(student.faceDescriptor);
          if (Array.isArray(parsed) && parsed.length === 128) {
            candidates.push({
              studentId: student.id,
              descriptor: parsed,
            });
          }
        } catch {
          // ignore corrupted descriptor
        }
      }
    }

    // Run matchPhoto per photo
    const perPhotoMatches: Match[][] = [];
    for (const faces of photos) {
      const matches = matchPhoto(faces, candidates);
      perPhotoMatches.push(matches);
    }

    // Merge photo matches (studentId -> best distance)
    const bestDistances = mergePhotoMatches(perPhotoMatches);

    // Calculate unknown faces: count of unassigned faces in the photo with the most faces
    let maxFacesCount = -1;
    let unknownFaces = 0;
    for (let i = 0; i < photos.length; i++) {
      if (photos[i].length > maxFacesCount) {
        maxFacesCount = photos[i].length;
        unknownFaces = photos[i].length - perPhotoMatches[i].length;
      }
    }
    if (unknownFaces < 0) unknownFaces = 0;

    // Existing attendance records for this session
    const existingRecordsMap = new Map<string, (typeof session.attendances)[0]>();
    for (const record of session.attendances) {
      existingRecordsMap.set(record.userId, record);
    }

    const studentMap = new Map(enrolledStudents.map((s) => [s.id, s]));

    type MatchedItem = {
      recordId: string;
      studentId: string;
      name: string;
      distance: number;
      status: 'PRESENT' | 'FLAGGED';
      integrityScore: number;
    };
    type SkippedItem = {
      studentId: string;
      name: string;
      reason: string;
    };
    type NotFoundItem = {
      studentId: string;
      name: string;
      hasFaceEnrolled: boolean;
    };

    const matched: MatchedItem[] = [];
    const skipped: SkippedItem[] = [];
    const notFound: NotFoundItem[] = [];

    // Process matched students
    for (const [studentId, distance] of bestDistances.entries()) {
      const student = studentMap.get(studentId);
      const name = student ? `${student.firstName} ${student.lastName}`.trim() : 'Unknown';

      const existingRecord = existingRecordsMap.get(studentId);

      // NEVER overwrite an existing record if:
      // 1. it is PRESENT
      // 2. has reviewedBy != null
      // 3. has method = "MANUAL"
      if (existingRecord) {
        if (existingRecord.status === 'PRESENT') {
          skipped.push({ studentId, name, reason: 'Already marked PRESENT' });
          continue;
        }
        if (existingRecord.reviewedBy !== null) {
          skipped.push({ studentId, name, reason: 'Record has been reviewed by teacher' });
          continue;
        }
        if (existingRecord.method === 'MANUAL') {
          skipped.push({ studentId, name, reason: 'Record was manually set' });
          continue;
        }

        // If existing record is FLAGGED or SELF-flagged, overwrite only when new distance is smaller:
        if (existingRecord.faceDistance !== null && distance >= existingRecord.faceDistance) {
          skipped.push({ studentId, name, reason: 'Existing distance is lower or equal' });
          continue;
        }
      }

      // Compute integrityScore and status
      const rawScore = Math.min(Math.max(1 - distance / 0.6, 0), 1);
      const integrityScore = Math.round(rawScore * 100) / 100;
      const status = classify(distance);

      // Upsert record
      const record = await prisma.attendanceRecord.upsert({
        where: {
          sessionId_userId: {
            sessionId,
            userId: studentId,
          },
        },
        update: {
          status,
          method: 'CLASS_PHOTO',
          faceDistance: distance,
          livenessPassed: false,
          codeValid: false,
          networkOk: false,
          integrityScore,
          verifiedBy: 'FACE',
          timestamp: new Date(),
        },
        create: {
          sessionId,
          userId: studentId,
          status,
          method: 'CLASS_PHOTO',
          faceDistance: distance,
          livenessPassed: false,
          codeValid: false,
          networkOk: false,
          integrityScore,
          verifiedBy: 'FACE',
          timestamp: new Date(),
        },
      });

      matched.push({
        recordId: record.id,
        studentId,
        name,
        distance,
        status,
        integrityScore,
      });
    }

    // Enrolled students not matched in any photo
    for (const student of enrolledStudents) {
      if (!bestDistances.has(student.id)) {
        notFound.push({
          studentId: student.id,
          name: `${student.firstName} ${student.lastName}`.trim(),
          hasFaceEnrolled: Boolean(student.faceDescriptor),
        });
      }
    }

    const flagged = matched.filter((m) => m.status === 'FLAGGED');

    return {
      matched,
      flagged,
      notFound,
      unknownFaces,
      skipped,
    };
  }

  async markManualAttendance(
    sessionId: string,
    teacherId: string,
    userRole: Role,
    studentId: string,
    status: 'PRESENT' | 'ABSENT'
  ) {
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
      include: {
        course: { select: { id: true, teacherId: true } },
      },
    });

    if (!session) {
      throw new Error('Class session not found');
    }

    if (userRole !== Role.ADMIN && session.course.teacherId !== teacherId) {
      throw new Error('Unauthorized: You do not own this course');
    }

    // Check student is enrolled
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: studentId,
          courseId: session.courseId,
        },
      },
    });

    if (!enrollment) {
      throw new Error('Student is not enrolled in this course');
    }

    const integrityScore = status === 'PRESENT' ? 1.0 : 0.0;

    return prisma.attendanceRecord.upsert({
      where: {
        sessionId_userId: {
          sessionId,
          userId: studentId,
        },
      },
      update: {
        status,
        method: 'MANUAL',
        reviewedBy: teacherId,
        integrityScore,
        verifiedBy: 'MANUAL',
        timestamp: new Date(),
      },
      create: {
        sessionId,
        userId: studentId,
        status,
        method: 'MANUAL',
        reviewedBy: teacherId,
        integrityScore,
        verifiedBy: 'MANUAL',
        codeValid: false,
        networkOk: false,
        livenessPassed: false,
        timestamp: new Date(),
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }
}


export const attendanceService = new AttendanceService();

