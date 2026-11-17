import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, ArrowUpDown, Filter } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { HeatmapCell } from './HeatmapCell';
import { ClassStatsRow, ConceptClassStat } from './ClassStatsRow';
import { RiskBadge } from '../profile/RiskBadge';
import { filterAndSortRows, SortOption } from '../../lib/analytics-sort';
import { formatPercent } from '../../lib/mastery-ui';
import type { AnalyticsRow } from '../../api/hooks';

export interface HeatmapProps {
  courseId: string;
  concepts: { id: string; name: string; prerequisiteName: string | null }[];
  rows: AnalyticsRow[];
  classStats: ConceptClassStat[];
  classAvgMastery: number | null;
  classAvgAttendance: number | null;
}

export function Heatmap({
  courseId,
  concepts,
  rows,
  classStats,
  classAvgMastery,
  classAvgAttendance,
}: HeatmapProps) {
  const navigate = useNavigate();
  const [sortOption, setSortOption] = useState<SortOption>('name');
  const [onlyAtRisk, setOnlyAtRisk] = useState<boolean>(false);
  const [hoveredColIndex, setHoveredColIndex] = useState<number | null>(null);

  // Filter and sort rows using the pure helper
  const processedRows = useMemo<AnalyticsRow[]>(() => {
    return filterAndSortRows<AnalyticsRow>(rows, {
      sort: sortOption,
      onlyAtRisk,
    });
  }, [rows, sortOption, onlyAtRisk]);

  const handleStudentClick = (studentId: string) => {
    navigate(`/teacher/courses/${courseId}/students/${studentId}`);
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-semibold">Concept Mastery Heatmap</CardTitle>
            <CardDescription className="text-xs">
              Topic understanding across all enrolled students. Color and letters convey mastery bands.
            </CardDescription>
          </div>

          {/* Controls: Sort and Filter */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">Sort:</span>
              <Select value={sortOption} onValueChange={(val) => setSortOption(val as SortOption)}>
                <SelectTrigger className="w-40 h-8 text-xs bg-background">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name" className="text-xs">Student Name</SelectItem>
                  <SelectItem value="risk" className="text-xs">Risk Priority</SelectItem>
                  <SelectItem value="mastery" className="text-xs">Average Mastery</SelectItem>
                  <SelectItem value="attendance" className="text-xs">Attendance Rate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 border-l border-border pl-4">
              <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
              <label htmlFor="risk-filter-toggle" className="text-xs text-muted-foreground cursor-pointer">
                Only watch/at-risk
              </label>
              <Switch
                id="risk-filter-toggle"
                checked={onlyAtRisk}
                onCheckedChange={setOnlyAtRisk}
              />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Scrollable Heatmap Table */}
        <div className="relative overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="bg-muted/70 text-xs text-foreground font-semibold border-b border-border">
              <tr>
                {/* Sticky student name column */}
                <th
                  scope="col"
                  className="sticky left-0 z-20 bg-muted/95 p-3 border-r border-border min-w-[180px] shadow-sm"
                >
                  Student ({processedRows.length})
                </th>

                {/* Overall metrics columns */}
                <th scope="col" className="p-2 text-center border-r border-border min-w-[80px]">
                  Attendance
                </th>
                <th scope="col" className="p-2 text-center border-r border-border min-w-[80px]">
                  Mastery
                </th>
                <th scope="col" className="p-2 text-center border-r border-border min-w-[90px]">
                  Risk
                </th>

                {/* Concept columns in API order */}
                {concepts.map((concept, idx) => (
                  <th
                    key={concept.id}
                    scope="col"
                    onMouseEnter={() => setHoveredColIndex(idx)}
                    onMouseLeave={() => setHoveredColIndex(null)}
                    className={`p-2 text-center border-r border-border min-w-[110px] max-w-[140px] transition-colors ${
                      hoveredColIndex === idx ? 'bg-primary/10' : ''
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className="truncate block" title={concept.name}>
                        {concept.name}
                      </span>
                      {concept.prerequisiteName && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">
                              Prerequisite: <span className="font-semibold">{concept.prerequisiteName}</span>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="text-xs divide-y divide-border">
              {processedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={4 + concepts.length}
                    className="p-8 text-center text-muted-foreground bg-muted/10"
                  >
                    {onlyAtRisk
                      ? 'No students currently flagged as Watch or At-Risk.'
                      : 'No students enrolled in this course.'}
                  </td>
                </tr>
              ) : (
                processedRows.map((row) => (
                  <tr key={row.studentId} className="hover:bg-muted/30 transition-colors">
                    {/* Sticky student name */}
                    <th
                      scope="row"
                      className="sticky left-0 z-10 bg-card p-3 border-r border-border font-medium shadow-sm"
                    >
                      <button
                        type="button"
                        onClick={() => handleStudentClick(row.studentId)}
                        className="text-left font-semibold text-foreground hover:text-primary hover:underline focus:outline-none focus:ring-1 focus:ring-primary rounded truncate max-w-[160px] block"
                      >
                        {row.name}
                      </button>
                    </th>

                    {/* Attendance % */}
                    <td className="p-2 text-center border-r border-border font-mono">
                      {row.attendanceRate !== null ? formatPercent(row.attendanceRate) : 'n/a'}
                    </td>

                    {/* Avg mastery % */}
                    <td className="p-2 text-center border-r border-border font-mono font-medium">
                      {row.avgMastery !== null ? formatPercent(row.avgMastery) : 'n/a'}
                    </td>

                    {/* Risk Badge */}
                    <td className="p-2 text-center border-r border-border">
                      <div className="flex justify-center">
                        <RiskBadge
                          level={row.risk.level}
                          variant="student"
                          className="scale-90"
                        />
                      </div>
                    </td>

                    {/* Concept cells */}
                    {concepts.map((concept, idx) => {
                      const cell = row.cells.find((c) => c.conceptId === concept.id) || {
                        conceptId: concept.id,
                        score: null,
                        attempts: 0,
                        band: 'unassessed' as const,
                      };

                      return (
                        <HeatmapCell
                          key={concept.id}
                          conceptName={concept.name}
                          cell={cell}
                          onClick={() => handleStudentClick(row.studentId)}
                          isHoveredColumn={hoveredColIndex === idx}
                        />
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>

            {/* Footer Row: Class Averages */}
            <tfoot>
              <ClassStatsRow
                stats={classStats}
                classAvgMastery={classAvgMastery}
                classAvgAttendance={classAvgAttendance}
                hoveredColumnIndex={hoveredColIndex}
              />
            </tfoot>
          </table>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-lg bg-muted/20 border border-border/60 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-semibold text-muted-foreground uppercase text-[11px] tracking-wider">
              Legend:
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <span className="font-bold font-mono">S</span> Strong (&ge; 70%)
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <span className="font-bold font-mono">D</span> Developing (40–69%)
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30">
              <span className="font-bold font-mono">W</span> Weak (&lt; 40%)
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
              <span className="font-bold font-mono">– (U)</span> Unassessed
            </span>
          </div>

          <p className="text-[11px] text-muted-foreground italic">
            Unassessed means no graded answers yet. It is not a low score.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
