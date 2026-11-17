import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  useAssessment,
  useConcepts,
  useAddQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
  usePublishAssessment,
  Question,
  RubricCriterion,
} from '@/api/hooks';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  Plus,
  Trash2,
  Edit2,
  Lock,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';

export const AssessmentBuilderPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();

  const { data: assessment, isLoading, refetch } = useAssessment(assessmentId || '');
  const { data: concepts } = useConcepts(assessment?.courseId);

  const addQuestionMutation = useAddQuestion(assessmentId || '');
  const updateQuestionMutation = useUpdateQuestion(assessmentId || '');
  const deleteQuestionMutation = useDeleteQuestion(assessmentId || '');
  const publishMutation = usePublishAssessment(assessmentId || '');

  // Dialog State
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  // Form State
  const [type, setType] = useState<'MCQ' | 'SHORT' | 'HANDWRITTEN'>('MCQ');
  const [conceptId, setConceptId] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');
  const [maxMarks, setMaxMarks] = useState<number>(1);
  const [modelAnswer, setModelAnswer] = useState<string>('');

  // MCQ state
  const [options, setOptions] = useState<string[]>(['', '']);
  const [correctIndex, setCorrectIndex] = useState<number>(0);

  // SHORT state (rubrics)
  const [rubric, setRubric] = useState<{ description: string; marks: number }[]>([
    { description: '', marks: 1 },
  ]);

  const [formError, setFormError] = useState<string | null>(null);

  // Publish Dialog State
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  // Open Add Dialog
  const handleOpenAdd = () => {
    setEditingQuestionId(null);
    setType('MCQ');
    setConceptId(concepts && concepts.length > 0 ? concepts[0].id : '');
    setPrompt('');
    setMaxMarks(2);
    setModelAnswer('');
    setOptions(['Option A', 'Option B']);
    setCorrectIndex(0);
    setRubric([{ description: 'Core idea', marks: 2 }]);
    setFormError(null);
    setIsQuestionDialogOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (q: Question) => {
    setEditingQuestionId(q.id);
    setType(q.type);
    setConceptId(q.conceptId);
    setPrompt(q.prompt);
    setMaxMarks(q.maxMarks);
    setModelAnswer(q.modelAnswer || '');

    if (q.type === 'MCQ') {
      const opts = (q.options as string[]) || ['', ''];
      setOptions(opts);
      setCorrectIndex(q.correctIndex ?? 0);
    } else {
      const criteria = q.rubrics || q.rubricCriteria;
      const rbs = criteria?.map((r: RubricCriterion) => ({
        description: r.description,
        marks: r.marks || 0,
      })) || [{ description: '', marks: q.maxMarks }];
      setRubric(rbs);
    }

    setFormError(null);
    setIsQuestionDialogOpen(true);
  };

  // Dynamic MCQ Options
  const handleAddOption = () => {
    if (options.length < 6) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (idx: number) => {
    if (options.length > 2) {
      const updated = options.filter((_, i) => i !== idx);
      setOptions(updated);
      if (correctIndex >= updated.length) {
        setCorrectIndex(updated.length - 1);
      }
    }
  };

  const handleOptionChange = (idx: number, val: string) => {
    const updated = [...options];
    updated[idx] = val;
    setOptions(updated);
  };

  // Dynamic Rubric Items
  const handleAddRubric = () => {
    if (rubric.length < 8) {
      setRubric([...rubric, { description: '', marks: 1 }]);
    }
  };

  const handleRemoveRubric = (idx: number) => {
    if (rubric.length > 1) {
      setRubric(rubric.filter((_, i) => i !== idx));
    }
  };

  const handleRubricChange = (idx: number, field: 'description' | 'marks', val: any) => {
    const updated = [...rubric];
    updated[idx] = { ...updated[idx], [field]: val };
    setRubric(updated);
  };

  // Calculate rubric total
  const rubricTotal = rubric.reduce((sum, r) => sum + (Number(r.marks) || 0), 0);
  const isRubricSumValid =
    type === 'MCQ' || Math.abs(rubricTotal - Number(maxMarks)) < 0.001;

  // Save Question
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!conceptId) {
      setFormError('Please select a course concept.');
      return;
    }

    if (!prompt.trim()) {
      setFormError('Question prompt cannot be empty.');
      return;
    }

    const marksNum = Number(maxMarks);
    if (isNaN(marksNum) || marksNum <= 0 || marksNum > 100) {
      setFormError('Max marks must be between 1 and 100.');
      return;
    }

    if (type === 'MCQ') {
      if (options.length < 2 || options.length > 6) {
        setFormError('MCQ must have between 2 and 6 options.');
        return;
      }
      for (const opt of options) {
        if (!opt.trim()) {
          setFormError('All options must be non-empty.');
          return;
        }
      }
      const unique = new Set(options.map((o) => o.trim()));
      if (unique.size !== options.length) {
        setFormError('Options must all be unique.');
        return;
      }
      if (correctIndex < 0 || correctIndex >= options.length) {
        setFormError('Invalid correct option selected.');
        return;
      }
    } else if (type === 'SHORT' || type === 'HANDWRITTEN') {
      if (!modelAnswer.trim()) {
        setFormError('Model answer is required for SHORT and HANDWRITTEN questions.');
        return;
      }
      if (rubric.length < 1 || rubric.length > 8) {
        setFormError('Rubric must have between 1 and 8 criteria.');
        return;
      }
      for (const r of rubric) {
        if (!r.description.trim()) {
          setFormError('All rubric criteria must have a description.');
          return;
        }
        if (Number(r.marks) <= 0) {
          setFormError('Rubric marks must be greater than 0.');
          return;
        }
      }
      if (!isRubricSumValid) {
        setFormError(
          `Rubric marks sum (${rubricTotal}) must equal max marks (${marksNum}).`
        );
        return;
      }
    }

    try {
      const payload: any = {
        type,
        conceptId,
        prompt: prompt.trim(),
        maxMarks: marksNum,
        modelAnswer: modelAnswer.trim() || undefined,
      };

      if (type === 'MCQ') {
        payload.options = options.map((o) => o.trim());
        payload.correctIndex = correctIndex;
      } else {
        payload.rubric = rubric.map((r) => ({
          description: r.description.trim(),
          marks: Number(r.marks),
        }));
      }

      if (editingQuestionId) {
        await updateQuestionMutation.mutateAsync({
          questionId: editingQuestionId,
          data: payload,
        });
      } else {
        await addQuestionMutation.mutateAsync(payload);
      }

      setIsQuestionDialogOpen(false);
      refetch();
    } catch (err: any) {
      setFormError(
        err.response?.data?.error || err.message || 'Failed to save question'
      );
    }
  };

  // Delete Question
  const handleDelete = async (questionId: string) => {
    if (confirm('Are you sure you want to delete this question?')) {
      try {
        await deleteQuestionMutation.mutateAsync(questionId);
        refetch();
      } catch (err: any) {
        alert(err.response?.data?.error || 'Failed to delete question');
      }
    }
  };

  // Publish
  const handlePublish = async () => {
    try {
      setPublishError(null);
      await publishMutation.mutateAsync();
      setIsPublishDialogOpen(false);
      refetch();
    } catch (err: any) {
      setPublishError(err.response?.data?.error || 'Failed to publish assessment');
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-sm text-slate-400 font-mono animate-pulse">
        Loading assessment builder...
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="p-8 text-center text-sm text-red-400">
        Assessment not found.
      </div>
    );
  }

  const isPublished = Boolean(assessment.published);
  const questions = assessment.questions || [];
  const totalAssessmentMarks = questions.reduce(
    (sum: number, q: Question) => sum + q.maxMarks,
    0
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <Link to={`/teacher/courses/${assessment.courseId}/assessments`}>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-slate-800 text-slate-300 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              All Assessments
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-100">{assessment.title}</h1>
              <Badge
                variant={isPublished ? 'default' : 'outline'}
                className={
                  isPublished
                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60'
                    : 'bg-amber-950/40 text-amber-400 border-amber-800/50'
                }
              >
                {isPublished ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Published
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Draft
                  </span>
                )}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {questions.length} Questions • {totalAssessmentMarks} Total Marks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isPublished && (
            <>
              <Button
                onClick={handleOpenAdd}
                variant="outline"
                className="gap-1.5 border-slate-700 text-slate-200 hover:border-indigo-500 hover:text-indigo-400"
              >
                <Plus className="w-4 h-4" />
                Add Question
              </Button>
              <Button
                onClick={() => {
                  setPublishError(null);
                  setIsPublishDialogOpen(true);
                }}
                disabled={questions.length === 0}
                className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 shadow-lg shadow-emerald-600/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                Publish Assessment
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Lock Banner if published */}
      {isPublished && (
        <Alert variant="info" className="border-emerald-900/60 bg-emerald-950/30">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <AlertTitle className="text-emerald-300 font-semibold">
            Assessment is Published & Locked
          </AlertTitle>
          <AlertDescription className="text-emerald-400/90 text-xs mt-1">
            This assessment is live for enrolled students. To preserve academic integrity and prevent grading discrepancies, questions can no longer be edited or deleted.
          </AlertDescription>
        </Alert>
      )}

      {/* Questions List */}
      <div className="space-y-4">
        {questions.length === 0 ? (
          <Card className="border-dashed border-slate-800 bg-slate-900/30">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-center text-indigo-400 mb-3">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-200">
                No questions added yet
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">
                Add multiple choice questions (with instant auto-grading) or short-answer questions (with structured rubrics).
              </p>
              <Button
                onClick={handleOpenAdd}
                className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Question
              </Button>
            </CardContent>
          </Card>
        ) : (
          questions.map((q: Question, idx: number) => {
            const concept = concepts?.find((c) => c.id === q.conceptId);
            return (
              <Card
                key={q.id}
                className="border-slate-800 bg-slate-900/80 shadow-md transition-all"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono flex items-center justify-center font-bold">
                        {idx + 1}
                      </span>
                      <Badge
                        variant="default"
                        className={
                          q.type === 'MCQ'
                            ? 'bg-blue-950/80 text-blue-300 border-blue-800/60'
                            : 'bg-purple-950/80 text-purple-300 border-purple-800/60'
                        }
                      >
                        {q.type}
                      </Badge>
                      {concept && (
                        <Badge
                          variant="outline"
                          className="border-slate-700 text-slate-400 gap-1 text-[11px]"
                        >
                          <Layers className="w-3 h-3 text-indigo-400" />
                          {concept.title}
                        </Badge>
                      )}
                      <span className="text-xs font-semibold text-slate-300 ml-auto">
                        {q.maxMarks} {q.maxMarks === 1 ? 'Mark' : 'Marks'}
                      </span>
                    </div>

                    {!isPublished && (
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEdit(q)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(q.id)}
                          className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-950/50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <CardTitle className="text-sm font-medium text-slate-200 mt-2 font-mono whitespace-pre-wrap leading-relaxed">
                    {q.prompt}
                  </CardTitle>
                </CardHeader>

                <CardContent className="pt-0 space-y-3">
                  {/* MCQ Options Display */}
                  {q.type === 'MCQ' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      {((q.options as string[]) || []).map((opt, optIdx) => {
                        const isCorrect = optIdx === q.correctIndex;
                        return (
                          <div
                            key={optIdx}
                            className={`p-2.5 rounded-md border text-xs flex items-center justify-between gap-2 ${
                              isCorrect
                                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200 font-medium'
                                : 'bg-slate-950/60 border-slate-800 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-4 h-4 rounded-full bg-slate-800 text-[10px] flex items-center justify-center text-slate-400 font-mono">
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span>{opt}</span>
                            </div>
                            {isCorrect && (
                              <Badge className="bg-emerald-900/60 text-emerald-400 border-none text-[10px] px-1.5 py-0">
                                Correct Answer
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* SHORT / HANDWRITTEN Rubrics Display */}
                  {(q.type === 'SHORT' || q.type === 'HANDWRITTEN') && (
                    <div className="space-y-2 mt-2">
                      <div className="text-xs font-semibold text-slate-400">
                        Grading Rubric Criteria:
                      </div>
                      <div className="space-y-1.5">
                        {(q.rubrics || q.rubricCriteria)?.map((r: RubricCriterion, rIdx: number) => (
                          <div
                            key={rIdx}
                            className="flex items-center justify-between p-2 rounded-md bg-slate-950/60 border border-slate-800 text-xs"
                          >
                            <span className="text-slate-300">{r.description}</span>
                            <Badge
                              variant="outline"
                              className="border-slate-700 text-indigo-400 font-mono text-[11px]"
                            >
                              {r.marks} pts
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Model Answer / Explanation */}
                  {q.modelAnswer && (
                    <div className="p-2.5 rounded-md bg-slate-950/80 border border-slate-800/80 text-xs text-slate-400 flex items-start gap-2">
                      <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-300">
                          {q.type === 'MCQ' ? 'Answer Explanation:' : 'Model Answer:'}{' '}
                        </span>
                        {q.modelAnswer}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Add / Edit Question Dialog */}
      <Dialog open={isQuestionDialogOpen} onOpenChange={setIsQuestionDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              {editingQuestionId ? 'Edit Question' : 'Add Question'}
            </DialogTitle>
            <DialogDescription>
              Author question details, assign it to a course concept, and configure auto-grading or rubrics.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveQuestion} className="space-y-4 py-2">
            {/* Question Type & Concept */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Question Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('MCQ')}
                    className={`py-2 px-3 text-xs font-medium rounded-md border text-center transition-all ${
                      type === 'MCQ'
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    MCQ
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('SHORT')}
                    className={`py-2 px-3 text-xs font-medium rounded-md border text-center transition-all ${
                      type === 'SHORT'
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    SHORT
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('HANDWRITTEN')}
                    className={`py-2 px-3 text-xs font-medium rounded-md border text-center transition-all ${
                      type === 'HANDWRITTEN'
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Handwritten
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Associated Concept
                </label>
                <select
                  value={conceptId}
                  onChange={(e) => setConceptId(e.target.value)}
                  className="w-full h-10 px-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="" disabled>
                    Select course concept...
                  </option>
                  {concepts?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Prompt & Max Marks */}
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-3 space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Question Prompt
                </label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Which normal form addresses partial dependency?"
                  rows={3}
                  className="bg-slate-950 border-slate-800 text-slate-100 text-xs font-mono"
                />
              </div>

              <div className="col-span-1 space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Max Marks
                </label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  step={0.5}
                  value={maxMarks}
                  onChange={(e) => setMaxMarks(parseFloat(e.target.value) || 0)}
                  className="bg-slate-950 border-slate-800 text-slate-100 text-xs font-mono"
                />
              </div>
            </div>

            {/* MCQ Specific Fields */}
            {type === 'MCQ' && (
              <div className="space-y-3 border-t border-slate-800 pt-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Options (2 to 6) & Correct Answer
                  </label>
                  {options.length < 6 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={handleAddOption}
                      className="text-indigo-400 hover:text-indigo-300 text-xs gap-1 h-7"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Option
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  {options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correctIndex"
                        checked={correctIndex === idx}
                        onChange={() => setCorrectIndex(idx)}
                        className="h-4 w-4 text-indigo-600 bg-slate-950 border-slate-800 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                        title="Mark as correct answer"
                      />
                      <Input
                        value={opt}
                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                        className="bg-slate-950 border-slate-800 text-slate-100 text-xs flex-1"
                      />
                      {options.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveOption(idx)}
                          className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-950/50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Answer Explanation (Optional, revealed after grading)
                  </label>
                  <Textarea
                    value={modelAnswer}
                    onChange={(e) => setModelAnswer(e.target.value)}
                    placeholder="Provide context explaining why the option is correct..."
                    rows={2}
                    className="bg-slate-950 border-slate-800 text-slate-100 text-xs"
                  />
                </div>
              </div>
            )}

            {/* SHORT / HANDWRITTEN Question Specific Fields */}
            {(type === 'SHORT' || type === 'HANDWRITTEN') && (
              <div className="space-y-3 border-t border-slate-800 pt-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Model Answer (Required)
                  </label>
                  <Textarea
                    value={modelAnswer}
                    onChange={(e) => setModelAnswer(e.target.value)}
                    placeholder="Provide an exemplary answer key for this question..."
                    rows={3}
                    className="bg-slate-950 border-slate-800 text-slate-100 text-xs font-mono"
                  />
                </div>

                {/* Rubric Criteria with Live Sum Validator */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-300">
                        Rubric Criteria (1 to 8)
                      </span>
                      <div className="mt-0.5">
                        <span
                          className={`text-xs font-mono font-bold ${
                            isRubricSumValid
                              ? 'text-emerald-400'
                              : 'text-red-400'
                          }`}
                        >
                          Rubric total: {rubricTotal} / {maxMarks} maxMarks
                        </span>
                        {!isRubricSumValid && (
                          <span className="text-[11px] text-red-400 ml-2">
                            (Must sum exactly to {maxMarks})
                          </span>
                        )}
                      </div>
                    </div>

                    {rubric.length < 8 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={handleAddRubric}
                        className="text-indigo-400 hover:text-indigo-300 text-xs gap-1 h-7"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Criterion
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {rubric.map((r, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          value={r.description}
                          onChange={(e) =>
                            handleRubricChange(idx, 'description', e.target.value)
                          }
                          placeholder={`Criterion description ${idx + 1}`}
                          className="bg-slate-950 border-slate-800 text-slate-100 text-xs flex-1"
                        />
                        <Input
                          type="number"
                          min={0.1}
                          step={0.5}
                          value={r.marks}
                          onChange={(e) =>
                            handleRubricChange(
                              idx,
                              'marks',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          placeholder="Marks"
                          className="w-20 bg-slate-950 border-slate-800 text-slate-100 text-xs font-mono"
                        />
                        {rubric.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveRubric(idx)}
                            className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-950/50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {formError && (
              <div className="p-3 text-xs rounded-md bg-red-950/50 border border-red-900/50 text-red-300">
                {formError}
              </div>
            )}

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsQuestionDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  !isRubricSumValid ||
                  addQuestionMutation.isPending ||
                  updateQuestionMutation.isPending
                }
                className="bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                {addQuestionMutation.isPending || updateQuestionMutation.isPending
                  ? 'Saving...'
                  : 'Save Question'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Publish Confirmation Dialog */}
      <Dialog open={isPublishDialogOpen} onOpenChange={setIsPublishDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Publish Assessment?
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <p>
                Publishing makes this assessment immediately accessible to all enrolled students.
              </p>
              <p className="font-semibold text-slate-200">
                Warning: Once published, questions are permanently locked and cannot be edited or deleted.
              </p>
            </DialogDescription>
          </DialogHeader>

          {publishError && (
            <div className="p-3 text-xs rounded-md bg-red-950/50 border border-red-900/50 text-red-300">
              {publishError}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setIsPublishDialogOpen(false)}
              disabled={publishMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePublish}
              disabled={publishMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
            >
              {publishMutation.isPending ? 'Publishing...' : 'Yes, Publish Assessment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
