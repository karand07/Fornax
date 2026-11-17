import React, { useState } from 'react';
import { useConceptPracticeQuestions, useSubmitPractice, SubmitPracticeResponse } from '@/api/hooks';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  GraduationCap,
} from 'lucide-react';

interface AdaptivePracticeDialogProps {
  isOpen: boolean;
  conceptId: string | null;
  conceptTitle?: string;
  onClose: () => void;
}

export const AdaptivePracticeDialog: React.FC<AdaptivePracticeDialogProps> = ({
  isOpen,
  conceptId,
  conceptTitle,
  onClose,
}) => {
  const { data: practiceData, isLoading } = useConceptPracticeQuestions(isOpen && conceptId ? conceptId : null);
  const submitPracticeMutation = useSubmitPractice();

  const questions = practiceData?.questions || [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [drillResult, setDrillResult] = useState<SubmitPracticeResponse | null>(null);

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setSelectedAnswers({});
    setDrillResult(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!conceptId || questions.length === 0) return;

    const formattedAnswers = questions.map((q) => ({
      questionId: q.id,
      selectedIndex: selectedAnswers[q.id] ?? 0,
    }));

    const result = await submitPracticeMutation.mutateAsync({
      conceptId,
      answers: formattedAnswers,
    });

    setDrillResult(result);
  };

  const currentQ = questions[currentIndex];
  const allAnswered = questions.length > 0 && questions.every((q) => selectedAnswers[q.id] !== undefined);
  const progressPercent = questions.length > 0 ? Math.round(((currentIndex + 1) / questions.length) * 100) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col bg-slate-900 border-slate-800 text-slate-100 p-6">
        <DialogHeader className="pb-3 border-b border-slate-800">
          <div className="flex items-center justify-between pr-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <span>Adaptive Practice Drill</span>
                  <Badge variant="outline" className="text-[10px] font-mono border-indigo-500/30 text-indigo-400 bg-indigo-500/10">
                    Targeted Remediation
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  {conceptTitle || practiceData?.conceptTitle || 'Concept Practice'}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Dialog Body */}
        <div className="flex-1 overflow-y-auto py-2">
          {isLoading ? (
            <div className="py-8 space-y-4">
              <Skeleton className="h-6 w-1/3 bg-slate-800" />
              <Skeleton className="h-16 w-full bg-slate-800" />
              <div className="space-y-2 pt-2">
                <Skeleton className="h-12 w-full bg-slate-800/60 rounded-lg" />
                <Skeleton className="h-12 w-full bg-slate-800/60 rounded-lg" />
                <Skeleton className="h-12 w-full bg-slate-800/60 rounded-lg" />
              </div>
            </div>
          ) : drillResult ? (
            /* Results & Mastery Boost View */
            <div className="space-y-5 py-2">
              <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center mx-auto">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    Practice Drill Completed!
                  </h3>
                  <p className="text-xs text-slate-300 font-mono mt-0.5">
                    {drillResult.correctCount} of {drillResult.totalQuestions} Questions Correct (
                    {Math.round((drillResult.correctCount / drillResult.totalQuestions) * 100)}%)
                  </p>
                </div>

                {/* Mastery Delta Banner */}
                <div className="flex items-center justify-center gap-2 pt-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950 border border-indigo-500/40 text-xs font-mono">
                    <span className="text-slate-400">Mastery:</span>
                    <span className="text-slate-300">{Math.round(drillResult.previousScore * 100)}%</span>
                    <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="font-bold text-emerald-400">
                      {Math.round(drillResult.newScore * 100)}%
                    </span>
                    {drillResult.delta > 0 && (
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-0 text-[10px] py-0 px-1 font-bold">
                        +{Math.round(drillResult.delta * 100)}% Boost
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Per-Question Explanations */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Question Breakdown & Explanations
                </h4>
                {drillResult.results.map((res, idx) => (
                  <div
                    key={res.questionId}
                    className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                      res.isCorrect
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : 'border-rose-500/30 bg-rose-500/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-slate-200">
                        {idx + 1}. {res.prompt}
                      </span>
                      {res.isCorrect ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 font-semibold shrink-0">
                          <XCircle className="w-3.5 h-3.5" /> Incorrect
                        </span>
                      )}
                    </div>

                    {!res.isCorrect && (
                      <div className="text-[11px] text-slate-300">
                        <span className="text-slate-500">Correct answer:</span>{' '}
                        <span className="text-emerald-300 font-medium">{res.correctAnswer}</span>
                      </div>
                    )}

                    <div className="text-[11px] text-slate-400 bg-slate-950/40 p-2 rounded border border-slate-800/60 mt-1">
                      <span className="font-medium text-slate-300">Explanation:</span>{' '}
                      {res.explanation}
                    </div>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleClose}
                className="w-full text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
              >
                Close & Update Dashboard
              </Button>
            </div>
          ) : questions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <HelpCircle className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-xs">No practice questions available for this concept yet.</p>
            </div>
          ) : currentQ ? (
            /* Active Question View */
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                  <span>{progressPercent}% Complete</span>
                </div>
                <Progress value={progressPercent} className="h-1.5 bg-slate-800" />
              </div>

              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 space-y-3">
                <h3 className="text-sm font-semibold text-slate-100 leading-relaxed">
                  {currentQ.prompt}
                </h3>

                <div className="space-y-2 pt-1">
                  {currentQ.options.map((option, optIdx) => {
                    const isSelected = selectedAnswers[currentQ.id] === optIdx;
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleSelectOption(currentQ.id, optIdx)}
                        className={`w-full text-left p-3 rounded-lg border text-xs transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-500/15 text-indigo-200 font-medium'
                            : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <span className="flex-1">{option}</span>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'border-indigo-400 bg-indigo-500'
                              : 'border-slate-600'
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="text-xs border-slate-700 text-slate-300 gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Previous
                </Button>

                {currentIndex < questions.length - 1 ? (
                  <Button
                    size="sm"
                    onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                    disabled={selectedAnswers[currentQ.id] === undefined}
                    className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white gap-1"
                  >
                    Next <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={!allAnswered || submitPracticeMutation.isPending}
                    className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white gap-1 font-semibold"
                  >
                    {submitPracticeMutation.isPending ? 'Grading Drill...' : 'Submit Practice Drill'}
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};
