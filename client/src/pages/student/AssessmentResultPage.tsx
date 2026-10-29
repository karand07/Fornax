import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMyAssessmentResult, useAssessment } from '@/api/hooks';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { QuestionResultCard } from '@/components/QuestionResultCard';
import { GradeCard } from '@/components/grading/GradeCard';
import { masteryBand, formatPercent } from '@/lib/mastery-ui';
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Minus,
  Clock,
  Award,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export const AssessmentResultPage: React.FC = () => {
  const params = useParams<{ id?: string; assessmentId?: string }>();
  const assessmentId = params.id || params.assessmentId || '';

  const {
    data: assessmentResult,
    isLoading,
    isError,
    error,
    refetch,
  } = useMyAssessmentResult(assessmentId);

  const { data: assessment } = useAssessment(assessmentId);

  // Loading Skeleton State
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in-50 duration-300">
        {/* Navigation Skeleton */}
        <div className="flex items-center gap-3 pb-2 border-b border-slate-800">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-6 w-48" />
        </div>

        {/* Header Card Skeleton */}
        <Card className="border border-slate-800 bg-slate-900/50 p-6">
          <div className="space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-10 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
        </Card>

        {/* Concepts Skeleton */}
        <Card className="border border-slate-800 bg-slate-900/50 p-6">
          <Skeleton className="h-6 w-48 mb-4" />
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </Card>

        {/* Questions Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  // Error State with Retry Button
  if (isError || !assessmentResult) {
    const errorMsg =
      (error as any)?.response?.data?.error ||
      'Unable to load your assessment results. You may not have submitted this assessment yet.';

    return (
      <div className="max-w-xl mx-auto p-6 space-y-6 animate-in fade-in-50">
        <Alert variant="destructive" className="border-rose-500/40 bg-rose-950/20">
          <AlertCircle className="w-5 h-5 text-rose-400" />
          <AlertTitle className="text-rose-200 font-semibold">
            Results Unavailable
          </AlertTitle>
          <AlertDescription className="text-rose-300/90 text-sm mt-1.5 leading-relaxed">
            {errorMsg}
          </AlertDescription>
        </Alert>

        <div className="flex items-center gap-3">
          <Button
            variant="default"
            onClick={() => refetch()}
            className="gap-2 bg-blue-600 hover:bg-blue-500 text-white"
          >
            <RefreshCw className="w-4 h-4" /> Retry
          </Button>

          <Link to="/student">
            <Button variant="outline" className="gap-2 border-slate-800 text-slate-300 hover:text-white">
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { summary, concepts, questions } = assessmentResult;
  const courseBackUrl = assessment?.courseId
    ? `/student?courseId=${assessment.courseId}`
    : '/student';

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link to={courseBackUrl}>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-slate-800 text-slate-300 hover:text-white bg-slate-900/40"
            >
              <ArrowLeft className="w-4 h-4" /> Back to course
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <span>{assessment?.title || 'Assessment Results'}</span>
            </h1>
            <p className="text-xs text-slate-400">
              Personal Evaluation & Mastery Progression
            </p>
          </div>
        </div>
      </div>

      {/* Header Card */}
      <Card className="border border-indigo-900/60 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 shadow-xl">
        <CardContent className="p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                  Performance Summary
                </span>
              </div>
              <div className="flex items-baseline gap-3">
                <h2 className="text-3xl font-extrabold text-slate-100 font-mono tracking-tight">
                  {summary.totalAwarded} / {summary.totalMax}
                </h2>
                <span className="text-xs text-slate-400">total marks</span>
              </div>
              <p className="text-xs text-slate-300">
                {summary.gradedCount} of {questions.length} questions graded.
              </p>
            </div>

            {/* Score Accuracies */}
            <div className="flex items-center gap-3">
              <div className="bg-slate-950/80 border border-slate-800 px-5 py-3 rounded-xl text-center min-w-[120px]">
                <div className="text-xs text-slate-400 font-medium">Graded Score</div>
                <div className="text-2xl font-mono font-bold text-indigo-400 mt-1">
                  {summary.percentage !== null ? formatPercent(summary.percentage) : 'N/A'}
                </div>
              </div>

              {summary.pendingCount > 0 && (
                <div className="bg-slate-950/80 border border-amber-900/40 px-5 py-3 rounded-xl text-center min-w-[120px]">
                  <div className="text-xs text-amber-400/90 font-medium">Pending</div>
                  <div className="text-2xl font-mono font-bold text-amber-400 mt-1">
                    {summary.pendingCount}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pending Alert banner if pendingCount > 0 */}
          {summary.pendingCount > 0 && (
            <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-300">
              <Clock className="w-4 h-4 text-amber-400" />
              <AlertTitle className="font-semibold text-xs text-amber-300">
                Awaiting Instructor Evaluation
              </AlertTitle>
              <AlertDescription className="text-xs text-amber-300/90 mt-0.5">
                {summary.pendingCount} {summary.pendingCount === 1 ? 'answer is' : 'answers are'} waiting for grading. Your total will update when they are graded.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Concept Breakdown Card */}
      {concepts.length > 0 && (
        <Card className="border border-slate-800 bg-slate-900/60 shadow-md">
          <CardHeader className="pb-3 border-b border-slate-800/60">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <CardTitle className="text-sm font-semibold text-slate-100">
                Concept Mastery Progression
              </CardTitle>
            </div>
            <p className="text-xs text-slate-400">
              How your performance on this assessment impacted your competency profile
            </p>
          </CardHeader>

          <CardContent className="pt-4 divide-y divide-slate-800/60">
            {concepts.map((c) => {
              const diff = Math.round((c.masteryAfter - c.masteryBefore) * 10000) / 10000;
              const isIncrease = diff > 0.0001;
              const isDecrease = diff < -0.0001;
              const bandInfo = masteryBand(c.masteryAfter);

              return (
                <div
                  key={c.conceptId}
                  className="py-3.5 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 pr-4">
                      <span className="text-sm font-medium text-slate-200 truncate">
                        {c.name}
                      </span>
                      <span className="text-xs font-mono font-semibold text-slate-400">
                        {c.awarded} / {c.max} marks
                      </span>
                    </div>

                    {/* Progress Bar for masteryAfter */}
                    <div className="flex items-center gap-3">
                      <Progress
                        value={c.masteryAfter * 100}
                        className="h-2 flex-1 bg-slate-800"
                        indicatorClassName={bandInfo.progressColor}
                      />
                      <span className="text-xs font-mono font-semibold text-slate-300 w-10 text-right">
                        {formatPercent(c.masteryAfter)}
                      </span>
                    </div>
                  </div>

                  {/* Delta Badge */}
                  <div className="shrink-0 flex items-center gap-2">
                    {isIncrease ? (
                      <Badge className="bg-emerald-950/60 text-emerald-400 border-emerald-500/40 gap-1 font-mono text-xs font-semibold py-1 px-2.5">
                        <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
                        <span>
                          {formatPercent(c.masteryBefore)} → {formatPercent(c.masteryAfter)}
                        </span>
                      </Badge>
                    ) : isDecrease ? (
                      <Badge className="bg-rose-950/60 text-rose-400 border-rose-500/40 gap-1 font-mono text-xs font-semibold py-1 px-2.5">
                        <ArrowDown className="w-3.5 h-3.5 text-rose-400" />
                        <span>
                          {formatPercent(c.masteryBefore)} → {formatPercent(c.masteryAfter)}
                        </span>
                      </Badge>
                    ) : (
                      <Badge className="bg-slate-800 text-slate-400 border-slate-700 gap-1 font-mono text-xs font-medium py-1 px-2.5">
                        <Minus className="w-3.5 h-3.5 text-slate-400" />
                        <span>no change ({formatPercent(c.masteryAfter)})</span>
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Per-Question List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">
            Question Breakdown ({questions.length} questions)
          </h3>
        </div>

        <div className="space-y-4">
          {questions.map((q, idx) => (
            <QuestionResultCard
              key={q.questionId}
              index={idx}
              question={q}
              renderGrade={(item) =>
                item.grade ? (
                  <GradeCard
                    variant="student"
                    question={{ prompt: item.prompt, maxMarks: item.maxMarks }}
                    answer={typeof item.studentAnswer === 'string' ? item.studentAnswer : ''}
                    grade={item.grade as any}
                  />
                ) : null
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
};
