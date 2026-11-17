import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon, HelpCircle } from 'lucide-react';
import { Badge } from '../ui/badge';
import type { RiskLevel, RiskFactor } from '../../api/hooks';

export interface RiskBadgeProps {
  level: RiskLevel;
  factors?: RiskFactor[];
  score?: number;
  usedWeights?: { attendance: number; mastery: number };
  variant?: 'student' | 'teacher';
  className?: string;
}

export const RISK_CONFIG: Record<
  RiskLevel,
  {
    label: string;
    studentLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    className: string;
    badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
  }
> = {
  OK: {
    label: 'On Track',
    studentLabel: 'On track',
    icon: ShieldCheck,
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    badgeVariant: 'outline',
  },
  WATCH: {
    label: 'Watch (Needs attention)',
    studentLabel: 'Needs a little attention',
    icon: AlertTriangle,
    className: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    badgeVariant: 'secondary',
  },
  AT_RISK: {
    label: 'At Risk (Urgent attention)',
    studentLabel: 'Needs attention soon',
    icon: AlertOctagon,
    className: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    badgeVariant: 'destructive',
  },
  INSUFFICIENT_DATA: {
    label: 'Insufficient Data',
    studentLabel: 'Not enough data yet',
    icon: HelpCircle,
    className: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
    badgeVariant: 'outline',
  },
};

export const FACTOR_LABELS: Record<RiskFactor, { student: string; teacher: string }> = {
  LOW_ATTENDANCE: {
    student: 'Attendance below 75%',
    teacher: 'Low Attendance (< 75%)',
  },
  LOW_MASTERY: {
    student: 'Mastery below 70%',
    teacher: 'Low Mastery (< 70%)',
  },
};

export function RiskBadge({
  level,
  factors = [],
  score,
  usedWeights,
  variant = 'student',
  className = '',
}: RiskBadgeProps) {
  const config = RISK_CONFIG[level] || RISK_CONFIG.INSUFFICIENT_DATA;
  const Icon = config.icon;

  const displayLabel = variant === 'teacher' ? config.label : config.studentLabel;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${config.className}`}
        >
          <Icon className="w-4 h-4" />
          <span>{displayLabel}</span>
        </span>

        {/* Teacher details: numeric score and formula */}
        {variant === 'teacher' && score !== undefined && (
          <span className="text-xs text-muted-foreground font-mono bg-muted/40 px-2 py-0.5 rounded border">
            Risk: {(score * 100).toFixed(1)}%
          </span>
        )}
      </div>

      {/* Factors */}
      {factors.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {factors.map((f) => {
            const factorMeta = FACTOR_LABELS[f];
            const text = variant === 'teacher' ? factorMeta?.teacher : factorMeta?.student;
            return (
              <Badge key={f} variant="outline" className="text-[11px] py-0 px-2 text-muted-foreground">
                {text || f}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Teacher-only breakdown & weights */}
      {variant === 'teacher' && usedWeights && (
        <div className="text-[11px] text-muted-foreground">
          Formula: {(usedWeights.attendance * 100).toFixed(0)}% attendance + {(usedWeights.mastery * 100).toFixed(0)}% mastery
        </div>
      )}
    </div>
  );
}
