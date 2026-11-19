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
  overrideNote?: string | null;
  reviewed?: boolean;
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
  reviewedBy?: string | null;
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
    <Card className="border border-slate-200/90 bg-white shadow-xs overflow-hidden">
      {/* 1. Header */}
      <CardHeader className="p-4 sm:p-5 border-b border-slate-200/90 space-y-3 bg-slate-50/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Big awarded / max */}
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 tracking-tight">
              {finalMarks} / {question.maxMarks}
            </span>
            <span className="text-xs text-slate-500 font-mono">marks</span>
          </div>

          {/* Badges / Confidence */}
          <div className="flex items-center gap-2 flex-wrap">
            <ConfidenceBadge level={level} value={confidenceValue} />

            {/* Overridden Badge */}
            {isOverridden && (
              <Badge
                variant="outline"
                className="gap-1 border-blue-200 bg-blue-50 text-blue-700 font-semibold text-xs py-0.5 px-2.5"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
                <span>Adjusted by teacher</span>
              </Badge>
            )}

            {/* Reviewed by teacher Badge */}
            {!isOverridden && (grade.reviewed || (isTeacher && teacherGrade?.reviewedBy)) && (
              <Badge
                variant="outline"
                className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold text-xs py-0.5 px-2.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                <span>Reviewed by your teacher</span>
              </Badge>
            )}

            {/* Teacher Needs Review Badge */}
            {needsReview && (
              <Badge
                variant="outline"
                className="gap-1 bg-rose-50 text-rose-700 border-rose-200 font-semibold text-xs py-0.5 px-2.5"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" aria-hidden="true" />
                <span>Needs review</span>
              </Badge>
            )}
          </div>
        </div>

        {/* Provisional Alert (Student variant only) */}
        {!isTeacher && isProvisional && (
          <Alert className="border-amber-200 bg-amber-50 text-amber-900 py-2.5 px-3">
            <Clock className="w-4 h-4 text-amber-600" aria-hidden="true" />
            <AlertTitle className="text-xs font-semibold text-amber-900">
              Provisional grade
            </AlertTitle>
            <AlertDescription className="text-xs text-amber-800/90 mt-0.5">
              Your teacher will review this answer and the marks may change.
            </AlertDescription>
          </Alert>
        )}

        {/* Overridden Explanatory text */}
        {isOverridden && (
          <div className="text-xs text-blue-900 font-medium bg-blue-50/80 border border-blue-200 p-2.5 rounded-md space-y-1">
            <div>AI suggested {autoMarks}, your teacher set {finalMarks}</div>
            {grade.overrideNote && (
              <div className="text-[11px] text-blue-700 italic">
                Teacher note: &ldquo;{grade.overrideNote}&rdquo;
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-5">
        {/* 2. Summary paragraph */}
        {grade.summary && (
          <div className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50/70 border border-slate-200 p-3.5 rounded-lg">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 mb-1">
              <Info className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
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
                <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  {isTeacher ? "Student's Answer" : 'Your Answer'}
                </span>
                {activeCriterion !== null && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveCriterion(null)}
                    className="h-6 text-[11px] text-slate-500 hover:text-slate-800 p-0 hover:bg-transparent"
                  >
                    Clear active highlight
                  </Button>
                )}
              </div>
              <div className="p-3.5 rounded-lg bg-slate-50/50 border border-slate-200 focus-within:border-blue-400">
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
                <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  Rubric Criteria Breakdown ({criteria.length})
                </span>
                {isOverridden && (
                  <span className="text-[11px] text-slate-500 italic">
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
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                <span>Nothing major missing</span>
              </div>
            ) : grade.missingPoints && grade.missingPoints.length > 0 ? (
              <div className="p-3.5 rounded-lg bg-amber-50/50 border border-amber-200 space-y-2">
                <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
                  <span>What was missing</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-xs text-slate-700 pl-1 leading-relaxed">
                  {grade.missingPoints.map((point, idx) => (
                    <li key={idx} className="marker:text-slate-400">
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
                className="border border-slate-200 rounded-lg bg-slate-50/50 overflow-hidden"
              >
                <CollapsibleTrigger className="w-full flex items-center justify-between p-3 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors text-left focus-visible:ring-2 focus-visible:ring-blue-400">
                  <span className="flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
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
                <CollapsibleContent className="p-3 border-t border-slate-200 text-xs space-y-2 text-slate-700">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-500 font-mono">Raw Confidence: </span>
                      <span className="font-semibold text-slate-900 font-mono">
                        {teacherGrade.confidence}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-mono">Model Version: </span>
                      <span className="font-semibold text-slate-900 font-mono">
                        {teacherGrade.modelVersion ?? 'N/A'}
                      </span>
                    </div>
                  </div>
                  {teacherGrade.notes && (
                    <div className="pt-1">
                      <span className="text-slate-500 font-mono">Internal Notes: </span>
                      <p className="italic text-slate-700 text-xs mt-0.5">
                        {teacherGrade.notes}
                      </p>
                    </div>
                  )}
                  <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200 leading-relaxed">
                    Note: The AI score is an objective suggestion based on rubric criteria. Instructors retain full authority to adjust marks.
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </>
        )}

        {/* 7. Actions slot at the bottom */}
        {actions && (
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            {actions}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
