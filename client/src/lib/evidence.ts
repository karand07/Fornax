export type Segment = {
  text: string;
  highlight: boolean;
  criterionIndexes: number[];
};

export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.8,
  MEDIUM: 0.6,
} as const;

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export function confidenceLevel(c: number): ConfidenceLevel {
  if (c >= CONFIDENCE_THRESHOLDS.HIGH) return 'HIGH';
  if (c >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'MEDIUM';
  return 'LOW';
}

interface CharMap {
  origStart: number;
  origEnd: number;
}

/**
 * Locate a span inside the ORIGINAL text, tolerant of case and whitespace differences.
 * Algorithm:
 * 1. Build a normalized copy of original (lowercase, each run of whitespace becomes one space, trimmed)
 *    while keeping an array that maps each normalized character index to its index in the original.
 * 2. Normalize span the same way. If empty, return null.
 * 3. indexOf in the normalized text. If found, map the start and end back through the index array
 *    and return original offsets. Otherwise null.
 */
export function findSpan(original: string, span: string): { start: number; end: number } | null {
  if (!original || !span) return null;

  // Step 1: Normalize original and build character map
  let normOriginal = '';
  const charMaps: CharMap[] = [];

  let i = 0;
  // skip leading whitespace
  while (i < original.length && /\s/.test(original[i])) {
    i++;
  }

  while (i < original.length) {
    if (/\s/.test(original[i])) {
      const spaceStart = i;
      while (i < original.length && /\s/.test(original[i])) {
        i++;
      }
      // If we haven't reached the end, emit a single space
      if (i < original.length) {
        normOriginal += ' ';
        charMaps.push({ origStart: spaceStart, origEnd: i });
      }
    } else {
      normOriginal += original[i].toLowerCase();
      charMaps.push({ origStart: i, origEnd: i + 1 });
      i++;
    }
  }

  // Step 2: Normalize span the same way
  let normSpan = '';
  let j = 0;
  while (j < span.length && /\s/.test(span[j])) {
    j++;
  }

  while (j < span.length) {
    if (/\s/.test(span[j])) {
      while (j < span.length && /\s/.test(span[j])) {
        j++;
      }
      if (j < span.length) {
        normSpan += ' ';
      }
    } else {
      normSpan += span[j].toLowerCase();
      j++;
    }
  }

  if (normSpan.length === 0) {
    return null;
  }

  // Step 3: Find indexOf in normalized text
  const matchIdx = normOriginal.indexOf(normSpan);
  if (matchIdx === -1) {
    return null;
  }

  const normEndIdx = matchIdx + normSpan.length - 1;
  const start = charMaps[matchIdx].origStart;
  const end = charMaps[normEndIdx].origEnd;

  return { start, end };
}

interface RawRange {
  start: number;
  end: number;
  criterionIndex: number;
}

interface MergedRange {
  start: number;
  end: number;
  criterionIndexes: number[];
}

/**
 * Split the answer into ordered, non-overlapping segments for rendering.
 * - Resolve each span with findSpan, ignoring nulls and misses.
 * - Merge overlapping ranges. A merged range records every criterion index that contributed.
 * - Return segments covering the entire original text with no gaps and no duplicated characters.
 */
export function buildSegments(original: string, spans: (string | null)[]): Segment[] {
  if (!original) return [];

  const rawRanges: RawRange[] = [];
  spans.forEach((span, idx) => {
    if (!span) return;
    const match = findSpan(original, span);
    if (match && match.end > match.start) {
      rawRanges.push({ start: match.start, end: match.end, criterionIndex: idx });
    }
  });

  if (rawRanges.length === 0) {
    return [{ text: original, highlight: false, criterionIndexes: [] }];
  }

  // Sort ranges: start asc, then end asc
  rawRanges.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return a.end - b.end;
  });

  // Merge overlapping ranges
  const merged: MergedRange[] = [];
  for (const r of rawRanges) {
    if (merged.length === 0) {
      merged.push({ start: r.start, end: r.end, criterionIndexes: [r.criterionIndex] });
    } else {
      const last = merged[merged.length - 1];
      if (r.start <= last.end) {
        // Overlapping or contiguous: merge
        last.end = Math.max(last.end, r.end);
        if (!last.criterionIndexes.includes(r.criterionIndex)) {
          last.criterionIndexes.push(r.criterionIndex);
          last.criterionIndexes.sort((a, b) => a - b);
        }
      } else {
        merged.push({ start: r.start, end: r.end, criterionIndexes: [r.criterionIndex] });
      }
    }
  }

  // Build segments covering the entire original text with no gaps and no duplicated characters
  const segments: Segment[] = [];
  let cursor = 0;
  for (const m of merged) {
    if (m.start > cursor) {
      segments.push({
        text: original.slice(cursor, m.start),
        highlight: false,
        criterionIndexes: [],
      });
    }
    segments.push({
      text: original.slice(m.start, m.end),
      highlight: true,
      criterionIndexes: m.criterionIndexes,
    });
    cursor = m.end;
  }

  if (cursor < original.length) {
    segments.push({
      text: original.slice(cursor),
      highlight: false,
      criterionIndexes: [],
    });
  }

  return segments;
}

