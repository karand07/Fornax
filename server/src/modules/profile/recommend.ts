import {
  MASTERY_STRONG,
  MASTERY_WEAK,
  PREREQ_OK,
  MAX_RECOMMENDATIONS,
  MAX_RESOURCES_PER_REC,
} from '../../lib/thresholds.js';

export type ConceptInput = {
  id: string;
  name: string;
  score: number;
  attempts: number;
  prerequisiteId: string | null;
};

export type ResourceInput = {
  id: string;
  conceptId: string;
  title: string;
  type: string;
  difficulty: 1 | 2 | 3;
  url: string;
};

export type Recommendation = {
  conceptId: string;
  conceptName: string;
  mastery: number;
  reasonCode: 'WEAK_CONCEPT' | 'WEAK_PREREQUISITE';
  reason: string;
  dependents: { id: string; name: string; mastery: number }[];
  resources: ResourceInput[];
};

export function recommend(
  concepts: ConceptInput[],
  resources: ResourceInput[]
): {
  recommendations: Recommendation[];
  notAssessed: { id: string; name: string }[];
} {
  // 1. notAssessed = concepts with attempts = 0 (returned separately, never recommended)
  const notAssessed = concepts
    .filter((c) => c.attempts === 0)
    .map((c) => ({ id: c.id, name: c.name }));

  const conceptMap = new Map<string, ConceptInput>(
    concepts.map((c) => [c.id, c])
  );

  // 2. Candidates = assessed concepts with score < MASTERY_STRONG, sorted by score ascending (ties by name)
  const candidates = concepts
    .filter((c) => c.attempts > 0 && c.score < MASTERY_STRONG)
    .sort((a, b) => {
      if (a.score !== b.score) {
        return a.score - b.score;
      }
      return a.name.localeCompare(b.name);
    });

  // 3 & 4. Map targets and merge dependents
  type TargetEntry = {
    target: ConceptInput;
    dependents: { id: string; name: string; mastery: number }[];
  };

  const targetMap = new Map<string, TargetEntry>();
  const targetOrder: string[] = [];

  for (const candidate of candidates) {
    let targetConcept = candidate;
    let isPrereqRedirect = false;

    if (candidate.prerequisiteId) {
      const p = conceptMap.get(candidate.prerequisiteId);
      if (p && p.attempts > 0 && p.score < PREREQ_OK) {
        targetConcept = p;
        isPrereqRedirect = true;
      }
    }

    if (!targetMap.has(targetConcept.id)) {
      targetMap.set(targetConcept.id, {
        target: targetConcept,
        dependents: [],
      });
      targetOrder.push(targetConcept.id);
    }

    if (isPrereqRedirect) {
      const entry = targetMap.get(targetConcept.id)!;
      // Add dependent if not already present
      if (!entry.dependents.some((d) => d.id === candidate.id)) {
        entry.dependents.push({
          id: candidate.id,
          name: candidate.name,
          mastery: candidate.score,
        });
      }
    }
  }

  // 5. Take the first MAX_RECOMMENDATIONS targets
  const selectedTargetIds = targetOrder.slice(0, MAX_RECOMMENDATIONS);

  const recommendations: Recommendation[] = selectedTargetIds.map((targetId) => {
    const { target, dependents } = targetMap.get(targetId)!;
    const isWeakPrereq = dependents.length > 0;
    const reasonCode = isWeakPrereq ? 'WEAK_PREREQUISITE' : 'WEAK_CONCEPT';

    const targetPct = Math.round(target.score * 100);

    let reason: string;
    if (!isWeakPrereq) {
      reason = `Your mastery in ${target.name} is ${targetPct}%. Practice here will raise it.`;
    } else {
      if (dependents.length === 1) {
        const d = dependents[0];
        const dPct = Math.round(d.mastery * 100);
        reason = `Your mastery in ${target.name} is ${targetPct}%, and it is a prerequisite for ${d.name} (${dPct}%). Strengthening it will help with both.`;
      } else if (dependents.length === 2) {
        const d1 = dependents[0];
        const d2 = dependents[1];
        const d1Pct = Math.round(d1.mastery * 100);
        const d2Pct = Math.round(d2.mastery * 100);
        reason = `Your mastery in ${target.name} is ${targetPct}%, and it is a prerequisite for ${d1.name} (${d1Pct}%) and ${d2.name} (${d2Pct}%). Strengthening it will help across all of them.`;
      } else {
        reason = `Your mastery in ${target.name} is ${targetPct}%, and it is a prerequisite for ${dependents.length} other concepts. Strengthening it will unblock your progress.`;
      }
    }

    // 7. Resource selection
    const level: 1 | 2 = target.score < MASTERY_WEAK ? 1 : 2;
    const targetResources = resources
      .filter((r) => r.conceptId === target.id)
      .sort((a, b) => {
        const diffA = Math.abs(a.difficulty - level);
        const diffB = Math.abs(b.difficulty - level);
        if (diffA !== diffB) return diffA - diffB;
        if (a.difficulty !== b.difficulty) return a.difficulty - b.difficulty;
        return a.title.localeCompare(b.title);
      })
      .slice(0, MAX_RESOURCES_PER_REC);

    return {
      conceptId: target.id,
      conceptName: target.name,
      mastery: target.score,
      reasonCode,
      reason,
      dependents,
      resources: targetResources,
    };
  });

  return {
    recommendations,
    notAssessed,
  };
}
