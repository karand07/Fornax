import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ConfidenceLevel } from '@/lib/evidence';
import { CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ConfidenceBadgeProps {
  level: ConfidenceLevel;
  value?: number;
  className?: string;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  level,
  value,
  className,
}) => {
  const percentText =
    value !== undefined ? ` (${Math.round(value * 100)}%)` : '';

  switch (level) {
    case 'HIGH':
      return (
        <Badge
          variant="outline"
          className={cn(
            'gap-1.5 border-emerald-300 bg-emerald-50 text-emerald-800 font-semibold text-xs py-0.5 px-2.5',
            className
          )}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
          <span>High confidence{percentText}</span>
        </Badge>
      );
    case 'MEDIUM':
      return (
        <Badge
          variant="outline"
          className={cn(
            'gap-1.5 border-amber-300 bg-amber-50 text-amber-800 font-semibold text-xs py-0.5 px-2.5',
            className
          )}
        >
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" aria-hidden="true" />
          <span>Medium confidence{percentText}</span>
        </Badge>
      );
    case 'LOW':
    default:
      return (
        <Badge
          variant="outline"
          className={cn(
            'gap-1.5 border-rose-300 bg-rose-50 text-rose-800 font-semibold text-xs py-0.5 px-2.5',
            className
          )}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" aria-hidden="true" />
          <span>Low confidence{percentText}</span>
        </Badge>
      );
  }
};

