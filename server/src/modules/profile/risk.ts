import {
  MASTERY_STRONG,
  RISK_WEIGHTS,
  RISK_AT_RISK,
  RISK_WATCH,
} from '../../lib/thresholds.js';

export type RiskInput = {
  attendanceRate: number | null;
  avgMastery: number | null;
};

export type RiskResult = {
  level: 'OK' | 'WATCH' | 'AT_RISK' | 'INSUFFICIENT_DATA';
  score: number | null; // 0..1, 3 decimals, null only for INSUFFICIENT_DATA
  factors: ('LOW_ATTENDANCE' | 'LOW_MASTERY')[];
  usedWeights: { attendance: number; mastery: number } | null;
};

export function computeRisk(
  inputOrAtt: RiskInput | number | null,
  maybeMastery?: number | null
): RiskResult {
  const attendanceRate =
    typeof inputOrAtt === 'object' && inputOrAtt !== null
      ? inputOrAtt.attendanceRate
      : (inputOrAtt ?? null);
  const avgMastery =
    typeof inputOrAtt === 'object' && inputOrAtt !== null
      ? inputOrAtt.avgMastery
      : (maybeMastery ?? null);

  // Rule 1: Both null -> INSUFFICIENT_DATA
  if (attendanceRate === null && avgMastery === null) {
    return {
      level: 'INSUFFICIENT_DATA',
      score: null,
      factors: [],
      usedWeights: null,
    };
  }

  let rawScore: number;
  let usedWeights: { attendance: number; mastery: number };

  if (attendanceRate === null) {
    // Only mastery exists
    usedWeights = { attendance: 0, mastery: 1.0 };
    rawScore = 1.0 * (1 - avgMastery!);
  } else if (avgMastery === null) {
    // Only attendance exists
    usedWeights = { attendance: 1.0, mastery: 0 };
    rawScore = 1.0 * (1 - attendanceRate);
  } else {
    // Both present
    usedWeights = {
      attendance: RISK_WEIGHTS.attendance,
      mastery: RISK_WEIGHTS.mastery,
    };
    rawScore =
      RISK_WEIGHTS.attendance * (1 - attendanceRate) +
      RISK_WEIGHTS.mastery * (1 - avgMastery);
  }

  // Round score to 3 decimal places
  const score = Math.round(rawScore * 1000) / 1000;

  // Strict comparisons on score
  let level: 'OK' | 'WATCH' | 'AT_RISK';
  if (score > RISK_AT_RISK) {
    level = 'AT_RISK';
  } else if (score > RISK_WATCH) {
    level = 'WATCH';
  } else {
    level = 'OK';
  }

  // Factors
  const factors: ('LOW_ATTENDANCE' | 'LOW_MASTERY')[] = [];

  if (attendanceRate !== null && attendanceRate < 0.75) {
    factors.push('LOW_ATTENDANCE');
  }

  if (avgMastery !== null && avgMastery < MASTERY_STRONG) {
    factors.push('LOW_MASTERY');
  }

  return {
    level,
    score,
    factors,
    usedWeights,
  };
}
