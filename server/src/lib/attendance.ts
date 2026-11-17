/**
 * Day 7 rate rule: rate = present / totalSessions, where "present" = status PRESENT.
 * FLAGGED counts as not present until a teacher approves it.
 * totalSessions = 0 gives rate null.
 */
export function computeAttendanceRate(present: number, totalSessions: number): number | null {
  return totalSessions === 0 ? null : present / totalSessions;
}
