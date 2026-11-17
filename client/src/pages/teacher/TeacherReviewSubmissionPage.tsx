import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  useSubmissionDetail,
  useUpdateOcr,
  useRegradeSubmission,
  useApproveGrade,
  useOverrideGrade,
  useAuditLogs,
} from '@/api/hooks';
import { ScanViewer } from '@/components/grading/ScanViewer';
import { GradeCard } from '@/components/grading/GradeCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Edit3,
  RotateCcw,
  SlidersHorizontal,
  History,
  FileText,
  AlertCircle,
  HelpCircle,
  Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const TeacherReviewSubmissionPage: React.FC = () => {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();

  const {
    data: submission,
    isLoading,
    error: loadError,
  } = useSubmissionDetail(submissionId || null);

  const { data: auditLogs } = useAuditLogs('Submission', submissionId || '');

  const updateOcrMutation = useUpdateOcr();
  const regradeMutation = useRegradeSubmission();
  const approveMutation = useApproveGrade();
  const overrideMutation = useOverrideGrade();

  // Local OCR editor state
  const [ocrText, setOcrText] = useState<string>('');
  const [isRubricOpen, setIsRubricOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showOriginalModal, setShowOriginalModal] = useState(false);
  const [showRegradeForceModal, setShowRegradeForceModal] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);

  // Override dialog state
  const [overrideMarks, setOverrideMarks] = useState<string>('');
  const [overrideNote, setOverrideNote] = useState<string>('');
  const [overrideError, setOverrideError] = useState<string | null>(null);

  // Notification / Toast state
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Sync initial OCR text
  useEffect(() => {
    if (submission) {
      setOcrText(submission.answerText || '');
    }
  }, [submission?.id, submission?.answerText]);

  // Dirty check for OCR textarea
  const isDirty = useMemo(() => {
    if (!submission) return false;
    return ocrText !== (submission.answerText || '');
  }, [ocrText, submission?.answerText]);

  // Warn on leaving the page with unsaved OCR changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Clear notification after 4 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-32 bg-slate-800" />
          <Skeleton className="h-9 w-48 bg-slate-800" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[600px] bg-slate-800 rounded-lg" />
          <Skeleton className="h-[600px] bg-slate-800 rounded-lg" />
        </div>
      </div>
    );
  }

  if (loadError || !submission) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
        <h2 className="text-xl font-bold text-slate-100">Unable to load submission</h2>
        <p className="text-sm text-slate-400">
          {(loadError as any)?.response?.data?.error ||
            'Submission not found or you do not have permission to review it.'}
        </p>
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="border-slate-800 text-slate-300"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Go back
        </Button>
      </div>
    );
  }

  const { question, student, queue, grade, gradeStale, scanAvailable } = submission;
  const isHandwritten = question.type === 'HANDWRITTEN';

  const navigateToQueueOrNext = (nextSubId?: string | null) => {
    if (nextSubId) {
      navigate(`/teacher/review/${nextSubId}`);
    } else {
      navigate(`/teacher/courses/${submission.assessmentId ? 'all' : 'all'}/review`);
    }
  };

  const handleSaveOcr = async () => {
    try {
      await updateOcrMutation.mutateAsync({
        submissionId: submission.id,
        text: ocrText,
      });
      setNotification({
        type: 'success',
        message: 'Transcript saved successfully.',
      });
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to update transcript';
      setNotification({ type: 'error', message: msg });
    }
  };

  const handleResetOcr = () => {
    setOcrText(submission.answerText || '');
  };

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync(submission.id);
      setNotification({
        type: 'success',
        message: 'Grade approved. Moving to next item...',
      });
      setTimeout(() => {
        navigateToQueueOrNext(queue?.nextId);
      }, 700);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to approve grade';
      setNotification({ type: 'error', message: msg });
    }
  };

  const handleRegrade = async (force: boolean = false) => {
    setShowRegradeForceModal(false);
    try {
      await regradeMutation.mutateAsync({
        submissionId: submission.id,
        force,
      });
      setNotification({
        type: 'success',
        message: 'Submission re-graded successfully.',
      });
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to re-grade';
      setNotification({ type: 'error', message: msg });
    }
  };

  const handleOpenOverride = () => {
    const currentVal =
      grade?.finalMarks !== undefined && grade?.finalMarks !== null
        ? String(grade.finalMarks)
        : grade?.totalMarks !== undefined && grade?.totalMarks !== null
        ? String(grade.totalMarks)
        : '';
    setOverrideMarks(currentVal);
    setOverrideNote(grade?.overrideNote || '');
    setOverrideError(null);
    setShowOverrideModal(true);
  };

  const handleConfirmOverride = async () => {
    const parsed = parseFloat(overrideMarks);
    if (isNaN(parsed) || parsed < 0 || parsed > question.maxMarks) {
      setOverrideError(`Marks must be between 0 and ${question.maxMarks}`);
      return;
    }
    if (Math.round(parsed * 100) % 25 !== 0) {
      setOverrideError('Marks must be in steps of 0.25 (e.g. 0, 0.25, 0.5, 0.75)');
      return;
    }
    const noteTrimmed = overrideNote.trim();
    if (noteTrimmed.length < 5 || noteTrimmed.length > 500) {
      setOverrideError('Note must be between 5 and 500 characters');
      return;
    }

    try {
      await overrideMutation.mutateAsync({
        submissionId: submission.id,
        finalMarks: parsed,
        note: noteTrimmed,
      });
      setShowOverrideModal(false);
      setNotification({
        type: 'success',
        message: 'Marks overridden successfully. Moving to next item...',
      });
      setTimeout(() => {
        navigateToQueueOrNext(queue?.nextId);
      }, 700);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to override marks';
      setOverrideError(msg);
    }
  };

  const isOverrideValid = useMemo(() => {
    const parsed = parseFloat(overrideMarks);
    if (isNaN(parsed) || parsed < 0 || parsed > question.maxMarks) return false;
    if (Math.round(parsed * 100) % 25 !== 0) return false;
    const noteTrimmed = overrideNote.trim();
    return noteTrimmed.length >= 5 && noteTrimmed.length <= 500;
  }, [overrideMarks, overrideNote, question.maxMarks]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Toast Notification Banner */}
      {notification && (
        <div
          className={cn(
            'fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-xl text-xs font-medium border animate-in slide-in-from-top duration-200',
            notification.type === 'success'
              ? 'bg-emerald-950 text-emerald-200 border-emerald-700/60'
              : 'bg-red-950 text-red-200 border-red-700/60'
          )}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Top Navigation & Queue Position */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-1.5 border-slate-800 text-slate-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Queue
          </Button>
          <div className="h-4 w-[1px] bg-slate-800 mx-1 hidden sm:block" />
          {queue && (
            <span className="text-xs text-slate-400 font-mono">
              Item {queue.current} of {queue.total} pending
            </span>
          )}
        </div>

        {/* Prev / Next queue buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!queue?.prevId}
            onClick={() => queue?.prevId && navigate(`/teacher/review/${queue.prevId}`)}
            className="gap-1 text-xs border-slate-800 text-slate-300 hover:text-white"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!queue?.nextId}
            onClick={() => queue?.nextId && navigate(`/teacher/review/${queue.nextId}`)}
            className="gap-1 text-xs border-slate-800 text-slate-300 hover:text-white"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Main Review Layout */}
      <div
        className={cn(
          'grid gap-6',
          scanAvailable
            ? 'grid-cols-1 lg:grid-cols-2 items-start'
            : 'grid-cols-1 max-w-4xl mx-auto'
        )}
      >
        {/* Left Column: Scan Viewer (sticky on desktop) */}
        {scanAvailable && (
          <div className="lg:sticky lg:top-6 h-[500px] lg:h-[calc(100vh-140px)] w-full">
            <ScanViewer submissionId={submission.id} />
          </div>
        )}

        {/* Right Column: Submission Details, Editor, GradeCard & Actions */}
        <div className="space-y-6">
          {/* 1. Header Information */}
          <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader className="p-4 sm:p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    {submission.courseId ? (
                      <Link
                        to={`/teacher/courses/${submission.courseId}/students/${student.id}`}
                        className="hover:underline hover:text-indigo-400 transition-colors"
                        title="View student academic profile"
                      >
                        {student.firstName} {student.lastName}
                      </Link>
                    ) : (
                      <span>
                        {student.firstName} {student.lastName}
                      </span>
                    )}
                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono border-slate-700 text-slate-300"
                    >
                      {question.type}
                    </Badge>
                  </h2>
                  <p className="text-xs text-slate-400 font-mono">{student.email}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Maximum Marks</span>
                  <span className="text-sm font-bold font-mono text-slate-200">
                    {question.maxMarks} pts
                  </span>
                </div>
              </div>

              {/* Question Prompt */}
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-200 leading-relaxed">
                <span className="font-semibold text-slate-400 font-mono mr-1">Prompt:</span>
                {question.prompt}
              </div>

              {/* Collapsible Model Answer & Rubric */}
              {(question.modelAnswer || (question.rubrics && question.rubrics.length > 0)) && (
                <Collapsible
                  open={isRubricOpen}
                  onOpenChange={setIsRubricOpen}
                  className="border border-slate-800 rounded-lg bg-slate-950/40 overflow-hidden"
                >
                  <CollapsibleTrigger className="w-full flex items-center justify-between p-2.5 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 transition-colors">
                    <span className="flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Model answer and rubric criteria</span>
                    </span>
                    <ChevronDown
                      className={cn(
                        'w-3.5 h-3.5 transition-transform duration-200',
                        isRubricOpen && 'transform rotate-180'
                      )}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="p-3 border-t border-slate-800 space-y-3 text-xs">
                    {question.modelAnswer && (
                      <div>
                        <span className="text-slate-400 font-mono block mb-1">
                          Model Answer:
                        </span>
                        <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800/80 text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {question.modelAnswer}
                        </div>
                      </div>
                    )}
                    {question.rubrics && question.rubrics.length > 0 && (
                      <div>
                        <span className="text-slate-400 font-mono block mb-1">
                          Rubric Criteria:
                        </span>
                        <div className="space-y-1.5">
                          {question.rubrics.map((r, i) => (
                            <div
                              key={r.id || i}
                              className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800/80 text-xs"
                            >
                              <span className="text-slate-300">{r.description}</span>
                              <Badge
                                variant="outline"
                                className="font-mono text-[10px] ml-2"
                              >
                                {r.marks} pts
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </CardHeader>
          </Card>

          {/* 2. OCR Editor (for Handwritten or any submission with text) */}
          <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-400" />
                <CardTitle className="text-sm font-semibold text-slate-200">
                  {isHandwritten ? 'OCR Transcript' : 'Student Response'}
                </CardTitle>
                {submission.ocrEdited && (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-indigo-950/40 text-indigo-300 border-indigo-800/60"
                  >
                    Transcript edited
                  </Badge>
                )}
              </div>
              {submission.ocrOriginal && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowOriginalModal(true)}
                  className="h-7 text-xs text-slate-400 hover:text-slate-200"
                >
                  <FileText className="w-3.5 h-3.5 mr-1" />
                  View Original OCR
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <Textarea
                value={ocrText}
                onChange={(e) => setOcrText(e.target.value)}
                placeholder="Transcribed student answer..."
                className="min-h-[120px] font-mono text-xs bg-slate-950/70 border-slate-800 text-slate-200 focus-visible:ring-indigo-500 leading-relaxed resize-y"
              />

              {/* Dirty actions bar */}
              {isDirty && (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-950/20 border border-amber-900/50">
                  <span className="text-xs text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    Unsaved transcript changes
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleResetOcr}
                      disabled={updateOcrMutation.isPending}
                      className="h-7 text-xs text-slate-400 hover:text-white"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Reset
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveOcr}
                      disabled={updateOcrMutation.isPending}
                      className="h-7 text-xs bg-indigo-600 hover:bg-indigo-500 text-white"
                    >
                      {updateOcrMutation.isPending ? 'Saving...' : 'Save Transcript'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3. Stale Grade Alert */}
          {gradeStale && (
            <Alert className="border-amber-500/50 bg-amber-950/20 text-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <AlertTitle className="text-xs font-semibold text-amber-300">
                Grade is stale
              </AlertTitle>
              <AlertDescription className="text-xs text-amber-200/90 mt-0.5">
                The transcript was edited after this grade was generated. Re-grade to update the marks.
              </AlertDescription>
            </Alert>
          )}

          {/* 4. GradeCard or Empty State */}
          {grade ? (
            <GradeCard
              variant="teacher"
              question={{
                prompt: question.prompt,
                maxMarks: question.maxMarks,
              }}
              answer={submission.answerText || ''}
              grade={grade}
              actions={
                <div className="flex flex-wrap items-center gap-2 w-full justify-between sm:justify-end">
                  {/* Re-grade button */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isDirty || regradeMutation.isPending}
                    onClick={() => {
                      if (grade.overridden) {
                        setShowRegradeForceModal(true);
                      } else {
                        handleRegrade(false);
                      }
                    }}
                    title={
                      isDirty
                        ? 'Save or reset transcript changes before re-grading'
                        : 'Re-evaluate with AI'
                    }
                    className="border-slate-800 text-slate-300 hover:text-white text-xs gap-1.5"
                  >
                    <RefreshCw
                      className={cn(
                        'w-3.5 h-3.5',
                        regradeMutation.isPending && 'animate-spin'
                      )}
                    />
                    Re-grade
                  </Button>

                  {/* Override marks button */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleOpenOverride}
                    className="border-slate-800 text-slate-300 hover:text-white text-xs gap-1.5"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Override marks...
                  </Button>

                  {/* Approve button */}
                  <Button
                    type="button"
                    size="sm"
                    disabled={gradeStale || isDirty || approveMutation.isPending}
                    onClick={handleApprove}
                    title={
                      gradeStale
                        ? 'Re-grade first before approving stale transcript'
                        : isDirty
                        ? 'Save or reset transcript changes before approving'
                        : 'Approve AI evaluation'
                    }
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5 shadow-sm shadow-emerald-600/30"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Approve
                  </Button>
                </div>
              }
            />
          ) : (
            <Card className="bg-slate-900/60 border-slate-800 text-center p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-200">
                  No Automated Grade Available
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  This submission could not be evaluated automatically (e.g. scan was unreadable or evaluation failed). You can provide the transcribed text and re-grade, or manually override the marks.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isDirty || !ocrText.trim() || regradeMutation.isPending}
                  onClick={() => handleRegrade(false)}
                  className="border-slate-800 text-slate-300 hover:text-white text-xs gap-1.5"
                >
                  <RefreshCw
                    className={cn(
                      'w-3.5 h-3.5',
                      regradeMutation.isPending && 'animate-spin'
                    )}
                  />
                  Re-grade
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleOpenOverride}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Override marks...
                </Button>
              </div>
            </Card>
          )}

          {/* 5. Audit History Panel */}
          <Collapsible
            open={isHistoryOpen}
            onOpenChange={setIsHistoryOpen}
            className="border border-slate-800 rounded-lg bg-slate-900/50 overflow-hidden"
          >
            <CollapsibleTrigger className="w-full flex items-center justify-between p-3 text-xs font-semibold text-slate-300 hover:text-slate-100 hover:bg-slate-800/40 transition-colors">
              <span className="flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" />
                <span>Audit History</span>
                {auditLogs && auditLogs.length > 0 && (
                  <Badge variant="outline" className="text-[10px] font-mono ml-1">
                    {auditLogs.length}
                  </Badge>
                )}
              </span>
              <ChevronDown
                className={cn(
                  'w-3.5 h-3.5 transition-transform duration-200',
                  isHistoryOpen && 'transform rotate-180'
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="p-4 border-t border-slate-800 space-y-3">
              {!auditLogs || auditLogs.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No audit records found.</p>
              ) : (
                <div className="space-y-2.5">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded bg-slate-950/60 border border-slate-800/80 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="font-semibold text-indigo-300">
                          {log.actorName}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase font-mono"
                        >
                          {log.action}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                      {/* Action details */}
                      {log.action === 'OVERRIDE' && log.after && (
                        <div className="pt-1 text-slate-300 text-[11px] border-t border-slate-800/60">
                          <div>
                            Marks: {log.before?.autoMarks ?? '—'} pts &rarr;{' '}
                            <span className="font-semibold text-emerald-300">
                              {log.after.finalMarks} pts
                            </span>
                          </div>
                          {log.after.note && (
                            <div className="italic text-slate-400 mt-0.5">
                              &ldquo;{log.after.note}&rdquo;
                            </div>
                          )}
                        </div>
                      )}
                      {log.action === 'OCR_EDIT' && log.after && (
                        <div className="pt-1 text-slate-300 text-[11px] border-t border-slate-800/60">
                          Word edits: {log.after.wordEdits ?? '—'} (Length: {log.after.newLength} chars)
                        </div>
                      )}
                      {log.action === 'APPROVE' && (
                        <div className="pt-1 text-emerald-400/90 text-[11px] border-t border-slate-800/60">
                          Approved AI evaluation without manual changes.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {/* Modal: View Original OCR Transcript */}
      <Dialog open={showOriginalModal} onOpenChange={setShowOriginalModal}>
        <DialogContent className="sm:max-w-[550px] bg-slate-900 border-slate-800 text-slate-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-slate-100">
              <FileText className="w-4 h-4 text-indigo-400" />
              Original Vision Transcription
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Unmodified OCR output captured when this scan was originally processed.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-wrap max-h-[350px] overflow-y-auto leading-relaxed">
            {submission.ocrOriginal || 'No original text recorded.'}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowOriginalModal(false)}
              className="border-slate-800 text-slate-300"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Regrade Force Confirmation */}
      <Dialog
        open={showRegradeForceModal}
        onOpenChange={setShowRegradeForceModal}
      >
        <DialogContent className="sm:max-w-[480px] bg-slate-900 border-slate-800 text-slate-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-amber-400">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Discard Teacher Override?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-300 leading-relaxed pt-2">
              This submission was previously adjusted by an instructor. Re-grading will discard the teacher override and recalculate marks using the AI evaluation model. Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowRegradeForceModal(false)}
              className="text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => handleRegrade(true)}
              className="bg-amber-600 hover:bg-amber-500 text-white"
            >
              Discard & Re-grade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Override Marks Dialog */}
      <Dialog open={showOverrideModal} onOpenChange={setShowOverrideModal}>
        <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-800 text-slate-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-slate-100">
              <Award className="w-5 h-5 text-indigo-400" />
              Override Marks & Feedback
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Assign an instructor override score and explanation. This value is displayed to the student alongside the AI suggestion.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {overrideError && (
              <Alert variant="destructive" className="py-2 text-xs">
                <AlertCircle className="w-3.5 h-3.5" />
                <AlertDescription>{overrideError}</AlertDescription>
              </Alert>
            )}

            {/* Final Marks input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Final Marks (0 to {question.maxMarks}, step 0.25)
              </label>
              <Input
                type="number"
                step="0.25"
                min="0"
                max={question.maxMarks}
                value={overrideMarks}
                onChange={(e) => setOverrideMarks(e.target.value)}
                placeholder={`0.00`}
                className="font-mono text-xs bg-slate-950 border-slate-800 text-slate-100"
              />
            </div>

            {/* Note input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Instructor Note (5 to 500 characters)
              </label>
              <Textarea
                value={overrideNote}
                onChange={(e) => setOverrideNote(e.target.value)}
                placeholder="Explain the rationale for this grade adjustment..."
                className="text-xs bg-slate-950 border-slate-800 text-slate-100 min-h-[90px]"
              />
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Required for transparency.</span>
                <span
                  className={cn(
                    overrideNote.trim().length >= 5 && overrideNote.trim().length <= 500
                      ? 'text-slate-400'
                      : 'text-amber-400'
                  )}
                >
                  {overrideNote.trim().length} / 500
                </span>
              </div>
            </div>

            {/* Score Comparison Preview */}
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs space-y-1">
              <span className="font-semibold text-slate-400 font-mono block">
                Score Preview:
              </span>
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-slate-400">
                  AI Marks: {grade?.totalMarks !== undefined ? `${grade.totalMarks} pts` : 'None'}
                </span>
                <span className="text-indigo-400">&rarr;</span>
                <span className="font-bold text-emerald-400">
                  Adjusted:{' '}
                  {!isNaN(parseFloat(overrideMarks))
                    ? `${parseFloat(overrideMarks)} pts`
                    : '—'}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowOverrideModal(false)}
              className="text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!isOverrideValid || overrideMutation.isPending}
              onClick={handleConfirmOverride}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              {overrideMutation.isPending ? 'Saving...' : 'Confirm Override'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
