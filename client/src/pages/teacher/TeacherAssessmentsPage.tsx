import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  useCourse,
  useCourseAssessments,
  useCreateAssessment,
  useReviewQueue,
  AssessmentListItem,
} from '@/api/hooks';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Plus,
  BookOpen,
  HelpCircle,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  CheckSquare,
  BarChart3,
  FileText,
} from 'lucide-react';

export const TeacherAssessmentsPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const { data: course, isLoading: courseLoading } = useCourse(courseId || '');
  const { data: assessments, isLoading: assessmentsLoading } = useCourseAssessments(courseId || '');
  const { data: reviewQueue } = useReviewQueue({ courseId: courseId || undefined, status: 'pending' });
  const pendingCount = reviewQueue?.total ?? 0;
  const createMutation = useCreateAssessment(courseId || '');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (trimmed.length < 3 || trimmed.length > 120) {
      setError('Title must be between 3 and 120 characters');
      return;
    }

    try {
      setError(null);
      const created = await createMutation.mutateAsync({ title: trimmed });
      setDialogOpen(false);
      setTitle('');
      navigate(`/teacher/assessments/${created.id}`);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to create assessment';
      setError(msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <Link to="/teacher">
            <Button variant="outline" size="sm" className="gap-1.5 border-slate-800 text-slate-300 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-100">Course Assessments</h1>
              {course && <Badge variant="default">{course.code}</Badge>}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {courseLoading ? 'Loading course details...' : course?.title || 'Manage exams, quizzes, and auto-grading'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link to={`/teacher/courses/${courseId}/analytics`}>
            <Button variant="outline" className="border-slate-800 text-slate-300 hover:text-white gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span>Analytics</span>
            </Button>
          </Link>

          <Link to={`/teacher/courses/${courseId}/review`}>
            <Button variant="outline" className="border-slate-800 text-slate-300 hover:text-white gap-2">
              <CheckSquare className="w-4 h-4 text-indigo-400" />
              <span>Review Queue</span>
              {pendingCount > 0 && (
                <Badge variant="default" className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.2">
                  {pendingCount}
                </Badge>
              )}
            </Button>
          </Link>

          {/* Create Assessment Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 shadow-lg shadow-indigo-600/20">
                <Plus className="w-4 h-4" />
                New Assessment
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                Create New Assessment
              </DialogTitle>
              <DialogDescription>
                Create a draft assessment for {course?.title || 'this course'}. You can add MCQ and short-answer questions before publishing.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreate} className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">
                  Assessment Title
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Normalization Quiz, Midterm Exam"
                  autoFocus
                  className="bg-slate-950 border-slate-800 text-slate-100"
                />
                <p className="text-[11px] text-slate-500">
                  3 to 120 characters. Starts in Draft status.
                </p>
              </div>

              {error && (
                <div className="p-3 text-xs rounded-md bg-red-950/50 border border-red-900/50 text-red-300">
                  {error}
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={createMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white"
                  disabled={createMutation.isPending || !title.trim()}
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Assessment'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Assessment List */}
      {assessmentsLoading ? (
        <div className="p-8 text-center text-sm text-slate-400 font-mono animate-pulse">
          Loading assessments...
        </div>
      ) : !assessments || assessments.length === 0 ? (
        <Card className="border-dashed border-slate-800 bg-slate-900/30">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-center text-indigo-400 mb-3">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-200">No assessments created yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">
              Get started by creating your first quiz or exam. You can author MCQs with auto-grading and short-answer rubrics.
            </p>
            <Button
              onClick={() => setDialogOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
            >
              <Plus className="w-4 h-4" />
              Create First Assessment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assessments.map((a: AssessmentListItem) => (
            <Card
              key={a.id}
              className="border-slate-800 bg-slate-900/70 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Badge
                    variant={a.published ? 'default' : 'outline'}
                    className={
                      a.published
                        ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60 hover:bg-emerald-900/80'
                        : 'bg-amber-950/40 text-amber-400 border-amber-800/50'
                    }
                  >
                    {a.published ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Published
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Draft
                      </span>
                    )}
                  </Badge>
                  <span className="text-[11px] font-mono text-slate-500">
                    ID: {a.id.slice(0, 8)}
                  </span>
                </div>
                <CardTitle className="text-base font-semibold text-slate-100 line-clamp-1">
                  {a.title}
                </CardTitle>
                <CardDescription className="text-xs text-slate-400 flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1 text-slate-300">
                    <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                    {a.questionCount} {a.questionCount === 1 ? 'Question' : 'Questions'}
                  </span>
                  <span className="flex items-center gap-1 text-slate-300">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    {a.submissionCount ?? 0} Submissions
                  </span>
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <Link to={`/teacher/assessments/${a.id}`} className="flex-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs border-slate-700 hover:border-indigo-500 hover:text-indigo-300 gap-1.5"
                  >
                    {a.published ? 'Builder & Key' : 'Author Questions'}
                    <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-70" />
                  </Button>
                </Link>
                <Link to={`/teacher/assessments/${a.id}/submissions`} className="flex-1">
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full text-xs bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Submissions ({a.submissionCount ?? 0})
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
