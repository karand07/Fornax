import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Check, Info, Clock, HelpCircle } from 'lucide-react';
import { AssessmentQuestionResultItem } from '@/api/hooks';

export interface QuestionResultCardProps {
  index: number;
  question: AssessmentQuestionResultItem;
  renderGrade?: (q: AssessmentQuestionResultItem) => React.ReactNode;
}

export const QuestionResultCard: React.FC<QuestionResultCardProps> = ({
  index,
  question,
  renderGrade,
}) => {
  const isMCQ = question.type === 'MCQ';
  const isGraded = question.status === 'GRADED';
  const studentHasAnswered =
    question.studentAnswer !== null && question.studentAnswer !== undefined && question.studentAnswer !== '';

  const marksDisplay = isGraded
    ? `${question.marksObtained ?? 0} / ${question.maxMarks}`
    : `— / ${question.maxMarks}`;

  return (
    <Card className="border border-slate-800 bg-slate-900/60 shadow-sm transition-colors hover:border-slate-700/80">
      {/* Title Row */}
      <CardHeader className="pb-3 border-b border-slate-800/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-7 h-7 rounded-md bg-slate-800 border border-slate-700/80 text-xs font-mono font-bold flex items-center justify-center text-slate-200">
              {index + 1}
            </span>
            <span className="text-xs font-semibold text-slate-300">
              Question {index + 1}
            </span>
            <Badge variant="outline" className="border-slate-700 text-slate-300 text-xs">
              {question.conceptName || 'General'}
            </Badge>
            <Badge variant="secondary" className="text-[11px] font-mono">
              {question.type}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">Marks:</span>
            <Badge
              variant={
                !isGraded
                  ? 'secondary'
                  : (question.marksObtained ?? 0) === question.maxMarks
                  ? 'success'
                  : (question.marksObtained ?? 0) > 0
                  ? 'default'
                  : 'destructive'
              }
              className="text-xs font-mono font-bold px-2.5 py-0.5"
            >
              {marksDisplay}
            </Badge>
          </div>
        </div>

        <CardTitle className="text-sm md:text-base font-normal text-slate-100 mt-2.5 leading-relaxed font-sans">
          {question.prompt}
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* MCQ Questions View */}
        {isMCQ && (
          <div className="space-y-3">
            {/* Unanswered alert */}
            {!studentHasAnswered && (
              <div
                className="flex items-center gap-2 p-2.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 font-medium"
                role="status"
              >
                <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Not answered</span>
                <span className="sr-only">(Question was not answered)</span>
              </div>
            )}

            {/* Options List */}
            <div className="space-y-2">
              {question.options?.map((optionText, optIdx) => {
                const isStudentChoice = question.studentAnswer === optIdx;
                const isCorrectOption = question.correctIndex === optIdx;
                const studentWasWrong = studentHasAnswered && question.studentAnswer !== question.correctIndex;

                let cardClasses = 'border-slate-800 bg-slate-950/40 text-slate-300';
                let icon = null;
                let statusLabel: React.ReactNode = null;

                if (isStudentChoice && isCorrectOption) {
                  // Student choice and correct
                  cardClasses = 'border-emerald-500/60 bg-emerald-950/30 text-emerald-200 shadow-sm';
                  icon = <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />;
                  statusLabel = (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                      Correct
                      <span className="sr-only">(Your answer, correct)</span>
                    </span>
                  );
                } else if (isStudentChoice && !isCorrectOption) {
                  // Student choice and incorrect
                  cardClasses = 'border-rose-500/60 bg-rose-950/30 text-rose-200 shadow-sm';
                  icon = <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />;
                  statusLabel = (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded">
                      Incorrect
                      <span className="sr-only">(Your answer, incorrect)</span>
                    </span>
                  );
                } else if (isCorrectOption && studentWasWrong) {
                  // The correct option when student answered wrong
                  cardClasses = 'border-emerald-500/40 border-dashed bg-slate-900/60 text-slate-200';
                  icon = <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />;
                  statusLabel = (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400/90 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                      Correct answer
                      <span className="sr-only">(Correct option)</span>
                    </span>
                  );
                }

                return (
                  <div
                    key={optIdx}
                    className={`flex items-start justify-between gap-3 p-3 rounded-lg border text-sm transition-all ${cardClasses}`}
                  >
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700/80 text-[11px] font-mono font-semibold flex items-center justify-center shrink-0 mt-0.5 text-slate-300">
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span className="text-xs md:text-sm leading-relaxed break-words">
                        {optionText}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {statusLabel}
                      {icon}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Explanation Block (Why) */}
            {question.explanation && (
              <div className="mt-3 p-3.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs space-y-1.5">
                <div className="font-semibold text-indigo-400 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Why</span>
                </div>
                <p className="text-slate-300 leading-relaxed pl-5 font-sans">
                  {question.explanation}
                </p>
              </div>
            )}
          </div>
        )}

        {/* SHORT Questions View */}
        {!isMCQ && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-slate-400">
                Your Submitted Answer:
              </div>
              <blockquote className="border-l-2 border-indigo-500/60 bg-slate-950/60 p-3 rounded-r-md text-xs md:text-sm text-slate-200 font-mono whitespace-pre-wrap leading-relaxed">
                {typeof question.studentAnswer === 'string' && question.studentAnswer.trim().length > 0
                  ? `"${question.studentAnswer}"`
                  : 'No answer submitted'}
              </blockquote>
            </div>

            {question.status === 'PENDING' && (
              <div className="flex items-center gap-2 pt-1">
                <Badge
                  variant="secondary"
                  className="gap-1 border-amber-500/30 bg-amber-500/10 text-amber-400 font-medium px-2.5 py-0.5"
                >
                  <Clock className="w-3.5 h-3.5" />
                  Pending grading
                </Badge>
                <span className="text-xs text-slate-400">
                  Your response is waiting for grading. Marks will update once evaluated.
                </span>
              </div>
            )}

            {/* Slot for Day 9 GradeCard */}
            {renderGrade && (
              <div className="mt-3 pt-3 border-t border-slate-800">
                {renderGrade(question)}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
