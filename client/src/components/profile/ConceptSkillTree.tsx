import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import {
  Network,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Sparkles,
  Dumbbell,
  ArrowRight,
  Info,
  Layers,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { masteryBand, formatPercent } from '../../lib/mastery-ui';
import type { ConceptMasteryItem } from './MasteryRadar';

export interface ConceptSkillTreeProps {
  concepts: ConceptMasteryItem[];
  onStartPractice?: (conceptId: string, conceptTitle: string) => void;
  className?: string;
}

type ConceptStatus = 'MASTERED' | 'DEVELOPING' | 'WEAK' | 'BLOCKED' | 'UNASSESSED';

interface EnrichedConceptNode extends ConceptMasteryItem {
  status: ConceptStatus;
  statusLabel: string;
  isBlocked: boolean;
  blockingPrereqs: { id: string; name: string; score: number }[];
  fulfilledPrereqs: { id: string; name: string; score: number }[];
  dependents: { id: string; name: string; score: number }[];
  tier: number;
}

export function ConceptSkillTree({
  concepts,
  onStartPractice,
  className = '',
}: ConceptSkillTreeProps) {
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'PRACTICE' | 'MASTERED' | 'BLOCKED'>('ALL');

  // Build lookup maps and graph structure
  const { enrichedNodes, tiers, metrics } = useMemo(() => {
    const conceptMap = new Map<string, ConceptMasteryItem>();
    concepts.forEach((c) => conceptMap.set(c.id, c));

    // Map prerequisites and dependents
    const dependentsMap = new Map<string, string[]>();
    concepts.forEach((c) => {
      const prereqList: string[] = [];
      if (c.prerequisites && c.prerequisites.length > 0) {
        c.prerequisites.forEach((p) => prereqList.push(p.id));
      } else if (c.prerequisiteId) {
        prereqList.push(c.prerequisiteId);
      }

      prereqList.forEach((pid) => {
        if (!dependentsMap.has(pid)) {
          dependentsMap.set(pid, []);
        }
        dependentsMap.get(pid)!.push(c.id);
      });
    });

    // Compute topological tier / depth for each concept
    const memoTier = new Map<string, number>();
    const getTier = (id: string, visited = new Set<string>()): number => {
      if (memoTier.has(id)) return memoTier.get(id)!;
      if (visited.has(id)) return 1; // cycle fallback
      visited.add(id);

      const item = conceptMap.get(id);
      if (!item) return 1;

      const prereqIds = item.prerequisites?.map((p) => p.id) || (item.prerequisiteId ? [item.prerequisiteId] : []);
      if (prereqIds.length === 0) {
        memoTier.set(id, 1);
        return 1;
      }

      const maxParentTier = Math.max(...prereqIds.map((pid) => getTier(pid, new Set(visited))));
      const currentTier = maxParentTier + 1;
      memoTier.set(id, currentTier);
      return currentTier;
    };

    // Enrich each node with status, fulfilled/blocking prereqs, and dependents
    const enriched: EnrichedConceptNode[] = concepts.map((c) => {
      const isAssessed = c.attempts > 0;
      const prereqs = c.prerequisites || (c.prerequisiteId ? [{ id: c.prerequisiteId, name: c.prerequisiteName || '' }] : []);

      const blockingPrereqs: { id: string; name: string; score: number }[] = [];
      const fulfilledPrereqs: { id: string; name: string; score: number }[] = [];

      prereqs.forEach((p) => {
        const parent = conceptMap.get(p.id);
        const pScore = parent?.score ?? 0.5;
        const pAttempts = parent?.attempts ?? 0;
        // Prerequisite is fulfilled if assessed and score >= 0.60
        if (pAttempts > 0 && pScore >= 0.6) {
          fulfilledPrereqs.push({ id: p.id, name: p.name || parent?.name || 'Prerequisite', score: pScore });
        } else {
          blockingPrereqs.push({ id: p.id, name: p.name || parent?.name || 'Prerequisite', score: pScore });
        }
      });

      const isBlocked = blockingPrereqs.length > 0;

      let status: ConceptStatus = 'UNASSESSED';
      let statusLabel = 'Not Assessed';

      if (!isAssessed) {
        status = 'UNASSESSED';
        statusLabel = 'Not Assessed';
      } else if (c.score >= 0.7) {
        status = 'MASTERED';
        statusLabel = 'Mastered';
      } else if (isBlocked) {
        status = 'BLOCKED';
        statusLabel = 'Prerequisite Needed';
      } else if (c.score >= 0.4) {
        status = 'DEVELOPING';
        statusLabel = 'Ready to Practice';
      } else {
        status = 'WEAK';
        statusLabel = 'Needs Attention';
      }

      // Collect dependent concepts
      const depIds = dependentsMap.get(c.id) || [];
      const dependents = depIds
        .map((did) => {
          const dep = conceptMap.get(did);
          return dep ? { id: dep.id, name: dep.name, score: dep.score } : null;
        })
        .filter((d): d is { id: string; name: string; score: number } => d !== null);

      return {
        ...c,
        status,
        statusLabel,
        isBlocked,
        blockingPrereqs,
        fulfilledPrereqs,
        dependents,
        tier: getTier(c.id),
      };
    });

    // Group into tiers
    const tierMap = new Map<number, EnrichedConceptNode[]>();
    enriched.forEach((node) => {
      const t = node.tier;
      if (!tierMap.has(t)) tierMap.set(t, []);
      tierMap.get(t)!.push(node);
    });

    const sortedTiers = Array.from(tierMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([tierNumber, nodes]) => ({
        tierNumber,
        title:
          tierNumber === 1
            ? 'Stage 1: Foundation Concepts'
            : tierNumber === 2
            ? 'Stage 2: Core Architecture'
            : tierNumber === 3
            ? 'Stage 3: Advanced Optimization'
            : `Stage ${tierNumber}: Specialization`,
        nodes: nodes.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
      }));

    // Metrics summary
    const totalCount = enriched.length;
    const masteredCount = enriched.filter((n) => n.status === 'MASTERED').length;
    const practiceCount = enriched.filter((n) => n.status === 'DEVELOPING' || n.status === 'WEAK').length;
    const blockedCount = enriched.filter((n) => n.status === 'BLOCKED').length;

    return {
      enrichedNodes: enriched,
      tiers: sortedTiers,
      metrics: { totalCount, masteredCount, practiceCount, blockedCount },
    };
  }, [concepts]);

  // Selected node details
  const selectedNode = useMemo(() => {
    if (!selectedConceptId) {
      return enrichedNodes[0] || null;
    }
    return enrichedNodes.find((n) => n.id === selectedConceptId) || enrichedNodes[0] || null;
  }, [selectedConceptId, enrichedNodes]);

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    if (filter === 'MASTERED') return enrichedNodes.filter((n) => n.status === 'MASTERED');
    if (filter === 'PRACTICE') return enrichedNodes.filter((n) => n.status === 'DEVELOPING' || n.status === 'WEAK');
    if (filter === 'BLOCKED') return enrichedNodes.filter((n) => n.status === 'BLOCKED');
    return enrichedNodes;
  }, [enrichedNodes, filter]);

  if (concepts.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-primary" />
            <CardTitle className="text-base font-semibold">Adaptive Skill Tree</CardTitle>
          </div>
          <CardDescription>Curriculum knowledge graph and prerequisite learning pathways</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-8 text-center border border-dashed rounded-lg text-sm text-muted-foreground">
            No concepts published for this course yet.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Network className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <span>Adaptive Concept Skill Tree</span>
                <Badge variant="outline" className="text-[10px] font-mono border-indigo-500/30 text-indigo-400 bg-indigo-500/10">
                  Knowledge Graph
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Visualizing prerequisite dependencies, current mastery progression, and unblocked milestones
              </CardDescription>
            </div>
          </div>

          {/* Metric Badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="secondary" className="text-xs gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3" />
              {metrics.masteredCount}/{metrics.totalCount} Mastered
            </Badge>
            {metrics.practiceCount > 0 && (
              <Badge variant="secondary" className="text-xs gap-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Dumbbell className="w-3 h-3" />
                {metrics.practiceCount} Ready for Drill
              </Badge>
            )}
            {metrics.blockedCount > 0 && (
              <Badge variant="secondary" className="text-xs gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Lock className="w-3 h-3" />
                {metrics.blockedCount} Blocked by Prereq
              </Badge>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2 pt-3 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium">Filter:</span>
          <Button
            size="sm"
            variant={filter === 'ALL' ? 'default' : 'outline'}
            className="h-7 text-xs px-2.5"
            onClick={() => setFilter('ALL')}
          >
            All Concepts ({metrics.totalCount})
          </Button>
          <Button
            size="sm"
            variant={filter === 'PRACTICE' ? 'default' : 'outline'}
            className="h-7 text-xs px-2.5"
            onClick={() => setFilter('PRACTICE')}
          >
            Practice Ready ({metrics.practiceCount})
          </Button>
          <Button
            size="sm"
            variant={filter === 'MASTERED' ? 'default' : 'outline'}
            className="h-7 text-xs px-2.5"
            onClick={() => setFilter('MASTERED')}
          >
            Mastered ({metrics.masteredCount})
          </Button>
          {metrics.blockedCount > 0 && (
            <Button
              size="sm"
              variant={filter === 'BLOCKED' ? 'default' : 'outline'}
              className="h-7 text-xs px-2.5"
              onClick={() => setFilter('BLOCKED')}
            >
              Needs Prerequisite ({metrics.blockedCount})
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Screen Reader Table */}
        <table className="sr-only">
          <caption>Course Knowledge Graph and Prerequisite Tree</caption>
          <thead>
            <tr>
              <th scope="col">Concept</th>
              <th scope="col">Stage</th>
              <th scope="col">Mastery</th>
              <th scope="col">Status</th>
              <th scope="col">Prerequisites</th>
            </tr>
          </thead>
          <tbody>
            {enrichedNodes.map((n) => (
              <tr key={n.id}>
                <td>{n.name}</td>
                <td>Stage {n.tier}</td>
                <td>{Math.round(n.score * 100)}%</td>
                <td>{n.statusLabel}</td>
                <td>{n.prerequisites?.map((p) => p.name).join(', ') || 'None'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Interactive Layout: Left Side Tree Stages + Right Side Inspector Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Progression Pathway (Left 7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {tiers.map((tier, tierIdx) => {
              const visibleTierNodes = tier.nodes.filter((n) => filteredNodes.some((fn) => fn.id === n.id));
              if (visibleTierNodes.length === 0) return null;

              return (
                <div key={tier.tierNumber} className="space-y-3 relative">
                  {/* Stage Heading */}
                  <div className="flex items-center gap-2 pb-1 border-b border-border/40">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    <h4 className="text-xs font-semibold text-slate-200 tracking-wide uppercase">
                      {tier.title}
                    </h4>
                    <span className="text-[11px] text-muted-foreground ml-auto font-mono">
                      {visibleTierNodes.length} {visibleTierNodes.length === 1 ? 'Concept' : 'Concepts'}
                    </span>
                  </div>

                  {/* Stage Concept Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {visibleTierNodes.map((node) => {
                      const isSelected = selectedNode?.id === node.id;
                      const isAssessed = node.attempts > 0;
                      const band = masteryBand(node.score);

                      let borderClasses = 'border-border/60 hover:border-slate-600 bg-card/60';
                      let statusBadge = (
                        <Badge variant="outline" className="text-[10px] py-0 text-muted-foreground">
                          Not Assessed
                        </Badge>
                      );

                      if (node.status === 'MASTERED') {
                        borderClasses = isSelected
                          ? 'border-emerald-500 bg-emerald-500/10 shadow-emerald-950/40 shadow-md ring-1 ring-emerald-500'
                          : 'border-emerald-500/40 hover:border-emerald-500/70 bg-emerald-500/5';
                        statusBadge = (
                          <Badge className="text-[10px] py-0 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Mastered
                          </Badge>
                        );
                      } else if (node.status === 'BLOCKED') {
                        borderClasses = isSelected
                          ? 'border-amber-500 bg-amber-500/10 shadow-amber-950/40 shadow-md ring-1 ring-amber-500'
                          : 'border-amber-500/40 hover:border-amber-500/70 bg-amber-500/5 border-dashed';
                        statusBadge = (
                          <Badge className="text-[10px] py-0 bg-amber-500/20 text-amber-400 border border-amber-500/30 gap-1">
                            <Lock className="w-2.5 h-2.5" /> Blocked
                          </Badge>
                        );
                      } else if (node.status === 'DEVELOPING') {
                        borderClasses = isSelected
                          ? 'border-indigo-500 bg-indigo-500/10 shadow-indigo-950/40 shadow-md ring-1 ring-indigo-500'
                          : 'border-indigo-500/40 hover:border-indigo-500/70 bg-indigo-500/5';
                        statusBadge = (
                          <Badge className="text-[10px] py-0 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                            Ready
                          </Badge>
                        );
                      } else if (node.status === 'WEAK') {
                        borderClasses = isSelected
                          ? 'border-rose-500 bg-rose-500/10 shadow-rose-950/40 shadow-md ring-1 ring-rose-500'
                          : 'border-rose-500/40 hover:border-rose-500/70 bg-rose-500/5';
                        statusBadge = (
                          <Badge className="text-[10px] py-0 bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            Support
                          </Badge>
                        );
                      } else if (isSelected) {
                        borderClasses = 'border-primary bg-primary/5 ring-1 ring-primary';
                      }

                      return (
                        <div
                          key={node.id}
                          onClick={() => setSelectedConceptId(node.id)}
                          className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${borderClasses}`}
                        >
                          {/* Card Header */}
                          <div>
                            <div className="flex items-start justify-between gap-1.5 mb-1">
                              <h5 className="text-xs font-semibold text-slate-100 line-clamp-2">
                                {node.name}
                              </h5>
                              <div className="shrink-0">{statusBadge}</div>
                            </div>

                            {/* Prerequisite Indicator if any */}
                            {node.prerequisites && node.prerequisites.length > 0 && (
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                                <span className="text-slate-400 font-medium">Requires:</span>
                                <span className="truncate">
                                  {node.prerequisites.map((p) => p.name).join(', ')}
                                </span>
                              </p>
                            )}
                          </div>

                          {/* Progress bar & score */}
                          <div className="space-y-1 pt-1">
                            <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                              <span>Mastery</span>
                              <span className={isAssessed ? band.textColor : 'text-slate-400'}>
                                {isAssessed ? formatPercent(node.score) : '—'}
                              </span>
                            </div>
                            <Progress value={isAssessed ? node.score * 100 : 0} className="h-1.5" />
                          </div>

                          {/* Quick Card Footer */}
                          <div className="flex items-center justify-between pt-1 border-t border-border/30 text-[10px] text-muted-foreground">
                            <span>{node.attempts} {node.attempts === 1 ? 'attempt' : 'attempts'}</span>
                            <div className="flex items-center gap-0.5 text-primary font-medium hover:underline">
                              <span>Inspect</span>
                              <ChevronRight className="w-3 h-3" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Flow Connector Arrow to Next Tier */}
                  {tierIdx < tiers.length - 1 && (
                    <div className="flex items-center justify-center py-1">
                      <div className="h-4 w-px bg-border/80"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Side: Concept Inspector & Remediation Panel (5 Cols) */}
          <div className="lg:col-span-5">
            {selectedNode ? (
              <div className="rounded-xl border border-border/80 bg-slate-900/90 p-4 space-y-4 sticky top-6 shadow-md">
                {/* Node Title & Status */}
                <div className="space-y-2 pb-3 border-b border-border/50">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-[10px] font-mono text-indigo-400 border-indigo-500/30">
                      Stage {selectedNode.tier} Concept
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-xs ${masteryBand(selectedNode.score).bgColor} ${masteryBand(selectedNode.score).textColor} border ${masteryBand(selectedNode.score).borderColor}`}
                    >
                      {selectedNode.statusLabel} ({formatPercent(selectedNode.score)})
                    </Badge>
                  </div>
                  <h3 className="text-sm font-bold text-slate-100">{selectedNode.name}</h3>
                  {selectedNode.description && (
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {selectedNode.description}
                    </p>
                  )}
                </div>

                {/* Mastery Stats Bar */}
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Current Mastery Level</span>
                    <span className="font-mono font-bold text-slate-100">
                      {formatPercent(selectedNode.score)}
                    </span>
                  </div>
                  <Progress value={selectedNode.attempts > 0 ? selectedNode.score * 100 : 0} className="h-2" />
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                    <span>Quiz & Drill Attempts: {selectedNode.attempts}</span>
                    <span>Status: {selectedNode.attempts > 0 ? 'Assessed' : 'Not Assessed'}</span>
                  </div>
                </div>

                {/* Prerequisite Requirements */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Prerequisite Knowledge Requirements</span>
                  </h4>

                  {selectedNode.prerequisites && selectedNode.prerequisites.length > 0 ? (
                    <div className="space-y-1.5">
                      {selectedNode.prerequisites.map((p) => {
                        const isBlocking = selectedNode.blockingPrereqs.some((bp) => bp.id === p.id);
                        const prereqNode = enrichedNodes.find((n) => n.id === p.id);
                        const pScore = prereqNode?.score ?? 0.5;

                        return (
                          <div
                            key={p.id}
                            className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                              isBlocking
                                ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="font-medium truncate">{p.name}</p>
                              <p className="text-[10px] opacity-80">
                                {isBlocking
                                  ? `Mastery ${formatPercent(pScore)} (requires ≥60% for smooth unblocking)`
                                  : `Mastery ${formatPercent(pScore)} — Satisfied`}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-[10px] shrink-0 ${
                                isBlocking
                                  ? 'border-amber-500/50 text-amber-400'
                                  : 'border-emerald-500/50 text-emerald-400'
                              }`}
                            >
                              {isBlocking ? 'Needs Review' : 'Ready'}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground p-2.5 rounded-lg border border-dashed border-border/50 bg-muted/20">
                      Foundation concept: No prerequisite dependencies required.
                    </div>
                  )}
                </div>

                {/* Downstream Unlocks */}
                {selectedNode.dependents.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Unlocks Downstream Concepts</span>
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedNode.dependents.map((dep) => (
                        <Badge
                          key={dep.id}
                          variant="secondary"
                          className="text-[11px] gap-1 bg-slate-800 text-slate-200 border border-slate-700 cursor-pointer hover:bg-slate-700"
                          onClick={() => setSelectedConceptId(dep.id)}
                        >
                          <ArrowRight className="w-3 h-3 text-emerald-400" />
                          {dep.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Remediation Button */}
                <div className="pt-2 border-t border-border/50 space-y-2">
                  {selectedNode.isBlocked && selectedNode.blockingPrereqs[0] ? (
                    <div className="space-y-2">
                      <div className="text-xs text-amber-300 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/30 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                        <div>
                          <p className="font-semibold">Recommended Prerequisite Focus</p>
                          <p className="text-[11px] mt-0.5 text-slate-300">
                            We recommend mastering <strong>{selectedNode.blockingPrereqs[0].name}</strong> first to build the necessary foundation.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          className="w-full text-xs gap-1.5 bg-amber-600 hover:bg-amber-500 text-white"
                          onClick={() =>
                            onStartPractice?.(
                              selectedNode.blockingPrereqs[0].id,
                              selectedNode.blockingPrereqs[0].name
                            )
                          }
                        >
                          <Dumbbell className="w-3.5 h-3.5" />
                          Practice Prerequisite
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs gap-1.5 border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10"
                          onClick={() => onStartPractice?.(selectedNode.id, selectedNode.name)}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Practice Anyway
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
                      onClick={() => onStartPractice?.(selectedNode.id, selectedNode.name)}
                    >
                      <Dumbbell className="w-3.5 h-3.5" />
                      Start Adaptive Practice Drill
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl border border-dashed border-border/60 text-center text-xs text-muted-foreground">
                <Info className="w-5 h-5 mx-auto mb-2 text-muted-foreground/60" />
                Select any concept node in the tree to inspect details, prerequisites, and launch practice drills.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
