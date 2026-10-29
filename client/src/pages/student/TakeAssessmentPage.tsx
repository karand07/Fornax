import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  useAssessment,
  useSubmitAssessment,
  Question,
} from '@/api/hooks';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  AlertCircle,
  Send,
  Clock,
  Sparkles,
} from 'lucide-react';

export const TakeAssessmentPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();

  const { data: assessment, isLoading, error: fetchError } = useAssessment(
    assessmentId || ''
  );
  const submitMutation = useSubmitAssessment(assessmentId || '');

  // Answers State: questionId -> { selectedIndex?: number, answerText?: string }
  const [answers, setAnswers] = useState<
    Record<string, { selectedIndex?: number; answerText?: string }>
  >({});

  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // If already submitted, navigate directly to result page
  useEffect(() => {
    if (assessment?.submitted) {
      navigate(`/student/assessments/${assessmentId}/result`, { replace: true });
    }
  }, [assessment?.submitted, assessmentId, navigate]);

  // Track if there are any answered questions (for unsaved answers warning)
  const answeredQuestionCount = Object.values(answers).filter(
    (ans) =>
      ans.selectedIndex !== undefined || (ans.answerText && ans.answerText.trim().length > 0)
  ).length;

  const totalQuestions = assessment?.questions?.length || 0;
  const progressPercent = totalQuestions > 0 ? (answeredQuestionCount / totalQuestions) * 100 : 0;

  // Warn on page leave (beforeunload)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (answeredQuestionCount > 0 && !assessment?.submitted && !submitMutation.isSuccess) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [answeredQuestionCount, assessment?.submitted, submitMutation.isSuccess]);

  const handleMCQSelect = (questionId: string, index: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        selectedIndex: index,
      },
    }));
  };

  const handleShortAnswerChange = (questionId: string, text: string) => {
    if (text.length <= 5000) {
      setAnswers((prev) => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          answerText: text,
        },
      }));
    }
  };

  const handleSubmit = async () => {
    if (!assessment) return;

    try {
      setSubmitError(null);

      // Build payload for all questions
      const formattedAnswers = (assessment.questions || []).map((q: Question) => {
        const studentAns = answers[q.id];
        return {
          questionId: q.id,
          selectedIndex: studentAns?.selectedIndex,
          answerText: studentAns?.answerText,
        };
      });

      const result = await submitMutation.mutateAsync({
        answers: formattedAnswers,
      });

      setIsConfirmDialogOpen(false);
      navigate(`/student/assessments/${assessmentId}/result`, {
        state: { submitSummary: result },
        replace: true,
      });
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to submit assessment';
      setSubmitError(msg);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-sm text-slate-400 font-mono animate-pulse">
        Loading assessment questions...
      </div>
    );
  }

  if (fetchError || !assessment) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>Assessment Unavailable</AlertTitle>
          <AlertDescription>
            {(fetchError as any)?.response?.data?.error ||
              'This assessment is either not published or you are not enrolled in the course.'}
          </AlertDescription>
        </Alert>
        <Link to="/student">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Return to Student Portal
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Sticky Progress Bar & Header */}
      <div className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 py-3 px-4 rounded-b-xl shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Link to="/student">
                <Button variant="ghost" size="sm" className="h-7 px-2 text-slate-400 hover:text-white">
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
                </Button>
              </Link>
              <h1 className="text-base font-bold text-slate-100">{assessment.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-xs font-mono font-medium text-slate-300">
                {answeredQuestionCount} of {totalQuestions} answered
              </span>
              <div className="w-36 mt-1">
                <Progress value={progressPercent} className="h-1.5 bg-slate-800" />
              </div>
            </div>

            <Button
              onClick={() => setIsConfirmDialogOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 shadow-md"
            >
              <Send className="w-3.5 h-3.5" />
              Submit Quiz
            </Button>
          </div>
        </div>
      </div>

      {/* Intro Notice */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-400" />
          <span>
            Single-attempt assessment. Multiple choice questions will be auto-graded immediately; short answer questions will be evaluated by your instructor.
          </span>
        </div>
        <Badge variant="outline" className="border-slate-700 text-slate-300">
          {totalQuestions} Questions
        </Badge>
      </div>

      {/* Questions Scrolling List */}
      <div className="space-y-6">
        {(assessment.questions || []).map((q: Question, idx: number) => {
          const currentAns = answers[q.id];
          const isAnswered =
            currentAns?.selectedIndex !== undefined ||
            (currentAns?.answerText && currentAns.answerText.trim().length > 0);

          return (
            <Card
              key={q.id}
              className={`border transition-all ${
                isAnswered
                  ? 'border-indigo-900/50 bg-slate-900/90 shadow-indigo-950/20'
                  : 'border-slate-800 bg-slate-900/50'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-7 h-7 rounded-full text-xs font-mono flex items-center justify-center font-bold transition-colors ${
                        isAnswered
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <Badge
                      variant="outline"
                      className="border-slate-700 text-slate-400 text-[11px]"
                    >
                      {q.type}
                    </Badge>
                  </div>
                  <span className="text-xs font-semibold text-slate-300">
                    {q.maxMarks} {q.maxMarks === 1 ? 'Mark' : 'Marks'}
                  </span>
                </div>

                <CardTitle className="text-sm font-medium text-slate-200 mt-2 font-mono whitespace-pre-wrap leading-relaxed">
                  {q.prompt}
                </CardTitle>
              </CardHeader>

              <CardContent className="pt-0">
                {/* MCQ Options with Radio selection */}
                {q.type === 'MCQ' && (
                  <div className="space-y-2 mt-2">
                    {((q.options as string[]) || []).map((opt, optIdx) => {
                      const isSelected = currentAns?.selectedIndex === optIdx;
                      return (
                        <div
                          key={optIdx}
                          onClick={() => handleMCQSelect(q.id, optIdx)}
                          className={`p-3 rounded-lg border text-xs flex items-center gap-3 cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-sm'
                              : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                              isSelected
                                ? 'border-indigo-500 bg-indigo-600'
                                : 'border-slate-700 bg-slate-900'
                            }`}
                          >
                            {isSelected && (
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                          </div>
                          <span className="w-5 font-mono font-bold text-slate-400">
                            {String.fromCharCode(65 + optIdx)}.
                          </span>
                          <span className="flex-1">{opt}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* SHORT Answer Textarea with Character Counter */}
                {q.type === 'SHORT' && (
                  <div className="space-y-2 mt-2">
                    <Textarea
                      value={currentAns?.answerText || ''}
                      onChange={(e) => handleShortAnswerChange(q.id, e.target.value)}
                      placeholder="Type your explanation or response here (up to 5000 characters)..."
                      rows={5}
                      maxLength={5000}
                      className="bg-slate-950 border-slate-800 text-slate-100 text-xs font-mono"
                    />
                    <div className="flex justify-between items-center text-[11px] text-slate-500">
                      <span>Provide a complete and concise answer</span>
                      <span
                        className={`font-mono ${
                          (currentAns?.answerText?.length || 0) > 4500
                            ? 'text-amber-400 font-bold'
                            : 'text-slate-500'
                        }`}
                      >
                        {currentAns?.answerText?.length || 0} / 5000 chars
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Submit Confirmation Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              Ready to submit your quiz?
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2 text-xs">
              <p>
                You have answered{' '}
                <span className="font-bold text-slate-200">
                  {answeredQuestionCount} of {totalQuestions}
                </span>{' '}
                questions.
              </p>
              {answeredQuestionCount < totalQuestions && (
                <p className="text-amber-400 font-medium">
                  Notice: {totalQuestions - answeredQuestionCount} questions are left unanswered and will receive 0 marks.
                </p>
              )}
              <p className="text-slate-400">
                You can only submit once. Once submitted, your answers cannot be changed.
              </p>
            </DialogDescription>
          </DialogHeader>

          {submitError && (
            <div className="p-3 text-xs rounded-md bg-red-950/50 border border-red-900/50 text-red-300">
              {submitError}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setIsConfirmDialogOpen(false)}
              disabled={submitMutation.isPending}
            >
              Continue Working
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
            >
              {submitMutation.isPending ? 'Grading & Submitting...' : 'Confirm Submission'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
