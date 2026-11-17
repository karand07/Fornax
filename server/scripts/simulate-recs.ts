import {
  recommend,
  ConceptInput,
  ResourceInput,
} from '../src/modules/profile/recommend.js';
import { computeRisk } from '../src/modules/profile/risk.js';

interface SyntheticStudent {
  id: string;
  name: string;
  attendanceRate: number | null;
  conceptScores: { [conceptId: string]: { score: number; attempts: number } };
}

function main() {
  console.log('===============================================================');
  console.log('   Fornax Adaptive Profile & Recommendations Simulator (Day 11)');
  console.log('===============================================================\n');

  // Hardcoded 6-concept graph:
  // C1 (ER Model) -> C2 (Normalization) -> C3 (SQL Optimization) & C4 (Transactions) -> C5 (Indexing) & C6 (Consensus)
  const baseConcepts: Array<{ id: string; name: string; prerequisiteId: string | null }> = [
    { id: 'c1', name: 'ER Modeling', prerequisiteId: null },
    { id: 'c2', name: 'Normalization', prerequisiteId: 'c1' },
    { id: 'c3', name: 'Query Optimization', prerequisiteId: 'c2' },
    { id: 'c4', name: 'Transactions', prerequisiteId: 'c2' },
    { id: 'c5', name: 'B-Tree Indexing', prerequisiteId: 'c3' },
    { id: 'c6', name: 'Distributed Consensus', prerequisiteId: 'c4' },
  ];

  // 3 synthetic resources per concept
  const resources: ResourceInput[] = [];
  for (const c of baseConcepts) {
    resources.push(
      {
        id: `res-${c.id}-1`,
        conceptId: c.id,
        title: `${c.name} Primer & Guided Exercises`,
        type: 'ARTICLE',
        difficulty: 1,
        url: `https://learn.fornax.edu/${c.id}/primer`,
      },
      {
        id: `res-${c.id}-2`,
        conceptId: c.id,
        title: `${c.name} Core Workshop & Interactive Lab`,
        type: 'EXERCISE',
        difficulty: 2,
        url: `https://learn.fornax.edu/${c.id}/workshop`,
      },
      {
        id: `res-${c.id}-3`,
        conceptId: c.id,
        title: `${c.name} Advanced Architectures & Deep Dive`,
        type: 'VIDEO',
        difficulty: 3,
        url: `https://learn.fornax.edu/${c.id}/deep-dive`,
      }
    );
  }

  // 5 Synthetic Students
  const students: SyntheticStudent[] = [
    {
      id: 's1',
      name: 'Alice (All Strong)',
      attendanceRate: 0.95,
      conceptScores: {
        c1: { score: 0.85, attempts: 5 },
        c2: { score: 0.90, attempts: 4 },
        c3: { score: 0.88, attempts: 5 },
        c4: { score: 0.92, attempts: 3 },
        c5: { score: 0.80, attempts: 4 },
        c6: { score: 0.86, attempts: 4 },
      },
    },
    {
      id: 's2',
      name: 'Bob (All Weak)',
      attendanceRate: 0.40,
      conceptScores: {
        c1: { score: 0.35, attempts: 3 },
        c2: { score: 0.30, attempts: 4 },
        c3: { score: 0.38, attempts: 2 },
        c4: { score: 0.32, attempts: 3 },
        c5: { score: 0.25, attempts: 2 },
        c6: { score: 0.28, attempts: 3 },
      },
    },
    {
      id: 's3',
      name: 'Charlie (Weak Prerequisite with Developing Dependent)',
      attendanceRate: 0.82,
      conceptScores: {
        c1: { score: 0.42, attempts: 4 }, // Prereq < 0.6
        c2: { score: 0.55, attempts: 3 }, // Dependent < 0.7
        c3: { score: 0.80, attempts: 5 },
        c4: { score: 0.85, attempts: 4 },
        c5: { score: 0.78, attempts: 3 },
        c6: { score: 0.82, attempts: 4 },
      },
    },
    {
      id: 's4',
      name: 'Diana (Two Concepts Sharing One Weak Prerequisite)',
      attendanceRate: 0.68,
      conceptScores: {
        c1: { score: 0.85, attempts: 5 },
        c2: { score: 0.45, attempts: 4 }, // Prereq < 0.6
        c3: { score: 0.50, attempts: 3 }, // Dep 1 (Query Opt)
        c4: { score: 0.52, attempts: 3 }, // Dep 2 (Transactions)
        c5: { score: 0.75, attempts: 4 },
        c6: { score: 0.80, attempts: 4 },
      },
    },
    {
      id: 's5',
      name: 'Evan (Mostly Unassessed)',
      attendanceRate: null,
      conceptScores: {
        c1: { score: 0.45, attempts: 2 }, // Only 1 assessed
        c2: { score: 0.50, attempts: 0 },
        c3: { score: 0.50, attempts: 0 },
        c4: { score: 0.50, attempts: 0 },
        c5: { score: 0.50, attempts: 0 },
        c6: { score: 0.50, attempts: 0 },
      },
    },
  ];

  let allChecksPassed = true;

  for (const s of students) {
    console.log(`---------------------------------------------------------------`);
    console.log(`Student: ${s.name} (ID: ${s.id})`);

    const conceptInputs: ConceptInput[] = baseConcepts.map((b) => {
      const perf = s.conceptScores[b.id] || { score: 0.5, attempts: 0 };
      return {
        id: b.id,
        name: b.name,
        score: perf.score,
        attempts: perf.attempts,
        prerequisiteId: b.prerequisiteId,
      };
    });

    const assessed = conceptInputs.filter((c) => c.attempts > 0);
    const avgMastery =
      assessed.length > 0
        ? assessed.reduce((acc, c) => acc + c.score, 0) / assessed.length
        : null;

    const risk = computeRisk({ attendanceRate: s.attendanceRate, avgMastery });
    const { recommendations, notAssessed } = recommend(conceptInputs, resources);

    console.log(`Attendance: ${s.attendanceRate !== null ? `${Math.round(s.attendanceRate * 100)}%` : 'N/A'}`);
    console.log(`Avg Mastery: ${avgMastery !== null ? `${Math.round(avgMastery * 100)}%` : 'N/A'}`);
    console.log(`Risk Level: [${risk.level}] Score: ${risk.score ?? 'null'} Weights: (att: ${risk.usedWeights.attendance}, mast: ${risk.usedWeights.mastery})`);
    if (risk.factors.length > 0) {
      console.log(`Risk Factors: ${risk.factors.map((f) => f.message).join(' | ')}`);
    }

    console.log(`Recommendations (${recommendations.length}):`);
    if (recommendations.length === 0) {
      console.log(`  (None - all assessed concepts meet mastery threshold)`);
    } else {
      for (const rec of recommendations) {
        console.log(`  * [${rec.reasonCode}] ${rec.conceptName} (${Math.round(rec.mastery * 100)}%)`);
        console.log(`    Reason: "${rec.reason}"`);
        console.log(`    Top Resource: "${rec.resources[0]?.title || 'None'}" (Diff: ${rec.resources[0]?.difficulty || 'N/A'})`);
      }
    }

    console.log(`Not Assessed (${notAssessed.length}): ${notAssessed.map((n) => n.name).join(', ') || 'None'}`);

    // --- Automated Verification Checks ---
    // Check 1: every reason's percentages equal the input scores
    for (const rec of recommendations) {
      const targetInput = conceptInputs.find((c) => c.id === rec.conceptId);
      if (!targetInput) {
        console.error(`FAIL: Target concept ${rec.conceptId} not found in concept inputs.`);
        allChecksPassed = false;
        continue;
      }
      const targetPct = Math.round(targetInput.score * 100);
      if (!rec.reason.includes(`${targetPct}%`)) {
        console.error(`FAIL: Reason "${rec.reason}" does not contain target's score ${targetPct}%.`);
        allChecksPassed = false;
      }

      for (const dep of rec.dependents) {
        const depInput = conceptInputs.find((c) => c.id === dep.id);
        if (!depInput) {
          console.error(`FAIL: Dependent concept ${dep.id} not found.`);
          allChecksPassed = false;
          continue;
        }
        const depPct = Math.round(depInput.score * 100);
        if (!rec.reason.includes(`${depPct}%`)) {
          console.error(`FAIL: Reason does not contain dependent's score ${depPct}%.`);
          allChecksPassed = false;
        }
      }
    }

    // Check 2: a WEAK_PREREQUISITE target really is a prerequisite of each listed dependent
    for (const rec of recommendations) {
      if (rec.reasonCode === 'WEAK_PREREQUISITE') {
        for (const dep of rec.dependents) {
          const depInput = conceptInputs.find((c) => c.id === dep.id);
          if (depInput?.prerequisiteId !== rec.conceptId) {
            console.error(`FAIL: ${rec.conceptName} is NOT a prerequisite of ${dep.name}.`);
            allChecksPassed = false;
          }
        }
      }
    }

    // Check 3: no unassessed concept is recommended
    for (const rec of recommendations) {
      const c = conceptInputs.find((ci) => ci.id === rec.conceptId);
      if (c && c.attempts === 0) {
        console.error(`FAIL: Unassessed concept ${rec.conceptName} was recommended.`);
        allChecksPassed = false;
      }
    }

    console.log();
  }

  console.log('===============================================================');
  if (allChecksPassed) {
    console.log('All automated simulator checks PASSED successfully!');
    process.exit(0);
  } else {
    console.error('Simulator verification checks FAILED.');
    process.exit(1);
  }
}

main();
