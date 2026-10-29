import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, MessageSquareQuote } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CriterionItem {
  criterionId?: string;
  description: string;
  maxMarks: number;
  awarded: number;
  justification?: string;
  evidenceSpan?: string | null;
}

export interface CriterionRowProps {
  index: number;
  criterion: CriterionItem;
  isActive: boolean;
  onToggleEvidence: (index: number) => void;
}

export const CriterionRow: React.FC<CriterionRowProps> = ({
  index,
  criterion,
  isActive,
  onToggleEvidence,
}) => {
  const percentage =
    criterion.maxMarks > 0
      ? Math.min(100, Math.max(0, (criterion.awarded / criterion.maxMarks) * 100))
      : 0;

  const hasEvidence =
    criterion.evidenceSpan !== null &&
    criterion.evidenceSpan !== undefined &&
    criterion.evidenceSpan.trim().length > 0;

  return (
    <div
      className={cn(
        'p-3.5 rounded-lg border transition-colors space-y-2.5',
        isActive
          ? 'border-amber-500/50 bg-amber-950/20'
          : 'border-slate-800/80 bg-slate-900/40 hover:border-slate-700/80'
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        {/* Description & Index */}
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-slate-800 border border-slate-700 text-[11px] font-mono font-bold flex items-center justify-center text-slate-300 shrink-0">
              {index + 1}
            </span>
            <span className="text-xs md:text-sm font-medium text-slate-200">
              {criterion.description}
            </span>
          </div>
        </div>

        {/* Marks and Progress */}
        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-baseline gap-1 text-xs font-mono font-bold text-slate-200">
              <span>{criterion.awarded}</span>
              <span className="text-slate-400 font-normal">/ {criterion.maxMarks}</span>
            </div>
            <Progress
              value={percentage}
              className="h-1.5 w-20 bg-slate-800"
              indicatorClassName={
                percentage >= 80
                  ? 'bg-emerald-500'
                  : percentage >= 50
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }
            />
          </div>
        </div>
      </div>

      {/* Justification block */}
      {criterion.justification && (
        <div className="flex items-start gap-1.5 text-xs text-slate-300/90 pl-7">
          <MessageSquareQuote className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="leading-relaxed italic">{criterion.justification}</p>
        </div>
      )}

      {/* Evidence Button or Fallback */}
      <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-800/60 pl-7">
        {hasEvidence ? (
          <Button
            variant="ghost"
            size="sm"
            aria-pressed={isActive}
            onClick={() => onToggleEvidence(index)}
            className={cn(
              'h-7 px-2.5 text-xs font-medium gap-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-amber-400',
              isActive
                ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40 hover:bg-amber-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            )}
          >
            {isActive ? (
              <>
                <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Hide evidence</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Show evidence</span>
              </>
            )}
          </Button>
        ) : (
          <span className="text-xs text-slate-500 italic">
            No supporting text found in the answer
          </span>
        )}
      </div>
    </div>
  );
};

