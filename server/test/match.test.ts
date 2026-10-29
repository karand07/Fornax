import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { matchPhoto, mergePhotoMatches, classify, Candidate } from '../src/lib/match.js';
import { dist } from '../src/lib/face.js';
import { attendanceService } from '../src/modules/attendance/attendance.service.js';
import { attendanceController } from '../src/modules/attendance/attendance.controller.js';
import { prisma } from '../src/lib/prisma.js';
import { Role } from '@prisma/client';
import { Request, Response } from 'express';

function makeVec(val: number, dim = 128): number[] {
  return new Array(dim).fill(val);
}

function makeVecWithDistance(d: number, dim = 128): number[] {
  return new Array(dim).fill(d / Math.sqrt(dim));
}

describe('Mode A Class-Photo Face Matching (lib/match.ts)', () => {
  const baseFace = makeVec(0);

  it('one face, one student, below cutoff -> matched', () => {
    const studentVec = makeVecWithDistance(0.35);
    const students: Candidate[] = [{ studentId: 'student-1', descriptor: studentVec }];
    const faces = [baseFace];

    const matches = matchPhoto(faces, students, 0.6);
    assert.equal(matches.length, 1);
    assert.equal(matches[0].studentId, 'student-1');
    assert.equal(matches[0].faceIndex, 0);
    assert.ok(Math.abs(matches[0].distance - 0.35) < 1e-6);
  });

  it('two faces compete for the same student -> the closer face wins, the other becomes unknown', () => {
    const studentVec = makeVecWithDistance(0.2);
    const students: Candidate[] = [{ studentId: 'student-1', descriptor: studentVec }];

    // face 0 is at dist 0.2 from studentVec
    const face0 = baseFace;
    // face 1 is closer (distance 0.1)
    const face1 = makeVecWithDistance(0.1);

    const faces = [face0, face1];
    const matches = matchPhoto(faces, students, 0.6);

    assert.equal(matches.length, 1);
    assert.equal(matches[0].faceIndex, 1); // Closer face wins
    assert.equal(matches[0].studentId, 'student-1');
  });

  it('one face equidistant-ish to two students -> goes to the closer one, the other student not found', () => {
    const face = baseFace;
    const student1 = { studentId: 'student-1', descriptor: makeVecWithDistance(0.42) };
    const student2 = { studentId: 'student-2', descriptor: makeVecWithDistance(0.38) };

    const matches = matchPhoto([face], [student1, student2], 0.6);
    assert.equal(matches.length, 1);
    assert.equal(matches[0].studentId, 'student-2'); // closer one
    assert.equal(matches[0].faceIndex, 0);
  });

  it('distance >= 0.6 -> no match', () => {
    const face = baseFace;
    const student1 = { studentId: 'student-1', descriptor: makeVecWithDistance(0.6001) };
    const student2 = { studentId: 'student-2', descriptor: makeVecWithDistance(0.75) };

    const matches = matchPhoto([face], [student1, student2], 0.6);
    assert.equal(matches.length, 0);
  });

  it('students with empty descriptors are skipped', () => {
    const face = baseFace;
    const studentEmpty = { studentId: 'student-empty', descriptor: [] };
    const studentWrongLen = { studentId: 'student-wrong-len', descriptor: [0.1, 0.2] };
    const studentValid = { studentId: 'student-valid', descriptor: makeVecWithDistance(0.3) };

    const matches = matchPhoto([face], [studentEmpty, studentWrongLen, studentValid], 0.6);
    assert.equal(matches.length, 1);
    assert.equal(matches[0].studentId, 'student-valid');
  });

  it('mergePhotoMatches keeps the smallest distance per student', () => {
    const photo1Matches = [
      { studentId: 's1', distance: 0.45, faceIndex: 0 },
      { studentId: 's2', distance: 0.30, faceIndex: 1 },
    ];
    const photo2Matches = [
      { studentId: 's1', distance: 0.25, faceIndex: 0 }, // better for s1
      { studentId: 's2', distance: 0.35, faceIndex: 1 }, // worse for s2
      { studentId: 's3', distance: 0.40, faceIndex: 2 }, // new student
    ];

    const merged = mergePhotoMatches([photo1Matches, photo2Matches]);
    assert.equal(merged.size, 3);
    assert.equal(merged.get('s1'), 0.25);
    assert.equal(merged.get('s2'), 0.30);
    assert.equal(merged.get('s3'), 0.40);
  });

  it('classify boundaries at 0.49, 0.50, 0.59', () => {
    assert.equal(classify(0.49), 'PRESENT');
    assert.equal(classify(0.50), 'FLAGGED');
    assert.equal(classify(0.59), 'FLAGGED');
  });
});

