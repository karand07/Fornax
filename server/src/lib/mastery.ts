export type GradedItem = { ratio: number }; // finalMarks / maxMarks, 0..1, in chronological order

/**
 * Pure mastery computation function.
 * Algorithm:
 * score = start; attempts = 0; for each item in order:
 *   alpha = attempts < 3 ? 0.5 : 0.3
 *   score = (1 - alpha) * score + alpha * clamp(ratio, 0, 1)
 *   attempts++
 * Return score rounded to 4 decimals and the attempts count.
 */
export function computeMastery(
  items: GradedItem[],
  start = 0.5
): { score: number; attempts: number } {
  let score = start;
  let attempts = 0;

  for (const item of items) {
    const alpha = attempts < 3 ? 0.5 : 0.3;
    const clampedRatio = Math.min(Math.max(item.ratio, 0), 1);
    score = (1 - alpha) * score + alpha * clampedRatio;
    attempts++;
  }

  const roundedScore = Math.round(score * 10000) / 10000;
  return {
    score: roundedScore,
    attempts,
  };
}
