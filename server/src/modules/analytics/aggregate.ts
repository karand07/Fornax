import {
  MASTERY_STRONG,
  MASTERY_WEAK,
  MIN_ASSESSED,
} from '../../lib/thresholds.js';
import { computeRisk, RiskResult } from '../profile/risk.js';

export type AnalyticsInput = {
  students: { id: string; name: string }[];
  concepts: { id: string; name: string; prerequisiteId: string | null }[];
  mastery: { studentId: string; conceptId: string; score: number; attempts: number }[];
  attendance: { studentId: string; rate: number | null; present: number; total: number }[];
  sessions: { id: string; date: string; present: number; flagged: number; absent: number }[]; // ENDED sessions, oldest first
};

export type Cell = {
  conceptId: string;
  score: number | null;
  attempts: number;
  band: 'weak' | 'developing' | 'strong' | 'unassessed';
};

export type AnalyticsResult = {
  concepts: { id: string; name: string; prerequisiteName: string | null }[]; // display order, see rule 1
  rows: {
    studentId: string;
    name: string;
    cells: Cell[];
    avgMastery: number | null;
    attendanceRate: number | null;
    risk: RiskResult;
  }[];
  classStats: {
    conceptId: string;
    name: string;
    average: number | null;
    assessedCount: number;
    weakCount: number;
    strongCount: number;
    unassessedCount: number;
  }[];
  weakestConcepts: { conceptId: string; name: string; average: number; assessedCount: number }[];
  atRisk: {
    studentId: string;
    name: string;
    level: 'AT_RISK' | 'WATCH';
    score: number;
    factors: RiskResult['factors'];
    weakestConcepts: string[];
  }[];
  coverage: {
    studentsTotal: number;
    studentsWithAnyAssessment: number;
    conceptsWithNoData: string[];
  };
  sessions: AnalyticsInput['sessions'];
};

/**
 * Topologically sorts concepts so prerequisites appear before their dependents.
 * Ties broken by concept name ascending.
 * Invalid or cyclical prerequisites are ignored so there are no infinite loops.
 */
function sortConceptsDisplayOrder(
  concepts: AnalyticsInput['concepts']
): { id: string; name: string; prerequisiteName: string | null }[] {
  if (concepts.length === 0) return [];

  const conceptMap = new Map<string, { id: string; name: string; prerequisiteId: string | null }>();
  for (const c of concepts) {
    conceptMap.set(c.id, c);
  }

  // Detect simple cycles: if a chain of prerequisites revisits an already visited concept, break it.
  const validPrereqMap = new Map<string, string | null>();
  for (const c of concepts) {
    if (!c.prerequisiteId || !conceptMap.has(c.prerequisiteId)) {
      validPrereqMap.set(c.id, null);
    } else {
      // Traverse up to detect cycles
      let curr: string | null = c.prerequisiteId;
      let hasCycle = false;
      const seen = new Set<string>([c.id]);

      while (curr) {
        if (seen.has(curr)) {
          hasCycle = true;
          break;
        }
        seen.add(curr);
        const parent = conceptMap.get(curr);
        curr = parent?.prerequisiteId && conceptMap.has(parent.prerequisiteId) ? parent.prerequisiteId : null;
      }

      if (hasCycle) {
        validPrereqMap.set(c.id, null);
      } else {
        validPrereqMap.set(c.id, c.prerequisiteId);
      }
    }
  }

  // In-degree & dependents graph
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const c of concepts) {
    inDegree.set(c.id, 0);
    dependents.set(c.id, []);
  }

  for (const c of concepts) {
    const pId = validPrereqMap.get(c.id);
    if (pId) {
      inDegree.set(c.id, (inDegree.get(c.id) || 0) + 1);
      dependents.get(pId)!.push(c.id);
    }
  }

  // Queue of nodes with in-degree 0
  let queue: string[] = concepts
    .filter((c) => inDegree.get(c.id) === 0)
    .map((c) => c.id)
    .sort((a, b) => conceptMap.get(a)!.name.localeCompare(conceptMap.get(b)!.name));

  const orderedIds: string[] = [];
  const processed = new Set<string>();

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    orderedIds.push(currentId);
    processed.add(currentId);

    const deps = dependents.get(currentId) || [];
    for (const depId of deps) {
      inDegree.set(depId, inDegree.get(depId)! - 1);
      if (inDegree.get(depId) === 0) {
        queue.push(depId);
      }
    }

    // Keep queue sorted by name
    queue.sort((a, b) => conceptMap.get(a)!.name.localeCompare(conceptMap.get(b)!.name));
  }

  // Any remaining nodes (e.g. from broken cycles) are appended sorted by name
  const remaining = concepts
    .filter((c) => !processed.has(c.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const c of remaining) {
    orderedIds.push(c.id);
  }

  return orderedIds.map((id) => {
    const c = conceptMap.get(id)!;
    const p = c.prerequisiteId ? conceptMap.get(c.prerequisiteId) : null;
    return {
      id: c.id,
      name: c.name,
      prerequisiteName: p ? p.name : null,
    };
  });
}

