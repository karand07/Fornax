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
    <Card className="border border-slate-200 bg-white shadow-xs transition-colors">
      {/* Title Row */}
      <CardHeader className="pb-3 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-7 h-7 rounded-md bg-slate-100 border border-slate-200 text-xs font-mono font-bold flex items-center justify-center text-slate-900">
              {index + 1}
            </span>
            <span className="text-xs font-bold text-slate-900">
              Question {index + 1}
            </span>
            <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700 text-xs font-medium">
              {question.conceptName || 'General'}
            </Badge>
            <Badge variant="secondary" className="text-[11px] font-mono font-semibold">
              {question.type}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-mono font-medium">Marks:</span>
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

        <CardTitle className="text-sm md:text-base font-bold text-slate-900 mt-2.5 leading-relaxed font-sans">
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
                className="flex items-center gap-2 p-2.5 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800 font-medium"
                role="status"
              >
                <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
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

                let cardClasses = 'border-slate-200 bg-slate-50/60 text-slate-800';
                let icon = null;
                let statusLabel: React.ReactNode = null;

                if (isStudentChoice && isCorrectOption) {
                  // Student choice and correct
                  cardClasses = 'border-emerald-400 bg-emerald-50 text-emerald-950 shadow-xs';
                  icon = <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />;
                  statusLabel = (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 border border-emerald-200 px-2 py-0.5 rounded">
                      Correct
                      <span className="sr-only">(Your answer, correct)</span>
                    </span>
                  );
                } else if (isStudentChoice && !isCorrectOption) {
                  // Student choice and incorrect
                  cardClasses = 'border-rose-300 bg-rose-50 text-rose-950 shadow-xs';
                  icon = <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />;
                  statusLabel = (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-100/80 border border-rose-200 px-2 py-0.5 rounded">
                      Incorrect
                      <span className="sr-only">(Your answer, incorrect)</span>
                    </span>
                  );
                } else if (isCorrectOption && studentWasWrong) {
                  // The correct option when student answered wrong
                  cardClasses = 'border-emerald-300 border-dashed bg-emerald-50/50 text-emerald-950';
                  icon = <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />;
                  statusLabel = (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-100/60 border border-emerald-200 px-2 py-0.5 rounded">
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
                      <span className="w-5 h-5 rounded-full bg-white border border-slate-300 text-[11px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5 text-slate-700 shadow-2xs">
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span className="text-xs md:text-sm leading-relaxed break-words font-medium">
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
              <div className="mt-3 p-3.5 rounded-lg bg-indigo-50/50 border border-indigo-100 text-xs space-y-1.5">
                <div className="font-bold text-indigo-700 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Why</span>
                </div>
                <p className="text-slate-700 font-medium leading-relaxed pl-5 font-sans">
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
              <Alert variant="destructive" className="border-amber-200 bg-amber-50 text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <AlertTitle className="font-bold text-xs">Handwriting Unreadable</AlertTitle>
                <AlertDescription className="text-xs text-amber-800 mt-1">
                  Your handwriting could not be read clearly. Your teacher will review your scan directly.
                </AlertDescription>
              </Alert>
            )}

            {isHandwritten && question.ocrStatus === 'FAILED' && (
              <Alert variant="destructive" className="border-rose-200 bg-rose-50 text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <AlertTitle className="font-bold text-xs">Transcription Failed</AlertTitle>
                <AlertDescription className="text-xs text-rose-800 mt-1">
                  Transcription could not be completed. Your teacher will review your scan directly.
                </AlertDescription>
              </Alert>
            )}

            {/* Answer Display */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-bold text-slate-700">
                  {isHandwritten ? 'AI Transcript of Your Handwriting:' : 'Your Submitted Answer:'}
                </div>
                {isHandwritten && question.submissionId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenScan}
                    className="h-7 text-xs gap-1.5 border-slate-300 hover:border-indigo-400 text-slate-700 hover:bg-slate-50 font-semibold"
                  >
                    <FileImage className="w-3.5 h-3.5 text-indigo-600" />
                    View my scan
                  </Button>
                )}
              </div>

              <blockquote className="border-l-2 border-indigo-500 bg-slate-50 p-3 rounded-r-md text-xs md:text-sm text-slate-900 font-mono whitespace-pre-wrap leading-relaxed border border-slate-200">
                {typeof question.studentAnswer === 'string' && question.studentAnswer.trim().length > 0
                  ? `"${question.studentAnswer}"`
                  : isHandwritten
                  ? 'No transcribed text available.'
                  : 'No answer submitted'}
              </blockquote>

              {isHandwritten && (
                <p className="text-[11px] text-slate-500 italic font-medium">
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
                    className="gap-1 border-amber-200 bg-amber-50 text-amber-700 font-semibold px-2.5 py-0.5"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Pending grading
                  </Badge>
                  <span className="text-xs text-slate-600 font-medium">
                    Your response is waiting for grading. Marks will update once evaluated.
                  </span>
                </div>
              )}

            {/* Slot for Day 9 GradeCard */}
            {renderGrade && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                {renderGrade(question)}
              </div>
            )}
          </div>
        )}

        {/* Modal for viewing handwritten scan */}
        <Dialog open={isScanModalOpen} onOpenChange={(open) => !open && handleCloseScan()}>
          <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col bg-white border-slate-200 text-slate-900 shadow-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <FileImage className="w-4 h-4 text-indigo-600" />
                Your Submitted Handwritten Scan — Question {index + 1}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center min-h-[300px]">
              {scanLoading && (
                <div className="flex flex-col items-center gap-2 text-xs text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                  <span>Loading original scan image...</span>
                </div>
              )}
              {scanError && (
                <div className="text-xs text-rose-600 font-medium text-center p-4">
                  {scanError}
                </div>
              )}
              {scanBlobUrl && !scanLoading && (
                <img
                  src={scanBlobUrl}
                  alt="Handwritten answer scan"
                  className="max-h-[70vh] max-w-full object-contain rounded shadow-sm border border-slate-200"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
