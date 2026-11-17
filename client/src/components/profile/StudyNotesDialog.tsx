import React, { useState, useEffect } from 'react';
import {
  useGenerateStudyNotes,
  GeneratedStudyNotesResponse,
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  BookOpen,
  Sparkles,
  AlertTriangle,
  Lightbulb,
  Copy,
  Check,
  HelpCircle,
  BrainCircuit,
  ExternalLink,
  Video,
  FileText,
  Dumbbell,
} from 'lucide-react';

interface StudyNotesDialogProps {
  isOpen: boolean;
  studentId: string;
  courseId: string;
  conceptId?: string | null;
  conceptTitle?: string;
  onClose: () => void;
}

export const StudyNotesDialog: React.FC<StudyNotesDialogProps> = ({
  isOpen,
  studentId,
  courseId,
  conceptId,
  conceptTitle,
  onClose,
}) => {
  const notesMutation = useGenerateStudyNotes();
  const [notesData, setNotesData] = useState<GeneratedStudyNotesResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [revealedCheck, setRevealedCheck] = useState(false);

  useEffect(() => {
    if (isOpen && studentId && courseId) {
      setRevealedCheck(false);
      setCopied(false);
      notesMutation
        .mutateAsync({
          studentId,
          courseId,
          conceptId: conceptId || undefined,
        })
        .then((data) => setNotesData(data))
        .catch((err) => console.error('Failed to load study notes:', err));
    } else {
      setNotesData(null);
    }
  }, [isOpen, conceptId, courseId, studentId]);

  const handleCopyNotes = () => {
    if (!notesData) return;
    navigator.clipboard.writeText(notesData.markdownText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getResourceIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'VIDEO':
        return <Video className="w-3.5 h-3.5 text-rose-400" />;
      case 'EXERCISE':
        return <Dumbbell className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-indigo-400" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] flex flex-col bg-slate-900 border-slate-800 text-slate-100 p-6 shadow-2xl">
        <DialogHeader className="pb-3 border-b border-slate-800">
          <div className="flex items-center justify-between pr-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <BookOpen className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <span>High-Yield Revision & Short Notes</span>
                  <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/40 text-emerald-300 bg-emerald-500/10">
                    Personalized Cheat-Sheet
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  {conceptTitle || notesData?.conceptTitle || 'Tailored Study Notes & Resources'}
                </DialogDescription>
              </div>
            </div>

            {notesData && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyNotes}
                className="h-7 text-xs gap-1.5 border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Notes</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Dialog Content */}
        <div className="flex-1 overflow-y-auto py-2 space-y-5">
          {notesMutation.isPending ? (
            <div className="py-12 space-y-4">
              <div className="flex items-center justify-center gap-2 text-indigo-400 text-xs font-medium">
                <Sparkles className="w-4 h-4 animate-spin text-indigo-400" />
                <span>Synthesizing high-yield revision notes with Gemini 1.5 Flash...</span>
              </div>
              <Skeleton className="h-6 w-1/3 bg-slate-800 mx-auto" />
              <Skeleton className="h-20 w-full bg-slate-800" />
              <div className="space-y-2 pt-2">
                <Skeleton className="h-10 w-full bg-slate-800/60" />
                <Skeleton className="h-10 w-full bg-slate-800/60" />
                <Skeleton className="h-10 w-full bg-slate-800/60" />
              </div>
            </div>
          ) : notesData ? (
            <div className="space-y-4">
              {/* Top Meta Strip */}
              <div className="flex items-center justify-between text-xs p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Current Mastery:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {Math.round(notesData.currentMastery * 100)}%
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] py-0 px-1.5 border-indigo-500/40 text-indigo-300 bg-indigo-500/10 font-mono"
                  >
                    Targeted Tier: {notesData.difficultyBand}
                  </Badge>
                </div>

                <Badge variant="outline" className="text-[10px] py-0 text-slate-400 border-slate-700">
                  {notesData.source === 'gemini' ? 'Gemini 1.5 Flash Synthesized' : 'Curriculum Engine'}
                </Badge>
              </div>

              {/* 1. Executive Summary */}
              <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 space-y-1.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Executive Plain-English Summary</span>
                </h4>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {notesData.shortNotes.summary}
                </p>
              </div>

              {/* 2. Key Rules & Invariants */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <BrainCircuit className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Key Rules & Formal Invariants</span>
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {notesData.shortNotes.keyFormulas.map((rule, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-slate-900/60 p-2 rounded border border-slate-800/60">
                      <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 3. Common Exam Traps & Misconceptions */}
              <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Common Exam Traps & Avoidable Mistakes</span>
                </h4>
                <div className="space-y-1.5 text-xs text-slate-300">
                  {notesData.shortNotes.commonPitfalls.map((pitfall, idx) => (
                    <div key={idx} className="flex items-start gap-2 bg-slate-950/40 p-2 rounded border border-rose-500/20 text-slate-300">
                      <span className="text-rose-400 font-bold shrink-0">✕</span>
                      <span className="leading-relaxed">{pitfall}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Rule of Thumb & Quick Self-Check */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-950/30 space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-indigo-400" /> Rule of Thumb
                  </span>
                  <p className="text-xs text-indigo-100 font-medium italic leading-relaxed">
                    &ldquo;{notesData.shortNotes.ruleOfThumb}&rdquo;
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/80 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                    <HelpCircle className="w-3 h-3 text-slate-400" /> Quick Self-Check
                  </span>
                  <p className="text-xs text-slate-300 leading-snug">
                    {notesData.shortNotes.quickCheckQuestion.prompt}
                  </p>
                  {revealedCheck ? (
                    <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 animate-fadeIn">
                      <span className="font-bold">Answer:</span> {notesData.shortNotes.quickCheckQuestion.answer}
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setRevealedCheck(true)}
                      className="h-6 text-[10px] text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 px-2"
                    >
                      Reveal Answer
                    </Button>
                  )}
                </div>
              </div>

              {/* 5. Recommended Study Materials */}
              {notesData.recommendedMaterials.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Suggested Study Materials for Your Level ({notesData.difficultyBand})</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {notesData.recommendedMaterials.map((res) => (
                      <a
                        key={res.id}
                        href={res.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/60 transition-all flex items-center justify-between text-xs gap-2 group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {getResourceIcon(res.type)}
                          <div className="min-w-0">
                            <p className="font-medium text-slate-200 truncate group-hover:text-indigo-300">
                              {res.title}
                            </p>
                            <span className="text-[10px] text-slate-500 uppercase font-mono">
                              {res.type} • {res.difficulty}
                            </span>
                          </div>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};
