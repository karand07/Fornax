import { masteryBand } from '../../lib/mastery-ui';
import type { AnalyticsCell } from '../../api/hooks';

export interface HeatmapCellProps {
  conceptName: string;
  cell: AnalyticsCell;
  onClick?: () => void;
  isHoveredColumn?: boolean;
  className?: string;
}

export function HeatmapCell({
  conceptName,
  cell,
  onClick,
  isHoveredColumn = false,
  className = '',
}: HeatmapCellProps) {
  const isUnassessed = cell.band === 'unassessed' || cell.score === null;

  if (isUnassessed) {
    return (
      <td
        className={`p-2 text-center border border-border/50 bg-muted/20 text-muted-foreground transition-colors cursor-pointer select-none ${
          isHoveredColumn ? 'brightness-125 ring-1 ring-primary/30' : ''
        } ${className}`}
        onClick={onClick}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
          }
        }}
      >
        <span className="sr-only">{conceptName}, unassessed</span>
        <div className="flex items-center justify-center gap-1 font-mono text-xs">
          <span>–</span>
          <span className="text-[10px] text-muted-foreground/60">(U)</span>
        </div>
      </td>
    );
  }

  const band = masteryBand(cell.score!);
  const scorePercent = Math.round(cell.score! * 100);

  // Band marker letter: W for weak, D for developing, S for strong
  const marker =
    cell.band === 'weak' ? 'W' : cell.band === 'developing' ? 'D' : 'S';

  return (
    <td
      className={`p-2 text-center border border-border/50 ${band.bgColor} ${band.textColor} transition-colors cursor-pointer select-none font-medium ${
        isHoveredColumn ? 'brightness-125 ring-1 ring-primary/40' : ''
      } ${className}`}
      onClick={onClick}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <span className="sr-only">
        {conceptName}, {scorePercent} percent, {band.label.toLowerCase()}
      </span>
      <div className="flex items-center justify-center gap-1 font-mono text-xs">
        <span>{scorePercent}%</span>
        <span className="text-[10px] opacity-75 font-semibold">({marker})</span>
      </div>
    </td>
  );
}
