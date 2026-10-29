export const AttendanceStatus = {
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  LATE: 'LATE',
  EXCUSED: 'EXCUSED',
  FLAGGED: 'FLAGGED',
} as const;

export type AttendanceStatus = (typeof AttendanceStatus)[keyof typeof AttendanceStatus];

export interface IntegrityEvaluation {
  status: AttendanceStatus;
  integrityScore: number;
  message: string;
  faceScore: number;
}

/**
 * Computes faceScore, integrityScore (2 decimals), status, and explanatory message
 * exactly according to §5.4 specification.
 *
 * Rules:
 * - Hard reject if d >= 0.6 (throws error)
 * - faceScore = d < 0.45 ? 1 : 0.5
 * - points = 35 * faceScore + 25 * (livenessPassed ? 1 : 0) + 25 + 15 * (networkOk ? 1 : 0)
 * - integrityScore rounded to 2 decimals (points / 100)
 * - Status rule (stated explicitly):
 *     PRESENT if d < 0.45 AND livenessPassed AND networkOk
 *     FLAGGED otherwise
 */
export function evaluateAttendanceIntegrity(
  d: number,
  livenessPassed: boolean,
  networkOk: boolean
): IntegrityEvaluation {
  if (d >= 0.6) {
    throw new Error('Biometric distance too high (face mismatch threshold exceeded)');
  }

  const faceScore = d < 0.45 ? 1 : 0.5;
  // Scale by 200 to keep all terms as integers (70 for 1 and 35 for 0.5)
  const facePoints = d < 0.45 ? 70 : 35;
  const livePoints = livenessPassed ? 50 : 0;
  const codePoints = 50;
  const netPoints = networkOk ? 30 : 0;

  const totalPoints200 = facePoints + livePoints + codePoints + netPoints;
  const integrityScore = Math.round(totalPoints200 / 2) / 100;

  // Status rule explicitly stated
  const isPresent = d < 0.45 && livenessPassed && networkOk;
  const status: AttendanceStatus = isPresent ? AttendanceStatus.PRESENT : AttendanceStatus.FLAGGED;

  let message = 'Attendance marked successfully.';
  if (status === AttendanceStatus.FLAGGED) {
    const reasons: string[] = [];
    if (d >= 0.45) {
      reasons.push('facial similarity did not meet high-confidence threshold');
    }
    if (!livenessPassed) {
      reasons.push('blink liveness verification was not completed');
    }
    if (!networkOk) {
      reasons.push('you were not on the campus network');
    }

    message = `Marked for teacher review: ${reasons.join(' and ')}.`;
  }

  return {
    status,
    integrityScore,
    message,
    faceScore,
  };
}
