import React from 'react';
import { buildSegments } from '@/lib/evidence';
import { cn } from '@/lib/utils';

export interface EvidenceTextProps {
  answer: string;
  spans: (string | null)[];
  activeIndex?: number | null;
  className?: string;
}

export const EvidenceText: React.FC<EvidenceTextProps> = ({
  answer,
  spans,
  activeIndex,
  className,
}) => {
  if (!answer || answer.trim().length === 0) {
    return <span className="text-slate-500 italic">No answer provided.</span>;
  }

  const segments = buildSegments(answer, spans);

  return (
    <div
      className={cn(
        'text-xs md:text-sm leading-relaxed whitespace-pre-wrap font-sans text-slate-200',
        className
      )}
    >
      {segments.map((seg, idx) => {
        if (!seg.highlight) {
          return <React.Fragment key={idx}>{seg.text}</React.Fragment>;
        }

        const hasActiveIndex = activeIndex !== undefined && activeIndex !== null;
        const matchesActive = hasActiveIndex && seg.criterionIndexes.includes(activeIndex);

        // Highlight classes
        let markClasses =
          'bg-indigo-500/20 text-indigo-100 border-b-2 border-indigo-400 font-medium px-0.5 rounded-sm transition-colors';

        if (hasActiveIndex) {
          if (matchesActive) {
            // Strong style for active matching criterion
            markClasses =
              'bg-amber-400/30 text-amber-100 border-b-2 border-amber-400 font-medium px-0.5 rounded-sm shadow-sm transition-colors';
          } else {
            // Faint style for other highlighted segments
            markClasses =
              'bg-slate-800/60 text-slate-400 border-b border-slate-700 font-normal px-0.5 rounded-sm transition-colors';
          }
        }

        const criterionLabel = seg.criterionIndexes.map((i) => i + 1).join(', ');

        return (
          <mark key={idx} className={markClasses}>
            <span className="sr-only">Evidence for criterion {criterionLabel}: </span>
            {seg.text}
          </mark>
        );
      })}
    </div>
  );
};

