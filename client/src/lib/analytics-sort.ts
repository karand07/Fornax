export type SortOption = 'name' | 'risk' | 'mastery' | 'attendance';

export interface RowSortable {
  studentId: string;
  name: string;
  avgMastery: number | null;
  attendanceRate: number | null;
  risk: {
    level: 'OK' | 'WATCH' | 'AT_RISK' | 'INSUFFICIENT_DATA';
    score?: number | null;
  };
}

const RISK_LEVEL_ORDER: Record<string, number> = {
  AT_RISK: 0,
  WATCH: 1,
  OK: 2,
  INSUFFICIENT_DATA: 3,
};

/**
 * Pure helper for filtering and sorting heatmap student rows.
 */
export function filterAndSortRows<T extends RowSortable>(
  rows: T[],
  options: {
    sort: SortOption;
    onlyAtRisk?: boolean;
  }
): T[] {
  let result = [...rows];

  // Filter: only watch / at-risk
  if (options.onlyAtRisk) {
    result = result.filter(
      (r) => r.risk.level === 'AT_RISK' || r.risk.level === 'WATCH'
    );
  }

  // Sort
  result.sort((a, b) => {
    switch (options.sort) {
      case 'risk': {
        const rankA = RISK_LEVEL_ORDER[a.risk.level] ?? 4;
        const rankB = RISK_LEVEL_ORDER[b.risk.level] ?? 4;
        if (rankA !== rankB) {
          return rankA - rankB;
        }
        const scoreA = a.risk.score ?? -1;
        const scoreB = b.risk.score ?? -1;
        if (scoreB !== scoreA) {
          return scoreB - scoreA; // descending score
        }
        return a.name.localeCompare(b.name);
      }

      case 'mastery': {
        if (a.avgMastery === null && b.avgMastery === null) {
          return a.name.localeCompare(b.name);
        }
        if (a.avgMastery === null) return 1; // nulls last
        if (b.avgMastery === null) return -1;
        if (b.avgMastery !== a.avgMastery) {
          return b.avgMastery - a.avgMastery; // descending
        }
        return a.name.localeCompare(b.name);
      }

      case 'attendance': {
        if (a.attendanceRate === null && b.attendanceRate === null) {
          return a.name.localeCompare(b.name);
        }
        if (a.attendanceRate === null) return 1; // nulls last
        if (b.attendanceRate === null) return -1;
        if (b.attendanceRate !== a.attendanceRate) {
          return b.attendanceRate - a.attendanceRate; // descending
        }
        return a.name.localeCompare(b.name);
      }

      case 'name':
      default:
        return a.name.localeCompare(b.name);
    }
  });

  return result;
}
