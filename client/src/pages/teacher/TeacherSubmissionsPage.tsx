import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  useAssessmentSubmissions,
  useSubmissionDetail,
  useAssessment,
} from '@/api/hooks';
import { GradeCard } from '@/components/grading/GradeCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  AlertTriangle,
  SlidersHorizontal,
  Eye,
  RefreshCw,
  CheckCircle2,
  CheckSquare,
} from 'lucide-react';

export const TeacherSubmissionsPage: React.FC = () => {
  const params = useParams<{ id?: string; assessmentId?: string }>();
  const assessmentId = params.assessmentId || params.id || '';

  const { data: assessment } = useAssessment(assessmentId);
  const {
    data: submissions,
    isLoading,
    refetch,
  } = useAssessmentSubmissions(assessmentId);

  const [filter, setFilter] = useState<'ALL' | 'NEEDS_REVIEW'>('ALL');
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);

  const { data: submissionDetail, isLoading: isLoadingDetail } =
    useSubmissionDetail(selectedSubId);

  const filteredSubmissions = (submissions || []).filter((s) => {
    if (filter === 'NEEDS_REVIEW') return s.needsReview;
    return true;
  });

  const needsReviewCount = (submissions || []).filter((s) => s.needsReview).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link to={assessment?.courseId ? `/teacher/courses/${assessment.courseId}/assessments` : '/teacher'}>
              <Button variant="outline" size="sm" className="gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 font-medium shadow-2xs">
                <ArrowLeft className="w-4 h-4" /> Back to Assessments
              </Button>
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2 mt-2">
            <span>{assessment?.title || 'Assessment'} Submissions</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Instructor Grade Review: All short-form responses with AI criterion scoring and explainable evidence.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            variant={filter === 'ALL' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('ALL')}
            className="text-xs gap-1.5"
          >
            <span>All Submissions</span>
            <Badge variant="secondary" className="ml-1 text-[11px] px-1.5 py-0">
              {submissions?.length ?? 0}
            </Badge>
          </Button>

          <Button
            variant={filter === 'NEEDS_REVIEW' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('NEEDS_REVIEW')}
            className={`text-xs gap-1.5 ${
              filter === 'NEEDS_REVIEW'
                ? 'bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-xs'
                : 'text-amber-800 border-amber-300 bg-amber-50/60 hover:bg-amber-100 font-semibold'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Needs Review</span>
            {needsReviewCount > 0 && (
              <Badge className="ml-1 text-[11px] px-1.5 py-0 bg-amber-500 text-slate-950 font-bold">
                {needsReviewCount}
              </Badge>
            )}
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="text-xs gap-1.5 border-slate-800 text-slate-300 hover:text-white"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-xl bg-slate-200" />
          <Skeleton className="h-20 w-full rounded-xl bg-slate-200" />
          <Skeleton className="h-20 w-full rounded-xl bg-slate-200" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredSubmissions.length === 0 && (
        <Card className="border border-slate-200 bg-white p-12 text-center space-y-3 shadow-xs">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">
            {filter === 'NEEDS_REVIEW'
              ? 'No submissions pending review'
              : 'No short answer submissions yet'}
          </h3>
          <p className="text-xs text-slate-600 max-w-sm mx-auto">
            {filter === 'NEEDS_REVIEW'
              ? 'All AI evaluations have high confidence scores or have already been verified.'
              : 'When students submit responses to SHORT questions in this assessment, they will appear here.'}
          </p>
        </Card>
      )}

      {/* Submissions List */}
      {!isLoading && filteredSubmissions.length > 0 && (
        <div className="space-y-3">
          {filteredSubmissions.map((sub) => {
            const studentName = `${sub.student.firstName} ${sub.student.lastName}`;
            const marksDisplay =
              sub.marks !== null ? `${sub.marks} / ${sub.question.maxMarks}` : 'Ungraded';

            return (
              <div
                key={sub.id}
                className="p-4 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Student Info & Question snippet */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-900">
                      {studentName}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      ({sub.student.email})
                    </span>
                    {sub.needsReview && (
                      <Badge
                        variant="destructive"
                        className="gap-1 bg-rose-50 text-rose-700 border-rose-200 text-[11px] font-semibold py-0 px-2"
                      >
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        Needs review
                      </Badge>
                    )}
                    {sub.overridden && (
                      <Badge
                        variant="outline"
                        className="gap-1 border-blue-200 bg-blue-50 text-blue-700 text-[11px] font-semibold py-0 px-2"
                      >
                        <SlidersHorizontal className="w-3 h-3 text-blue-600" />
                        Adjusted
                      </Badge>
                    )}
                    {sub.question?.type && (
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono font-semibold py-0 px-1.5 ${
                          sub.question.type === 'HANDWRITTEN'
                            ? 'border-purple-200 bg-purple-50 text-purple-700'
                            : sub.question.type === 'SHORT'
                            ? 'border-blue-200 bg-blue-50 text-blue-700'
                            : 'border-slate-200 bg-slate-100 text-slate-700'
                        }`}
                      >
                        {sub.question.type}
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-slate-700 line-clamp-1">
                    <span className="text-slate-500 font-medium">Question: </span>
                    {sub.question?.prompt}
                  </p>

                  {sub.answerText ? (
                    <p className="text-xs text-slate-500 line-clamp-1 italic">
                      "{sub.answerText}"
                    </p>
                  ) : (sub as any).scanPath ? (
                    <p className="text-xs text-purple-700 line-clamp-1 italic font-medium">
                      Handwritten scan submitted
                    </p>
                  ) : null}
                </div>

                {/* Score & Action */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-mono font-bold text-slate-900">
                      {marksDisplay}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      {sub.confidence !== null
                        ? `${Math.round(sub.confidence * 100)}% conf`
                        : 'Manual'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedSubId(sub.id)}
                      className="gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View GradeCard</span>
                    </Button>

                    <Link to={`/teacher/review/${sub.id}`}>
                      <Button
                        size="sm"
                        variant="default"
                        className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>Full Review</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submission Detail Modal / Drawer */}
      <Dialog open={selectedSubId !== null} onOpenChange={(open) => !open && setSelectedSubId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white border border-slate-200 text-slate-900 p-6 shadow-xl">
          <DialogHeader className="pb-4 border-b border-slate-200">
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center justify-between gap-2">
              <span>Teacher Review: {submissionDetail?.student ? `${submissionDetail.student.firstName} ${submissionDetail.student.lastName}` : 'Submission'}</span>
            </DialogTitle>
          </DialogHeader>

          {isLoadingDetail && (
            <div className="py-12 space-y-4">
              <Skeleton className="h-32 w-full rounded-xl bg-slate-200" />
              <Skeleton className="h-48 w-full rounded-xl bg-slate-200" />
            </div>
          )}

          {!isLoadingDetail && submissionDetail && submissionDetail.grade && (
            <div className="space-y-4 pt-2">
              <GradeCard
                variant="teacher"
                question={{
                  prompt: submissionDetail.question?.prompt || 'Question',
                  maxMarks: submissionDetail.question?.maxMarks || 0,
                }}
                answer={submissionDetail.answerText || ''}
                grade={submissionDetail.grade}
                actions={
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedSubId(null)}
                      className="text-xs border-slate-700 text-slate-300"
                    >
                      Close
                    </Button>
                    <Link to={`/teacher/review/${submissionDetail.id}`}>
                      <Button
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>Open Full Review & Actions</span>
                      </Button>
                    </Link>
                  </div>
                }
              />
            </div>
          )}

          {!isLoadingDetail && submissionDetail && !submissionDetail.grade && (
            <div className="py-12 text-center text-sm text-slate-400 space-y-3">
              <p>This submission has not been evaluated yet.</p>
              <Link to={`/teacher/review/${submissionDetail.id}`}>
                <Button
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Evaluate / Review Submission</span>
                </Button>
              </Link>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
