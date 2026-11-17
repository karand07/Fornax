import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CheckCircle2,
  XCircle,
  Check,
  Info,
  Clock,
  HelpCircle,
  FileImage,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { AssessmentQuestionResultItem } from '@/api/hooks';
import api from '@/api/axios';

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
  const isHandwritten = question.type === 'HANDWRITTEN';
  const isGraded = question.status === 'GRADED';
  const studentHasAnswered =
    question.studentAnswer !== null && question.studentAnswer !== undefined && question.studentAnswer !== '';

  const marksDisplay = isGraded
    ? `${question.marksObtained ?? 0} / ${question.maxMarks}`
    : `— / ${question.maxMarks}`;

  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanBlobUrl, setScanBlobUrl] = useState<string | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const handleOpenScan = async () => {
    if (!question.submissionId) return;
    setIsScanModalOpen(true);
    if (!scanBlobUrl) {
      setScanLoading(true);
      setScanError(null);
      try {
        const res = await api.get(`/submissions/${question.submissionId}/scan`, {
          responseType: 'blob',
        });
        const url = URL.createObjectURL(res.data);
        setScanBlobUrl(url);
      } catch (err: any) {
        setScanError(err.response?.data?.error || 'Failed to load scan image.');
      } finally {
        setScanLoading(false);
      }
    }
  };

  const handleCloseScan = () => {
    setIsScanModalOpen(false);
    if (scanBlobUrl) {
      URL.revokeObjectURL(scanBlobUrl);
      setScanBlobUrl(null);
    }
  };

  useEffect(() => {
    return () => {
      if (scanBlobUrl) {
        URL.revokeObjectURL(scanBlobUrl);
      }
    };
  }, [scanBlobUrl]);

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

        {/* SHORT & HANDWRITTEN Questions View */}
        {!isMCQ && (
          <div className="space-y-4">
            {/* Handwritten-specific OCR status banners */}
            {isHandwritten && question.ocrStatus === 'UNREADABLE' && (
              <Alert variant="destructive" className="border-amber-500/40 bg-amber-950/20 text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <AlertTitle className="font-semibold text-xs">Handwriting Unreadable</AlertTitle>
                <AlertDescription className="text-xs text-amber-300/90 mt-1">
                  Your handwriting could not be read clearly. Your teacher will review your scan directly.
                </AlertDescription>
              </Alert>
            )}

            {isHandwritten && question.ocrStatus === 'FAILED' && (
              <Alert variant="destructive" className="border-rose-500/40 bg-rose-950/20 text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <AlertTitle className="font-semibold text-xs">Transcription Failed</AlertTitle>
                <AlertDescription className="text-xs text-rose-300/90 mt-1">
                  Transcription could not be completed. Your teacher will review your scan directly.
                </AlertDescription>
              </Alert>
            )}

            {/* Answer Display */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold text-slate-400">
                  {isHandwritten ? 'AI Transcript of Your Handwriting:' : 'Your Submitted Answer:'}
                </div>
                {isHandwritten && question.submissionId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenScan}
                    className="h-7 text-xs gap-1.5 border-slate-700 hover:border-indigo-500 text-slate-300 hover:text-white"
                  >
                    <FileImage className="w-3.5 h-3.5 text-indigo-400" />
                    View my scan
                  </Button>
                )}
              </div>

              <blockquote className="border-l-2 border-indigo-500/60 bg-slate-950/60 p-3 rounded-r-md text-xs md:text-sm text-slate-200 font-mono whitespace-pre-wrap leading-relaxed">
                {typeof question.studentAnswer === 'string' && question.studentAnswer.trim().length > 0
                  ? `"${question.studentAnswer}"`
                  : isHandwritten
                  ? 'No transcribed text available.'
                  : 'No answer submitted'}
              </blockquote>

              {isHandwritten && (
                <p className="text-[11px] text-slate-400 italic">
                  Transcribed from your handwriting. Your teacher can review and adjust.
                </p>
              )}
            </div>

            {/* Pending grading indicator */}
            {question.status === 'PENDING' &&
              (!isHandwritten || (question.ocrStatus !== 'UNREADABLE' && question.ocrStatus !== 'FAILED')) && (
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

        {/* Modal for viewing handwritten scan */}
        <Dialog open={isScanModalOpen} onOpenChange={(open) => !open && handleCloseScan()}>
          <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
                <FileImage className="w-4 h-4 text-indigo-400" />
                Your Submitted Handwritten Scan — Question {index + 1}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto p-4 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center min-h-[300px]">
              {scanLoading && (
                <div className="flex flex-col items-center gap-2 text-xs text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                  <span>Loading original scan image...</span>
                </div>
              )}
              {scanError && (
                <div className="text-xs text-rose-400 text-center p-4">
                  {scanError}
                </div>
              )}
              {scanBlobUrl && !scanLoading && (
                <img
                  src={scanBlobUrl}
                  alt="Handwritten answer scan"
                  className="max-h-[70vh] max-w-full object-contain rounded shadow-lg"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