export function buildAnalytics(input: AnalyticsInput): AnalyticsResult {
  const { students = [], concepts = [], mastery = [], attendance = [], sessions = [] } = input;

  // Rule 8: Empty course returns empty structures without throwing
  if (students.length === 0 || concepts.length === 0) {
    const orderedConcepts = sortConceptsDisplayOrder(concepts);
    return {
      concepts: orderedConcepts,
      rows: [],
      classStats: orderedConcepts.map((c) => ({
        conceptId: c.id,
        name: c.name,
        average: null,
        assessedCount: 0,
        weakCount: 0,
        strongCount: 0,
        unassessedCount: 0,
      })),
      weakestConcepts: [],
      atRisk: [],
      coverage: {
        studentsTotal: students.length,
        studentsWithAnyAssessment: 0,
        conceptsWithNoData: orderedConcepts.map((c) => c.name),
      },
      sessions,
    };
  }

  // 1. Concept display order
  const orderedConcepts = sortConceptsDisplayOrder(concepts);
  const conceptNameMap = new Map<string, string>();
  for (const c of concepts) {
    conceptNameMap.set(c.id, c.name);
  }

  // Map mastery by `${studentId}:${conceptId}`
  const masteryMap = new Map<string, { score: number; attempts: number }>();
  for (const m of mastery) {
    masteryMap.set(`${m.studentId}:${m.conceptId}`, {
      score: m.score,
      attempts: m.attempts,
    });
  }

  // Map attendance by studentId
  const attendanceMap = new Map<string, { rate: number | null; present: number; total: number }>();
  for (const a of attendance) {
    attendanceMap.set(a.studentId, a);
  }

  // 2. Build rows and compute per-student metrics
  let studentsWithAnyAssessment = 0;

  const rawRows = students.map((student) => {
    let studentAssessedCount = 0;
    let studentScoreSum = 0;

    const cells: Cell[] = orderedConcepts.map((concept) => {
      const m = masteryMap.get(`${student.id}:${concept.id}`);

      // Rule 2: unassessed when no mastery row or attempts = 0
      if (!m || m.attempts === 0) {
        return {
          conceptId: concept.id,
          score: null,
          attempts: m ? m.attempts : 0,
          band: 'unassessed',
        };
      }

      studentAssessedCount++;
      studentScoreSum += m.score;

      let band: 'weak' | 'developing' | 'strong';
      if (m.score < MASTERY_WEAK) {
        band = 'weak';
      } else if (m.score < MASTERY_STRONG) {
        band = 'developing';
      } else {
        band = 'strong';
      }

      return {
        conceptId: concept.id,
        score: m.score,
        attempts: m.attempts,
        band,
      };
    });

    if (studentAssessedCount > 0) {
      studentsWithAnyAssessment++;
    }

    // Rule 3: avgMastery = mean over assessed cells only, or null
    const avgMastery = studentAssessedCount > 0 ? studentScoreSum / studentAssessedCount : null;

    const attRecord = attendanceMap.get(student.id);
    const attendanceRate = attRecord && attRecord.rate !== undefined ? attRecord.rate : null;

    // Do not duplicate risk formula: call computeRisk
    const risk = computeRisk({ attendanceRate, avgMastery });

    return {
      studentId: student.id,
      name: student.name,
      cells,
      avgMastery,
      attendanceRate,
      risk,
    };
  });

  // Rule 9: Rows are sorted by name by default
  const rows = [...rawRows].sort((a, b) => a.name.localeCompare(b.name));

  // 4. classStats per concept (in display order)
  const classStats = orderedConcepts.map((concept) => {
    let assessedCount = 0;
    let weakCount = 0;
    let strongCount = 0;
    let unassessedCount = 0;
    let scoreSum = 0;

    for (const r of rows) {
      const cell = r.cells.find((c) => c.conceptId === concept.id);
      if (!cell || cell.band === 'unassessed' || cell.score === null) {
        unassessedCount++;
      } else {
        assessedCount++;
        scoreSum += cell.score;
        if (cell.band === 'weak') {
          weakCount++;
        } else if (cell.band === 'strong') {
          strongCount++;
        }
      }
    }

    const average = assessedCount > 0 ? scoreSum / assessedCount : null;

    return {
      conceptId: concept.id,
      name: concept.name,
      average,
      assessedCount,
      weakCount,
      strongCount,
      unassessedCount,
    };
  });

  // 5. weakestConcepts = 3 lowest class averages among concepts with assessedCount >= MIN_ASSESSED
  const eligibleWeak = classStats.filter(
    (cs) => cs.assessedCount >= MIN_ASSESSED && cs.average !== null
  );

  const weakestConcepts = [...eligibleWeak]
    .sort((a, b) => {
      if (a.average! !== b.average!) {
        return a.average! - b.average!;
      }
      if (b.assessedCount !== a.assessedCount) {
        return b.assessedCount - a.assessedCount; // higher assessedCount breaks ties
      }
      return a.name.localeCompare(b.name);
    })
    .slice(0, 3)
    .map((cs) => ({
      conceptId: cs.conceptId,
      name: cs.name,
      average: cs.average!,
      assessedCount: cs.assessedCount,
    }));

  // 6. atRisk: students whose risk level is AT_RISK or WATCH
  // Rule 7: INSUFFICIENT_DATA students are NOT in atRisk
  const atRiskStudents = rows.filter(
    (r) => r.risk.level === 'AT_RISK' || r.risk.level === 'WATCH'
  );

  // Sorted: AT_RISK first, then by score descending, then by name
  atRiskStudents.sort((a, b) => {
    if (a.risk.level !== b.risk.level) {
      return a.risk.level === 'AT_RISK' ? -1 : 1;
    }
    const scoreA = a.risk.score ?? 0;
    const scoreB = b.risk.score ?? 0;
    if (scoreB !== scoreA) {
      return scoreB - scoreA; // descending
    }
    return a.name.localeCompare(b.name);
  });

  const atRisk = atRiskStudents.map((r) => {
    // weakestConcepts per student = up to 2 names of their lowest assessed concepts below MASTERY_STRONG
    const weakStudentConcepts = r.cells
      .filter((c) => c.band !== 'unassessed' && c.score !== null && c.score < MASTERY_STRONG)
      .sort((a, b) => {
        if (a.score! !== b.score!) {
          return a.score! - b.score!;
        }
        const nameA = conceptNameMap.get(a.conceptId) || '';
        const nameB = conceptNameMap.get(b.conceptId) || '';
        return nameA.localeCompare(nameB);
      })
      .slice(0, 2)
      .map((c) => conceptNameMap.get(c.conceptId) || c.conceptId);

    return {
      studentId: r.studentId,
      name: r.name,
      level: r.risk.level as 'AT_RISK' | 'WATCH',
      score: r.risk.score ?? 0,
      factors: r.risk.factors,
      weakestConcepts: weakStudentConcepts,
    };
  });

  // 7. Coverage
  const conceptsWithNoData = classStats
    .filter((cs) => cs.assessedCount === 0)
    .map((cs) => cs.name);

  const coverage = {
    studentsTotal: students.length,
    studentsWithAnyAssessment,
    conceptsWithNoData,
  };

  return {
    concepts: orderedConcepts,
    rows,
    classStats,
    weakestConcepts,
    atRisk,
    coverage,
    sessions,
  };
}

