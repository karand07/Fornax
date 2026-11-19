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
  Camera,
  Upload,
  X,
  FileText,
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

  // Scans State for HANDWRITTEN questions: questionId -> { file: File, previewUrl: string }
  const [scans, setScans] = useState<
    Record<string, { file: File; previewUrl: string }>
  >({});
  const [scanErrors, setScanErrors] = useState<Record<string, string>>({});

  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Revoke object URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(scans).forEach((s) => {
        if (s?.previewUrl) {
          URL.revokeObjectURL(s.previewUrl);
        }
      });
    };
  }, []);

  // If already submitted, navigate directly to result page
  useEffect(() => {
    if (assessment?.submitted) {
      navigate(`/student/assessments/${assessmentId}/result`, { replace: true });
    }
  }, [assessment?.submitted, assessmentId, navigate]);

  // Track if there are any answered questions (for unsaved answers warning)
  const answeredQuestionCount = (assessment?.questions || []).filter((q: Question) => {
    if (q.type === 'MCQ') {
      return answers[q.id]?.selectedIndex !== undefined;
    }
    if (q.type === 'SHORT') {
      return Boolean(answers[q.id]?.answerText && answers[q.id].answerText!.trim().length > 0);
    }
    if (q.type === 'HANDWRITTEN') {
      return Boolean(scans[q.id]?.file);
    }
    return false;
  }).length;

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

  const handleScanChange = (questionId: string, file: File | null) => {
    // Clear previous scan error
    setScanErrors((prev) => {
      const copy = { ...prev };
      delete copy[questionId];
      return copy;
    });

    if (!file) return;

    // Type validation
    if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
      setScanErrors((prev) => ({
        ...prev,
        [questionId]: 'Only JPEG and PNG images are allowed.',
      }));
      return;
    }

    // Size validation (5MB max)
    const MAX_SCAN_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_SCAN_BYTES) {
      setScanErrors((prev) => ({
        ...prev,
        [questionId]: `File size exceeds the 5MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`,
      }));
      return;
    }

    // Clean up previous preview URL if any
    if (scans[questionId]?.previewUrl) {
      URL.revokeObjectURL(scans[questionId].previewUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    setScans((prev) => ({
      ...prev,
      [questionId]: { file, previewUrl },
    }));
  };

  const handleRemoveScan = (questionId: string) => {
    if (scans[questionId]?.previewUrl) {
      URL.revokeObjectURL(scans[questionId].previewUrl);
    }
    setScans((prev) => {
      const copy = { ...prev };
      delete copy[questionId];
      return copy;
    });
    setScanErrors((prev) => {
      const copy = { ...prev };
      delete copy[questionId];
      return copy;
    });
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

      const hasScans = Object.keys(scans).length > 0;
      let result;

      if (hasScans) {
        const formData = new FormData();
        formData.append('payload', JSON.stringify({ answers: formattedAnswers }));
        for (const [qId, scanItem] of Object.entries(scans)) {
          if (scanItem?.file) {
            formData.append(`scan:${qId}`, scanItem.file);
          }
        }
        result = await submitMutation.mutateAsync(formData);
      } else {
        result = await submitMutation.mutateAsync({
          answers: formattedAnswers,
        });
      }

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
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 py-3 px-4 rounded-b-xl shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Link to="/student">
                <Button variant="ghost" size="sm" className="h-7 px-2 text-slate-600 hover:text-slate-900 font-semibold">
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
                </Button>
              </Link>
              <h1 className="text-base font-bold text-slate-900">{assessment.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-xs font-mono font-bold text-slate-700">
                {answeredQuestionCount} of {totalQuestions} answered
              </span>
              <div className="w-36 mt-1">
                <Progress value={progressPercent} className="h-1.5 bg-slate-100" />
              </div>
            </div>

            <Button
              onClick={() => setIsConfirmDialogOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-2 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              Submit Quiz
            </Button>
          </div>
        </div>
      </div>

      {/* Intro Notice */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-600 font-medium">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-600" />
          <span>
            Single-attempt assessment. Multiple choice questions are auto-graded; handwritten and short responses will be evaluated.
          </span>
        </div>
        <Badge variant="outline" className="border-slate-300 text-slate-700 bg-white font-semibold">
          {totalQuestions} Questions
        </Badge>
      </div>

      {/* Questions Scrolling List */}
      <div className="space-y-6">
        {(assessment.questions || []).map((q: Question, idx: number) => {
          const currentAns = answers[q.id];
          const scanItem = scans[q.id];
          const isAnswered =
            q.type === 'MCQ'
              ? currentAns?.selectedIndex !== undefined
              : q.type === 'SHORT'
              ? Boolean(currentAns?.answerText && currentAns.answerText.trim().length > 0)
              : Boolean(scanItem?.file);

          return (
            <Card
              key={q.id}
              className={`border transition-all ${
                isAnswered
                  ? 'border-indigo-300 bg-indigo-50/20 shadow-xs'
                  : 'border-slate-200 bg-white shadow-xs'
              }`}
            >
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-7 h-7 rounded-full text-xs font-mono flex items-center justify-center font-bold transition-colors ${
                        isAnswered
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <Badge
                      variant="outline"
                      className="border-slate-200 bg-slate-50 text-slate-700 text-[11px] font-semibold"
                    >
                      {q.type}
                    </Badge>
                  </div>
                  <span className="text-xs font-bold text-slate-700">
                    {q.maxMarks} {q.maxMarks === 1 ? 'Mark' : 'Marks'}
                  </span>
                </div>

                <CardTitle className="text-sm font-bold text-slate-900 mt-2 font-sans whitespace-pre-wrap leading-relaxed">
                  {q.prompt}
                </CardTitle>
              </CardHeader>

              <CardContent className="pt-3">
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
                              ? 'bg-indigo-50 border-2 border-indigo-500 text-indigo-950 font-bold shadow-2xs'
                              : 'bg-slate-50/70 border-slate-200 text-slate-800 hover:bg-slate-100/70 font-medium'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                              isSelected
                                ? 'border-indigo-500 bg-indigo-600'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && (
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                          </div>
                          <span className="w-5 font-mono font-bold text-slate-500">
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
                      className="bg-white border-slate-300 text-slate-900 text-xs font-mono placeholder:text-slate-400 focus:border-indigo-500"
                    />
                    <div className="flex justify-between items-center text-[11px] text-slate-500 font-medium">
                      <span>Provide a complete and concise answer</span>
                      <span
                        className={`font-mono ${
                          (currentAns?.answerText?.length || 0) > 4500
                            ? 'text-amber-600 font-bold'
                            : 'text-slate-500'
                        }`}
                      >
                        {currentAns?.answerText?.length || 0} / 5000 chars
                      </span>
                    </div>
                  </div>
                )}

                {/* HANDWRITTEN Answer Upload */}
                {q.type === 'HANDWRITTEN' && (
                  <div className="space-y-3 mt-2">
                    <div className="p-3 rounded-lg bg-indigo-50/70 border border-indigo-200 text-xs text-indigo-900 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                        <Camera className="w-4 h-4 text-indigo-600" />
                        <span>Handwritten Answer Instructions</span>
                      </div>
                      <p className="text-slate-700 text-[11px] leading-relaxed font-medium">
                        Take a clear, well-lit photo of your handwritten answer. Ensure the writing is legible and fits on the page.
                      </p>
                      <p className="text-indigo-700 text-[11px] font-semibold pt-1">
                        Notice: Your handwriting will be transcribed by AI and reviewed by your teacher.
                      </p>
                    </div>

                    {!scanItem ? (
                      <div>
                        <label
                          htmlFor={`scan-upload-${q.id}`}
                          className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100/80 transition-all text-center"
                        >
                          <Upload className="w-8 h-8 text-slate-400 mb-2" />
                          <span className="text-xs font-bold text-slate-900">
                            Upload or take a photo of your answer
                          </span>
                          <span className="text-[11px] text-slate-500 mt-1 font-medium">
                            JPEG or PNG, up to 5MB
                          </span>
                          <input
                            id={`scan-upload-${q.id}`}
                            type="file"
                            accept="image/jpeg,image/png"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              handleScanChange(q.id, file);
                            }}
                          />
                        </label>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-slate-800 font-mono font-semibold">
                            <FileText className="w-4 h-4 text-indigo-600" />
                            <span className="truncate max-w-[200px] sm:max-w-xs">{scanItem.file.name}</span>
                            <span className="text-slate-500 font-medium">
                              ({(scanItem.file.size / (1024 * 1024)).toFixed(2)} MB)
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveScan(q.id)}
                            className="h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1 text-xs font-semibold"
                          >
                            <X className="w-3.5 h-3.5" />
                            Remove
                          </Button>
                        </div>

                        {/* Thumbnail Preview */}
                        <div className="relative rounded-md overflow-hidden border border-slate-200 max-h-64 bg-slate-100 flex items-center justify-center">
                          <img
                            src={scanItem.previewUrl}
                            alt="Answer scan preview"
                            className="max-h-64 max-w-full object-contain rounded"
                          />
                        </div>
                      </div>
                    )}

                    {scanErrors[q.id] && (
                      <div className="text-xs text-rose-600 font-medium flex items-center gap-1.5 pt-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{scanErrors[q.id]}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Submit Confirmation Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="max-w-md bg-white border-slate-200 text-slate-900 shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              Ready to submit your quiz?
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2 text-xs text-slate-600 font-medium">
              <p>
                You have answered{' '}
                <span className="font-bold text-slate-900">
                  {answeredQuestionCount} of {totalQuestions}
                </span>{' '}
                questions.
              </p>
              {answeredQuestionCount < totalQuestions && (
                <p className="text-amber-800 font-semibold bg-amber-50 p-2 rounded border border-amber-200">
                  Notice: {totalQuestions - answeredQuestionCount} questions are left unanswered and will receive 0 marks.
                </p>
              )}
              <p className="text-slate-500">
                You can only submit once. Once submitted, your answers cannot be changed.
              </p>
            </DialogDescription>
          </DialogHeader>

          {submitError && (
            <div className="p-3 text-xs rounded-md bg-rose-50 border border-rose-200 text-rose-800 font-medium">
              {submitError}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setIsConfirmDialogOpen(false)}
              disabled={submitMutation.isPending}
              className="border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
            >
              Continue Working
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-2 shadow-xs"
            >
              {submitMutation.isPending ? 'Grading & Submitting...' : 'Confirm Submission'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
