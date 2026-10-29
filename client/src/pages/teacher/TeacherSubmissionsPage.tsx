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
} from 'lucide-react';

export const TeacherSubmissionsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const assessmentId = id || '';

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
              <Button variant="outline" size="sm" className="gap-1.5 border-slate-800 text-slate-300">
                <ArrowLeft className="w-4 h-4" /> Back to Assessments
              </Button>
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2 mt-2">
            <span>{assessment?.title || 'Assessment'} Submissions</span>
          </h1>
          <p className="text-xs text-slate-400">
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
                ? 'bg-amber-600 hover:bg-amber-500'
                : 'text-amber-300 border-amber-900/40 hover:bg-amber-950/20'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
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
          <Skeleton className="h-20 w-full rounded-xl bg-slate-900" />
          <Skeleton className="h-20 w-full rounded-xl bg-slate-900" />
          <Skeleton className="h-20 w-full rounded-xl bg-slate-900" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredSubmissions.length === 0 && (
        <Card className="border border-slate-800 bg-slate-900/40 p-12 text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
          <h3 className="text-base font-semibold text-slate-200">
            {filter === 'NEEDS_REVIEW'
              ? 'No submissions pending review'
              : 'No short answer submissions yet'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
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
                className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-slate-700/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Student Info & Question snippet */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-slate-100">
                      {studentName}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      ({sub.student.email})
                    </span>
                    {sub.needsReview && (
                      <Badge
                        variant="destructive"
                        className="gap-1 bg-rose-950/60 text-rose-300 border-rose-500/40 text-[11px] py-0 px-2"
                      >
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        Needs review
                      </Badge>
                    )}
                    {sub.overridden && (
                      <Badge
                        variant="outline"
                        className="gap-1 border-blue-500/40 bg-blue-950/40 text-blue-300 text-[11px] py-0 px-2"
                      >
                        <SlidersHorizontal className="w-3 h-3 text-blue-400" />
                        Adjusted
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-1">
                    <span className="text-slate-400 font-medium">Question: </span>
                    {sub.question.prompt}
                  </p>

                  {sub.answerText && (
                    <p className="text-xs text-slate-400 line-clamp-1 italic">
                      "{sub.answerText}"
                    </p>
                  )}
                </div>

                {/* Score & Action */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-mono font-bold text-slate-200">
                      {marksDisplay}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {sub.confidence !== null
                        ? `${Math.round(sub.confidence * 100)}% conf`
                        : 'Manual'}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedSubId(sub.id)}
                    className="gap-1.5 border-slate-700 text-slate-300 hover:text-white text-xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View GradeCard</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submission Detail Modal / Drawer */}
      <Dialog open={selectedSubId !== null} onOpenChange={(open) => !open && setSelectedSubId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-950 border border-slate-800 text-slate-100 p-6">
          <DialogHeader className="pb-4 border-b border-slate-800">
            <DialogTitle className="text-lg font-bold text-slate-100 flex items-center justify-between gap-2">
              <span>Teacher Review: {submissionDetail?.student ? `${submissionDetail.student.firstName} ${submissionDetail.student.lastName}` : 'Submission'}</span>
            </DialogTitle>
          </DialogHeader>

          {isLoadingDetail && (
            <div className="py-12 space-y-4">
              <Skeleton className="h-32 w-full rounded-xl bg-slate-900" />
              <Skeleton className="h-48 w-full rounded-xl bg-slate-900" />
            </div>
          )}

          {!isLoadingDetail && submissionDetail && submissionDetail.grade && (
            <div className="space-y-4 pt-2">
              <GradeCard
                variant="teacher"
                question={submissionDetail.question}
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
                  </div>
                }
              />
            </div>
          )}

          {!isLoadingDetail && submissionDetail && !submissionDetail.grade && (
            <div className="py-12 text-center text-sm text-slate-400">
              This submission has not been evaluated yet.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
