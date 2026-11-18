import React, { useState } from 'react';
import { PlusCircle, BookOpen, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AdminFeedback, type FeedbackState } from './AdminFeedback';
import type { Course } from '@/api/hooks';
import { useCreateCourse } from '@/api/hooks';

interface CourseCatalogTabProps {
  courses: Course[] | undefined;
  isLoading: boolean;
}

function extractApiError(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const resp = (err as { response?: { data?: { error?: string } } }).response;
    return resp?.data?.error || fallback;
  }
  return fallback;
}

export const CourseCatalogTab: React.FC<CourseCatalogTabProps> = ({ courses, isLoading }) => {
  const [form, setForm] = useState({
    code: '',
    title: '',
    description: '',
  });
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [search, setSearch] = useState('');

  const createCourse = useCreateCourse();

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const code = form.code.toUpperCase().trim();
    const title = form.title.trim();
    if (!code || !title) {
      setFeedback({ type: 'error', text: 'Course code and title are required.' });
      return;
    }

    try {
      await createCourse.mutateAsync({
        code,
        title,
        description: form.description.trim() || undefined,
      });
      setFeedback({
        type: 'success',
        text: `Successfully created course [${code}] ${title}!`,
      });
      setForm({ code: '', title: '', description: '' });
    } catch (err: unknown) {
      setFeedback({ type: 'error', text: extractApiError(err, 'Failed to create course') });
    }
  };

  const allCourses = courses ?? [];
  const filteredCourses = allCourses.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.code.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Create Course Form */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-sky-400" /> Create New Course
          </CardTitle>
          <CardDescription>Publish a course into the curriculum catalog</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateCourse} className="space-y-4">
            <AdminFeedback feedback={feedback} onDismiss={() => setFeedback(null)} />

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Course Code</label>
              <Input
                placeholder="e.g. CS401, MATH200"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                required
              />
              <p className="text-[10px] text-slate-500 font-mono">Unique alphanumeric course code</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Course Title</label>
              <Input
                placeholder="e.g. Machine Learning & Neural Networks"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Description (Optional)</label>
              <Textarea
                rows={3}
                placeholder="Course objectives, prerequisites, and syllabus summary..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <Button
              type="submit"
              className="w-full mt-2"
              disabled={createCourse.isPending}
            >
              {createCourse.isPending ? 'Publishing Course...' : 'Publish Course Offering'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Courses List */}
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-sky-400" /> Active Course Offerings
            </CardTitle>
            <CardDescription>
              {allCourses.length} active accredited academic courses
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <Input
              className="pl-8 text-xs h-8"
              placeholder="Search course code, title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading course catalog...</div>
          ) : filteredCourses.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              {allCourses.length === 0 ? 'No courses established yet.' : 'No courses match your search.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCourses.map((c) => (
                <div
                  key={c.id}
                  className="p-4 rounded-lg bg-slate-950/40 border border-border flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-sky-400 font-mono tracking-wider">
                        {c.code}
                      </span>
                      <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                        {c._count?.enrollments ?? 0} Enrolled
                      </span>
                    </div>
                    <h4 className="font-semibold text-slate-100 text-sm mt-1">{c.title}</h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {c.description || 'No course overview provided.'}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      Instructor:{' '}
                      {c.teacher
                        ? `${c.teacher.firstName} ${c.teacher.lastName}`
                        : 'System Faculty'}
                    </span>
                    <span>{c._count?.sessions ?? 0} Sessions</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
