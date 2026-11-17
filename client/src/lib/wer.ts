/**
 * Pure helper to compute Word Error Rate (WER) and word-level Levenshtein distance.
 * Lowercase, whitespace-split, word-level Levenshtein.
 */

export interface WordLevenshteinResult {
  edits: number;
  refWords: number;
  hypWords: number;
  wer: number;
}

export function computeWordLevenshtein(
  reference: string,
  hypothesis: string
): WordLevenshteinResult {
  const ref = (reference || '').trim().toLowerCase();
  const hyp = (hypothesis || '').trim().toLowerCase();

  const refTokens = ref.length > 0 ? ref.split(/\s+/).filter(Boolean) : [];
  const hypTokens = hyp.length > 0 ? hyp.split(/\s+/).filter(Boolean) : [];

  const m = refTokens.length;
  const n = hypTokens.length;

  if (m === 0) {
    const edits = n;
    return {
      edits,
      refWords: 0,
      hypWords: n,
      wer: n === 0 ? 0 : 1.0,
    };
  }

  // DP table: (m + 1) x (n + 1)
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );

  for (let i = 0; i <= m; i++) {
    dp[i][0] = i; // Deletions
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j; // Insertions
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = refTokens[i - 1] === hypTokens[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  const edits = dp[m][n];
  const wer = Math.round((edits / m) * 10000) / 10000;

  return {
    edits,
    refWords: m,
    hypWords: n,
    wer,
  };
}
