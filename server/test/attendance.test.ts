import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAttendanceIntegrity } from '../src/modules/attendance/attendance.rule.js';
import { isValid, generateRotatingHMAC } from '../src/lib/token.js';
import { AttendanceStatus } from '@prisma/client';

describe('Attendance Mode B (§5.4) Status and Integrity Rules', () => {
  describe('Group 1: d < 0.45 combinations', () => {
    it('d < 0.45, liveness=true, network=true -> PRESENT, integrity 1.00', () => {
      const res = evaluateAttendanceIntegrity(0.35, true, true);
      assert.equal(res.status, AttendanceStatus.PRESENT);
      assert.equal(res.integrityScore, 1.0);
      assert.match(res.message, /successfully/i);
    });

    it('d < 0.45, liveness=true, network=false -> FLAGGED, integrity 0.85', () => {
      const res = evaluateAttendanceIntegrity(0.35, true, false);
      assert.equal(res.status, AttendanceStatus.FLAGGED);
      assert.equal(res.integrityScore, 0.85);
      assert.match(res.message, /not on the campus network/i);
    });

    it('d < 0.45, liveness=false, network=true -> FLAGGED, integrity 0.75', () => {
      const res = evaluateAttendanceIntegrity(0.35, false, true);
      assert.equal(res.status, AttendanceStatus.FLAGGED);
      assert.equal(res.integrityScore, 0.75);
      assert.match(res.message, /liveness/i);
    });

    it('d < 0.45, liveness=false, network=false -> FLAGGED, integrity 0.60', () => {
      const res = evaluateAttendanceIntegrity(0.35, false, false);
      assert.equal(res.status, AttendanceStatus.FLAGGED);
      assert.equal(res.integrityScore, 0.6);
      assert.match(res.message, /liveness/i);
      assert.match(res.message, /network/i);
    });
  });

  describe('Group 2: 0.45 <= d < 0.6 combinations', () => {
    it('0.45 <= d < 0.6, liveness=true, network=true -> FLAGGED, integrity 0.83', () => {
      const res = evaluateAttendanceIntegrity(0.50, true, true);
      assert.equal(res.status, AttendanceStatus.FLAGGED);
      assert.equal(res.integrityScore, 0.83);
      assert.match(res.message, /facial similarity/i);
    });

    it('0.45 <= d < 0.6, liveness=true, network=false -> FLAGGED, integrity 0.68', () => {
      const res = evaluateAttendanceIntegrity(0.50, true, false);
      assert.equal(res.status, AttendanceStatus.FLAGGED);
      assert.equal(res.integrityScore, 0.68);
      assert.match(res.message, /network/i);
    });

    it('0.45 <= d < 0.6, liveness=false, network=true -> FLAGGED, integrity 0.58', () => {
      const res = evaluateAttendanceIntegrity(0.50, false, true);
      assert.equal(res.status, AttendanceStatus.FLAGGED);
      assert.equal(res.integrityScore, 0.58);
      assert.match(res.message, /liveness/i);
    });

    it('0.45 <= d < 0.6, liveness=false, network=false -> FLAGGED, integrity 0.43', () => {
      const res = evaluateAttendanceIntegrity(0.50, false, false);
      assert.equal(res.status, AttendanceStatus.FLAGGED);
      assert.equal(res.integrityScore, 0.43);
    });
  });

  describe('Group 3: d >= 0.6 hard reject', () => {
    it('d = 0.60 throws hard reject error', () => {
      assert.throws(() => {
        evaluateAttendanceIntegrity(0.60, true, true);
      }, /threshold exceeded|biometric distance too high/i);
    });

    it('d = 0.75 throws hard reject error', () => {
      assert.throws(() => {
        evaluateAttendanceIntegrity(0.75, true, true);
      }, /threshold exceeded|biometric distance too high/i);
    });
  });

  describe('Group 4: Code Validation and Window Rules', () => {
    const sessionId = 'test-session-uuid-1234';

    it('valid rotating code is accepted by isValid', () => {
      const codeData = generateRotatingHMAC(sessionId);
      assert.equal(isValid(sessionId, codeData.code), true);
    });

    it('wrong code is rejected by isValid', () => {
      assert.equal(isValid(sessionId, '000000'), false);
      assert.equal(isValid(sessionId, 'invalid-code'), false);
    });

    it('window-closed condition simulation', () => {
      const windowEndsAt = new Date(Date.now() - 5000); // 5 seconds in past
      const isWindowClosed = windowEndsAt.getTime() <= Date.now();
      assert.equal(isWindowClosed, true);
    });

    it('window-open condition simulation', () => {
      const windowEndsAt = new Date(Date.now() + 60000); // 60 seconds in future
      const isWindowOpen = windowEndsAt.getTime() > Date.now();
      assert.equal(isWindowOpen, true);
    });
  });
});
