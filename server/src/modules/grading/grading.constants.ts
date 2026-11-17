export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.8,
  MEDIUM: 0.6,
} as const;

export const LLM_MODEL = 'claude-3-5-sonnet-20241022';
export const PROMPT_VERSION = 'grade-v1';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) return 'HIGH';
  if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'MEDIUM';
  return 'LOW';
}

