import { formatPercent, masteryBand } from '../../lib/mastery-ui';

export interface ConceptClassStat {
  conceptId: string;
  name: string;
  average: number | null;
  assessedCount: number;
  weakCount: number;
  strongCount: number;
  unassessedCount: number;
}

export interface ClassStatsRowProps {
  stats: ConceptClassStat[];
  classAvgMastery: number | null;
  classAvgAttendance: number | null;
  hoveredColumnIndex?: number | null;
}

export function ClassStatsRow({
  stats,
  classAvgMastery,
  classAvgAttendance,
  hoveredColumnIndex,
}: ClassStatsRowProps) {
  return (
    <tr className="bg-muted/60 font-semibold border-t-2 border-border text-xs">
      {/* Sticky first column: Row label */}
      <td className="sticky left-0 z-10 bg-muted/95 p-3 border border-border shadow-sm">
        <div className="font-bold text-foreground">Class Average</div>
        <div className="text-[10px] text-muted-foreground font-normal">Summary across all students</div>
      </td>

      {/* Class avg attendance */}
      <td className="p-2 text-center border border-border font-mono">
        <div>{classAvgAttendance !== null ? formatPercent(classAvgAttendance) : 'n/a'}</div>
        <div className="text-[10px] text-muted-foreground font-normal">Attendance</div>
      </td>

      {/* Class avg mastery */}
      <td className="p-2 text-center border border-border font-mono">
        <div>{classAvgMastery !== null ? formatPercent(classAvgMastery) : 'n/a'}</div>
        <div className="text-[10px] text-muted-foreground font-normal">Mastery</div>
      </td>

      {/* Risk column spacer / empty in footer */}
      <td className="p-2 text-center border border-border text-muted-foreground font-normal">
        —
      </td>

      {/* Concept average columns */}
      {stats.map((stat, idx) => {
        const isHovered = hoveredColumnIndex === idx;
        const hasData = stat.average !== null && stat.assessedCount > 0;
        const band = hasData ? masteryBand(stat.average!) : null;

        return (
          <td
            key={stat.conceptId}
            className={`p-2 text-center border border-border transition-colors ${
              band ? `${band.bgColor} ${band.textColor}` : 'bg-muted/30 text-muted-foreground'
            } ${isHovered ? 'brightness-125 ring-1 ring-primary/40' : ''}`}
          >
            <div className="font-mono text-xs">
              {hasData ? `${Math.round(stat.average! * 100)}%` : '–'}
            </div>
            <div className="text-[10px] text-muted-foreground font-normal mt-0.5">
              {stat.assessedCount} assessed
            </div>
          </td>
        );
      })}
    </tr>
  );
}