describe('Mode A Class-Photo Service & Validation Tests', () => {
  it('Validation test: a face with 127 numbers returns 400', async () => {
    let capturedStatus: number | null = null;
    let capturedJson: any = null;

    const req = {
      params: { id: 'test-session-id' },
      user: { userId: 'teacher-1', role: Role.TEACHER },
      body: {
        photos: [
          [
            new Array(127).fill(0.1), // 127 numbers instead of 128
          ],
        ],
      },
    } as unknown as Request;

    const res = {
      status(code: number) {
        capturedStatus = code;
        return this;
      },
      json(data: any) {
        capturedJson = data;
        return this;
      },
    } as unknown as Response;

    await attendanceController.processClassPhoto(req, res);

    assert.equal(capturedStatus, 400);
    assert.ok(capturedJson);
    assert.ok(capturedJson.error);
    assert.match(capturedJson.error, /128/i);
  });

  it('Service test: existing PRESENT, MANUAL, and teacher-reviewed records are not overwritten', async () => {
    const originalFindUnique = prisma.classSession.findUnique;
    const originalUpsert = prisma.attendanceRecord.upsert;

    const teacherId = 'teacher-uuid-1';
    const sessionId = 'session-uuid-1';

    const studentPresent = {
      id: 'student-present',
      firstName: 'Alice',
      lastName: 'Smith',
      faceDescriptor: JSON.stringify(makeVec(0)),
    };
    const studentManual = {
      id: 'student-manual',
      firstName: 'Bob',
      lastName: 'Jones',
      faceDescriptor: JSON.stringify(makeVec(0)),
    };
    const studentReviewed = {
      id: 'student-reviewed',
      firstName: 'Charlie',
      lastName: 'Brown',
      faceDescriptor: JSON.stringify(makeVec(0)),
    };
    const studentNew = {
      id: 'student-new',
      firstName: 'Diana',
      lastName: 'Prince',
      faceDescriptor: JSON.stringify(makeVec(0)),
    };

    const mockSession = {
      id: sessionId,
      isActive: true,
      courseId: 'course-uuid-1',
      course: {
        id: 'course-uuid-1',
        teacherId,
        enrollments: [
          { user: studentPresent },
          { user: studentManual },
          { user: studentReviewed },
          { user: studentNew },
        ],
      },
      attendances: [
        {
          id: 'rec-1',
          sessionId,
          userId: 'student-present',
          status: 'PRESENT',
          method: 'SELF',
          reviewedBy: null,
          faceDistance: 0.3,
        },
        {
          id: 'rec-2',
          sessionId,
          userId: 'student-manual',
          status: 'ABSENT',
          method: 'MANUAL',
          reviewedBy: null,
          faceDistance: null,
        },
        {
          id: 'rec-3',
          sessionId,
          userId: 'student-reviewed',
          status: 'FLAGGED',
          method: 'SELF',
          reviewedBy: teacherId,
          faceDistance: 0.55,
        },
      ],
    };

    (prisma.classSession.findUnique as any) = async () => mockSession;

    const upsertedUserIds: string[] = [];
    (prisma.attendanceRecord.upsert as any) = async (args: any) => {
      upsertedUserIds.push(args.where.sessionId_userId.userId);
      return { id: 'new-rec-id', ...args.create };
    };

    try {
      // 4 faces, all matching the students
      const photos = [[makeVec(0), makeVec(0), makeVec(0), makeVec(0)]];
      const result = await attendanceService.processClassPhoto(sessionId, teacherId, Role.TEACHER, photos);

      // Verify that PRESENT, MANUAL, and reviewed students were NOT upserted
      assert.ok(!upsertedUserIds.includes('student-present'));
      assert.ok(!upsertedUserIds.includes('student-manual'));
      assert.ok(!upsertedUserIds.includes('student-reviewed'));

      // student-new SHOULD have been upserted
      assert.ok(upsertedUserIds.includes('student-new'));

      // Check skipped list reasons
      const skippedIds = result.skipped.map((s) => s.studentId);
      assert.ok(skippedIds.includes('student-present'));
      assert.ok(skippedIds.includes('student-manual'));
      assert.ok(skippedIds.includes('student-reviewed'));
    } finally {
      prisma.classSession.findUnique = originalFindUnique;
      prisma.attendanceRecord.upsert = originalUpsert;
    }
  });
});
