import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ConfidenceBadge } from './ConfidenceBadge';
import { EvidenceText } from './EvidenceText';
import { CriterionRow, CriterionItem } from './CriterionRow';
import { confidenceLevel as computeConfidenceLevel } from '@/lib/evidence';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  Info,
  SlidersHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CriterionView extends CriterionItem {}

export interface BaseGradeView {
  criteria?: CriterionView[];
  missingPoints?: string[];
  summary?: string | null;
  confidenceLevel?: 'HIGH' | 'MEDIUM' | 'LOW';
  provisional?: boolean;
  overridden?: boolean;
  autoMarks?: number;
  finalMarks?: number;
  totalMarks?: number;
}

export interface StudentGradeView extends BaseGradeView {
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface TeacherGradeView extends BaseGradeView {
  confidence: number;
  confidenceLevel?: 'HIGH' | 'MEDIUM' | 'LOW';
  modelVersion?: string | null;
  needsReview?: boolean;
  overriddenBy?: string | null;
  notes?: string | null;
}

export interface GradeCardProps {
  variant: 'student' | 'teacher';
  question: { prompt: string; maxMarks: number };
  answer: string;
  grade: StudentGradeView | TeacherGradeView;
  actions?: React.ReactNode;
}

export const GradeCard: React.FC<GradeCardProps> = ({
  variant,
  question,
  answer,
  grade,
  actions,
}) => {
  const [activeCriterion, setActiveCriterion] = useState<number | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const isTeacher = variant === 'teacher';
  const teacherGrade = isTeacher ? (grade as TeacherGradeView) : null;

  // Marks calculation
  const autoMarks = grade.autoMarks ?? grade.totalMarks ?? 0;
  const finalMarks = grade.finalMarks ?? autoMarks;
  const isFullMarks = finalMarks === question.maxMarks;

  // Confidence
  const level =
    grade.confidenceLevel ??
    (teacherGrade ? computeConfidenceLevel(teacherGrade.confidence) : 'HIGH');
  const confidenceValue = teacherGrade ? teacherGrade.confidence : undefined;

  // Status flags
  const isOverridden = Boolean(grade.overridden);
  const isProvisional = Boolean(grade.provisional);
  const needsReview = isTeacher && Boolean(teacherGrade?.needsReview);

  // Spans for evidence text
  const criteria = grade.criteria ?? [];
  const spans = criteria.map((c) => c.evidenceSpan ?? null);

  // Blank answer or zero criteria condition
  const isBlankOrZeroCriteria =
    !answer || answer.trim().length === 0 || criteria.length === 0;

  const handleToggleEvidence = (idx: number) => {
    setActiveCriterion((prev) => (prev === idx ? null : idx));
  };

  return (
    <Card className="border border-slate-800 bg-slate-900/60 shadow-md overflow-hidden">
      {/* 1. Header */}
      <CardHeader className="p-4 sm:p-5 border-b border-slate-800/80 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Big awarded / max */}
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-100 tracking-tight">
              {finalMarks} / {question.maxMarks}
            </span>
            <span className="text-xs text-slate-400 font-mono">marks</span>
          </div>

          {/* Badges / Confidence */}
          <div className="flex items-center gap-2 flex-wrap">
            <ConfidenceBadge level={level} value={confidenceValue} />

            {/* Overridden Badge */}
            {isOverridden && (
              <Badge
                variant="outline"
                className="gap-1 border-blue-500/40 bg-blue-950/40 text-blue-300 font-medium text-xs py-0.5 px-2.5"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
                <span>Adjusted by teacher</span>
              </Badge>
            )}

            {/* Teacher Needs Review Badge */}
            {needsReview && (
              <Badge
                variant="destructive"
                className="gap-1 bg-rose-950/70 text-rose-300 border-rose-500/40 font-medium text-xs py-0.5 px-2.5"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" aria-hidden="true" />
                <span>Needs review</span>
              </Badge>
            )}
          </div>
        </div>

        {/* Provisional Alert (Student variant only) */}
        {!isTeacher && isProvisional && (
          <Alert className="border-amber-500/40 bg-amber-950/30 text-amber-200 py-2.5 px-3">
            <Clock className="w-4 h-4 text-amber-400" aria-hidden="true" />
            <AlertTitle className="text-xs font-semibold text-amber-200">
              Provisional grade
            </AlertTitle>
            <AlertDescription className="text-xs text-amber-300/90 mt-0.5">
              Your teacher will review this answer and the marks may change.
            </AlertDescription>
          </Alert>
        )}

        {/* Overridden Explanatory text */}
        {isOverridden && (
          <div className="text-xs text-blue-300/90 font-medium bg-blue-950/20 border border-blue-500/20 p-2 rounded-md">
            AI suggested {autoMarks}, your teacher set {finalMarks}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-5">
        {/* 2. Summary paragraph */}
        {grade.summary && (
          <div className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950/40 border border-slate-800/80 p-3.5 rounded-lg">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 mb-1">
              <Info className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Feedback Summary</span>
            </div>
            <p>{grade.summary}</p>
          </div>
        )}

        {/* If blank answer or zero criteria: show only header and summary, omit the rest */}
        {!isBlankOrZeroCriteria && (
          <>
            {/* 3. "Your answer" block using EvidenceText */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  {isTeacher ? "Student's Answer" : 'Your Answer'}
                </span>
                {activeCriterion !== null && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveCriterion(null)}
                    className="h-6 text-[11px] text-slate-400 hover:text-slate-200 p-0 hover:bg-transparent"
                  >
                    Clear active highlight
                  </Button>
                )}
              </div>
              <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 focus-within:border-slate-700">
                <EvidenceText
                  answer={answer}
                  spans={spans}
                  activeIndex={activeCriterion}
                />
              </div>
            </div>

            {/* 4. Criteria list using CriterionRow */}
            <div className="space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Rubric Criteria Breakdown ({criteria.length})
                </span>
                {isOverridden && (
                  <span className="text-[11px] text-slate-400 italic">
                    Criterion marks show the original AI breakdown.
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {criteria.map((c, idx) => (
                  <CriterionRow
                    key={c.criterionId ?? idx}
                    index={idx}
                    criterion={c}
                    isActive={activeCriterion === idx}
                    onToggleEvidence={handleToggleEvidence}
                  />
                ))}
              </div>
            </div>

            {/* 5. "What was missing" list from missingPoints */}
            {isFullMarks ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-xs text-emerald-300 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                <span>Nothing major missing</span>
              </div>
            ) : grade.missingPoints && grade.missingPoints.length > 0 ? (
              <div className="p-3.5 rounded-lg bg-slate-950/50 border border-slate-800 space-y-2">
                <div className="text-xs font-semibold text-amber-400/90 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                  <span>What was missing</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-xs text-slate-300 pl-1 leading-relaxed">
                  {grade.missingPoints.map((point, idx) => (
                    <li key={idx} className="marker:text-slate-500">
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* 6. Teacher variant only: Collapsed "Grader details" section */}
            {isTeacher && teacherGrade && (
              <Collapsible
                open={isDetailsOpen}
                onOpenChange={setIsDetailsOpen}
                className="border border-slate-800/80 rounded-lg bg-slate-950/40 overflow-hidden"
              >
                <CollapsibleTrigger className="w-full flex items-center justify-between p-3 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 transition-colors text-left focus-visible:ring-2 focus-visible:ring-indigo-400">
                  <span className="flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                    <span>Grader details</span>
                  </span>
                  <ChevronDown
                    className={cn(
                      'w-3.5 h-3.5 transition-transform duration-200',
                      isDetailsOpen && 'transform rotate-180'
                    )}
                    aria-hidden="true"
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="p-3 border-t border-slate-800/80 text-xs space-y-2 text-slate-300">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 font-mono">Raw Confidence: </span>
                      <span className="font-semibold text-slate-200 font-mono">
                        {teacherGrade.confidence}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-mono">Model Version: </span>
                      <span className="font-semibold text-slate-200 font-mono">
                        {teacherGrade.modelVersion ?? 'N/A'}
                      </span>
                    </div>
                  </div>
                  {teacherGrade.notes && (
                    <div className="pt-1">
                      <span className="text-slate-400 font-mono">Internal Notes: </span>
                      <p className="italic text-slate-300 text-xs mt-0.5">
                        {teacherGrade.notes}
                      </p>
                    </div>
                  )}
                  <div className="text-[11px] text-slate-400/90 pt-1 border-t border-slate-800/60 leading-relaxed">
                    Note: The AI score is an objective suggestion based on rubric criteria. Instructors retain full authority to adjust marks.
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </>
        )}

        {/* 7. Actions slot at the bottom */}
        {actions && (
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-end gap-2">
            {actions}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
