import { useState, useEffect } from 'react';
import {
  useGenerateAdaptiveQuiz,
  useSubmitAdaptiveQuiz,
  useExplainMisconception,
  GenerateAdaptiveQuizResponse,
  SubmitAdaptiveQuizResponse,
  ExplainMisconceptionResponse,
  AdaptiveQuizResultItem,
} from '@/api/hooks';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Sparkles,
  BrainCircuit,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  GraduationCap,
  Bot,
  Lightbulb,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';

interface AdaptiveQuizModalProps {
  isOpen: boolean;
  studentId: string;
  courseId: string;
  courseTitle?: string;
  onClose: () => void;
}

export const AdaptiveQuizModal: React.FC<AdaptiveQuizModalProps> = ({
  isOpen,
  studentId,
  courseId,
  courseTitle,
  onClose,
}) => {
  const generateMutation = useGenerateAdaptiveQuiz();
  const submitMutation = useSubmitAdaptiveQuiz();
  const explainMutation = useExplainMisconception();

  const [quizData, setQuizData] = useState<GenerateAdaptiveQuizResponse | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [quizResult, setQuizResult] = useState<SubmitAdaptiveQuizResponse | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // AI Tutor explanations for review
  const [aiExplanations, setAiExplanations] = useState<Record<string, ExplainMisconceptionResponse>>({});
  const [loadingQuestionId, setLoadingQuestionId] = useState<string | null>(null);

  // Auto-generate quiz on open if not already loaded
  useEffect(() => {
    if (isOpen && !quizData && !generateMutation.isPending && !quizResult) {
      handleGenerate();
    }
  }, [isOpen]);

  const handleGenerate = async () => {
    setGenerationError(null);
    setCurrentIndex(0);
    setSelectedAnswers({});
    setQuizResult(null);
    setAiExplanations({});
    try {
      const data = await generateMutation.mutateAsync({ studentId, courseId });
      setQuizData(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate adaptive quiz';
      setGenerationError(msg);
    }
  };

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleSubmit = async () => {
    if (!quizData || quizData.questions.length === 0) return;

    const formattedAnswers = quizData.questions.map((q) => ({
      questionId: q.id,
      conceptId: q.conceptId,
      selectedIndex: selectedAnswers[q.id] ?? 0,
      difficulty: q.difficulty,
    }));

    try {
      const result = await submitMutation.mutateAsync({
        studentId,
        courseId,
        quizId: quizData.quizId,
        answers: formattedAnswers,
      });
      setQuizResult(result);
    } catch (err: unknown) {
      console.error('Failed to submit adaptive quiz:', err);
    }
  };

  const handleExplain = async (res: AdaptiveQuizResultItem) => {
    setLoadingQuestionId(res.questionId);
    try {
      const data = await explainMutation.mutateAsync({
        conceptId: res.conceptId,
        questionPrompt: res.prompt,
        options: res.options,
        selectedAnswer: res.selectedAnswer,
        correctAnswer: res.correctAnswer,
        generalExplanation: res.explanation,
      });
      setAiExplanations((prev) => ({
        ...prev,
        [res.questionId]: data,
      }));
    } catch (err) {
      console.error('Failed to get AI misconception breakdown:', err);
    } finally {
      setLoadingQuestionId(null);
    }
  };

  const handleClose = () => {
    setQuizData(null);
    setCurrentIndex(0);
    setSelectedAnswers({});
    setQuizResult(null);
    setAiExplanations({});
    setGenerationError(null);
    onClose();
  };

  const questions = quizData?.questions || [];
  const currentQ = questions[currentIndex];
  const allAnswered = questions.length > 0 && questions.every((q) => selectedAnswers[q.id] !== undefined);
  const progressPercent = questions.length > 0 ? Math.round(((currentIndex + 1) / questions.length) * 100) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] flex flex-col bg-slate-900 border-slate-800 text-slate-100 p-6 shadow-2xl">
        <DialogHeader className="pb-3 border-b border-slate-800">
          <div className="flex items-center justify-between pr-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                <BrainCircuit className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <span>AI Autonomous Adaptive Challenge</span>
                  <Badge variant="outline" className="text-[10px] font-mono border-indigo-500/40 text-indigo-300 bg-indigo-500/10">
                    Gemini 1.5 Flash
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  {quizData?.quizTitle || courseTitle || 'Dynamic Diagnostic Assessment'}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Dialog Body */}
        <div className="flex-1 overflow-y-auto py-2">
          {generateMutation.isPending ? (
            /* AI Generation Animation View */
            <div className="py-16 text-center space-y-4">
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 animate-ping"></div>
                <div className="relative w-16 h-16 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/40 mx-auto">
                  <BrainCircuit className="w-8 h-8 animate-pulse text-indigo-400" />
                </div>
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-sm font-bold text-slate-100">
                  Synthesizing Personalized Recovery Challenge
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Analyzing your mastery scores and prerequisite graph... Gemini 1.5 Flash is tailoring targeted diagnostic questions to your current weak areas.
                </p>
              </div>
            </div>
          ) : generationError ? (
            /* Generation Error View */
            <div className="py-12 text-center space-y-3">
              <HelpCircle className="w-8 h-8 mx-auto text-rose-400" />
              <p className="text-xs text-rose-300 font-medium">{generationError}</p>
              <Button size="sm" onClick={handleGenerate} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" /> Try Again
              </Button>
            </div>
          ) : quizResult ? (
            /* Quiz Completion & Multi-Concept Mastery Uplift View */
            <div className="space-y-5 py-2">
              <div className="p-5 rounded-xl border border-indigo-500/30 bg-gradient-to-b from-indigo-500/15 to-transparent text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center mx-auto border border-indigo-500/40">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    Adaptive Challenge Completed!
                  </h3>
                  <p className="text-xs text-slate-300 font-mono mt-0.5">
                    Score: {quizResult.correctCount} of {quizResult.totalQuestions} Correct ({quizResult.accuracyPercentage}%)
                  </p>
                </div>

                {/* Overall Accuracy & Risk Banner */}
                <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300">
                    <span className="text-slate-400">Academic Standing:</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] py-0 px-2 font-mono ${
                        quizResult.riskLevel === 'OK'
                          ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                          : quizResult.riskLevel === 'WATCH'
                          ? 'border-indigo-500/40 text-indigo-300 bg-indigo-500/10'
                          : 'border-amber-500/40 text-amber-300 bg-amber-500/10'
                      }`}
                    >
                      {quizResult.riskLevel === 'OK'
                        ? 'Good Standing'
                        : quizResult.riskLevel === 'WATCH'
                        ? 'Under Watch'
                        : 'Needs Support'}
                    </Badge>
                  </div>

                  {quizResult.newAvgMastery !== null && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300">
                      <span className="text-slate-400">Course Mastery Avg:</span>
                      <span className="font-bold text-indigo-300">
                        {Math.round(quizResult.newAvgMastery * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Multi-Concept Mastery Uplift Strip */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Real-Time Mastery Score Uplifts</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {quizResult.conceptUpdates.map((cu) => (
                    <div
                      key={cu.conceptId}
                      className="p-3 rounded-lg border border-border/70 bg-slate-950/60 flex items-center justify-between text-xs gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-200 truncate">{cu.conceptTitle}</p>
                        <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                          {Math.round(cu.previousScore * 100)}% →{' '}
                          <span className="text-emerald-300 font-bold">
                            {Math.round(cu.newScore * 100)}%
                          </span>
                        </p>
                      </div>

                      <Badge
                        variant="secondary"
                        className={`text-[10px] font-mono shrink-0 ${
                          cu.delta > 0
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {cu.delta > 0 ? `+${Math.round(cu.delta * 100)}%` : 'Maintained'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Question Breakdown with AI Tutor */}
              <div className="space-y-3 pt-1">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Question Breakdown & AI Diagnostics
                </h4>

                {quizResult.results.map((res, idx) => (
                  <div
                    key={res.questionId}
                    className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                      res.isCorrect ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="font-medium text-slate-200">
                          {idx + 1}. {res.prompt}
                        </span>
                        <Badge variant="outline" className="text-[9px] py-0 px-1.5 border-slate-700 text-slate-400 font-mono">
                          {res.conceptTitle}
                        </Badge>
                      </div>

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
                      <span className="font-medium text-slate-300">Explanation:</span> {res.explanation}
                    </div>

                    {/* AI Tutor Misconception Breakdown */}
                    {aiExplanations[res.questionId] ? (
                      <div className="p-3 rounded-lg border border-indigo-500/30 bg-indigo-950/30 space-y-2 mt-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-indigo-300 font-semibold text-[11px]">
                            <Bot className="w-3.5 h-3.5 text-indigo-400" />
                            <span>AI Tutor Misconception Breakdown</span>
                          </div>
                          <Badge variant="outline" className="text-[9px] py-0 px-1.5 border-indigo-500/40 text-indigo-300 bg-indigo-500/10 font-mono">
                            {aiExplanations[res.questionId].source === 'gemini' ? 'Gemini 1.5 Flash' : 'Adaptive Engine'}
                          </Badge>
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-[11px] font-medium text-amber-300">
                            <Lightbulb className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>Misconception Diagnosis:</span>
                          </div>
                          <p className="text-[11px] text-slate-300 pl-4 leading-relaxed">
                            {aiExplanations[res.questionId].misconceptionDiagnosis}
                          </p>
                        </div>

                        <div className="pt-1 border-t border-indigo-500/20 text-[10px] text-indigo-200 font-mono bg-indigo-500/10 p-2 rounded border border-indigo-500/20">
                          <span className="font-bold text-indigo-300">Rule of Thumb:</span> {aiExplanations[res.questionId].memoryRule}
                        </div>
                      </div>
                    ) : (
                      <div className="pt-1 flex justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={loadingQuestionId === res.questionId}
                          onClick={() => handleExplain(res)}
                          className="h-6 text-[10px] gap-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 px-2"
                        >
                          {loadingQuestionId === res.questionId ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
                              <span>Consulting AI Tutor...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3 text-indigo-400" />
                              <span>{res.isCorrect ? 'Ask AI: Deepen Concept' : 'Ask AI: Explain Misconception'}</span>
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Button onClick={handleClose} className="w-full text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium">
                Apply & Update Dashboard
              </Button>
            </div>
          ) : currentQ ? (
            /* Active Quiz Question View */
            <div className="space-y-4 py-2">
              {/* Target Concept Focus Strip */}
              {quizData?.targetConcepts && quizData.targetConcepts.length > 0 && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-950/70 p-2 rounded-lg border border-slate-800 flex-wrap">
                  <span className="text-indigo-300 font-medium">Targeted Focus Areas:</span>
                  {quizData.targetConcepts.map((tc) => (
                    <span key={tc.id} className="text-slate-300 font-mono">
                      {tc.name} ({Math.round(tc.score * 100)}%)
                    </span>
                  ))}
                </div>
              )}

              {/* Progress & Difficulty Meter */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">Tier:</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-mono px-2 py-0.5 ${
                        currentQ.difficulty === 'ADVANCED'
                          ? 'border-amber-500/40 text-amber-300 bg-amber-500/10'
                          : currentQ.difficulty === 'INTERMEDIATE'
                          ? 'border-indigo-500/40 text-indigo-300 bg-indigo-500/10'
                          : 'border-blue-500/40 text-blue-300 bg-blue-500/10'
                      }`}
                    >
                      {currentQ.difficulty === 'ADVANCED'
                        ? '⚡ Level 3: Advanced Challenge'
                        : currentQ.difficulty === 'INTERMEDIATE'
                        ? '📈 Level 2: Application'
                        : '🛡️ Level 1: Foundation'}
                    </Badge>
                    <span className="text-[11px] text-slate-400">• {currentQ.conceptTitle}</span>
                  </div>
                  <span>
                    Question {currentIndex + 1} of {questions.length} ({progressPercent}%)
                  </span>
                </div>
                <Progress value={progressPercent} className="h-1.5 bg-slate-800" />
              </div>

              {/* Question Card */}
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
                            isSelected ? 'border-indigo-400 bg-indigo-500' : 'border-slate-600'
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
                    disabled={!allAnswered || submitMutation.isPending}
                    className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white gap-1 font-semibold"
                  >
                    {submitMutation.isPending ? 'Grading & Updating Mastery...' : 'Submit Challenge Quiz'}
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
