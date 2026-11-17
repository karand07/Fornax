export type MasteryBandName = 'weak' | 'developing' | 'strong';

export interface MasteryBand {
  band: MasteryBandName;
  label: string;
  color: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  progressColor: string;
  badgeVariant: 'destructive' | 'secondary' | 'success' | 'default';
}

export const MASTERY_STRONG = 0.7;
export const MASTERY_WEAK = 0.4;
export const PREREQ_OK = 0.6;
export const RISK_WEIGHTS = { attendance: 0.4, mastery: 0.6 };
export const RISK_AT_RISK = 0.5;
export const RISK_WATCH = 0.35;
export const MAX_RECOMMENDATIONS = 3;
export const MAX_RESOURCES_PER_REC = 3;
export const MIN_ASSESSED = 2;

/**
 * Mastery band thresholds:
 * - Weak: < 0.4
 * - Developing: 0.4 <= score < 0.7
 * - Strong: >= 0.7
 */
export function masteryBand(score: number): MasteryBand {
  if (score < MASTERY_WEAK) {
    return {
      band: 'weak',
      label: 'Weak',
      color: '#f43f5e',
      textColor: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/30',
      progressColor: 'bg-rose-500',
      badgeVariant: 'destructive',
    };
  }
  if (score < MASTERY_STRONG) {
    return {
      band: 'developing',
      label: 'Developing',
      color: '#f59e0b',
      textColor: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      progressColor: 'bg-amber-500',
      badgeVariant: 'secondary',
    };
  }
  return {
    band: 'strong',
    label: 'Strong',
    color: '#10b981',
    textColor: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    progressColor: 'bg-emerald-500',
    badgeVariant: 'success',
  };
}

/**
 * Format a ratio (0..1) or percentage (0..100) to a whole percent string.
 */
export function formatPercent(x: number | null | undefined): string {
  if (x === null || x === undefined || isNaN(x)) {
    return 'N/A';
  }
  const val = x >= 0 && x <= 1 ? x * 100 : x;
  return `${Math.round(val)}%`;
}
