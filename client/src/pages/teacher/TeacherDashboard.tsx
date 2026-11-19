import React, { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth-context';
import { useCourses, useCourse, useCreateCourse, useCreateAttendanceSession, useReviewQueue, useCourseAnalytics } from '@/api/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ConceptResourceViewer } from '@/components/ConceptResourceViewer';
import { CourseRosterDialog } from '@/components/teacher/CourseRosterDialog';
import {
  Users,
  QrCode,
  PlusCircle,
  BookOpen,
  CheckCircle,
  Layers,
  Radio,
  HelpCircle,
  BarChart3,
  CheckSquare,
  ExternalLink,
  Library,
  AlertTriangle,
  AlertCircle,
  Clock,
  ArrowLeft,
} from 'lucide-react';

export const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: courses } = useCourses();
  const { data: reviewQueueData } = useReviewQueue({ status: 'pending' });
  const pendingCount = reviewQueueData?.total ?? 0;

  const createCourseMutation = useCreateCourse();
  const createSessionMutation = useCreateAttendanceSession();

  const primaryCourseId = courses && courses.length > 0 ? courses[0].id : undefined;
  const { data: courseDetails } = useCourse(primaryCourseId || '');
  const { data: primaryAnalytics } = useCourseAnalytics(primaryCourseId);
  const atRiskStudents = primaryAnalytics?.atRisk ?? [];
  const atRiskTotal = atRiskStudents.length;
  const criticalCount = atRiskStudents.filter((s) => s.level === 'AT_RISK').length;
  const watchCount = atRiskStudents.filter((s) => s.level === 'WATCH').length;

  const sessionTurnoutMap = useMemo(() => {
    const map = new Map<string, { present: number; flagged: number; absent: number }>();
    if (primaryAnalytics?.sessions) {
      for (const s of primaryAnalytics.sessions) {
        map.set(s.id, { present: s.present, flagged: s.flagged, absent: s.absent });
      }
    }
    return map;
  }, [primaryAnalytics]);

  const recentSessions = useMemo(() => {
    return courseDetails?.sessions?.slice(0, 3) ?? [];
  }, [courseDetails]);

  const [searchParams, setSearchParams] = useSearchParams();
  const isCurriculumTab = searchParams.get('tab') === 'curriculum';

  // Create course form state
  const [courseCode, setCourseCode] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');

  // Course Roster Modal state
  const [rosterCourse, setRosterCourse] = useState<{
    id: string;
    code: string;
    title: string;
  } | null>(null);

  // Live session generation state
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [sessionTitle, setSessionTitle] = useState('');

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    await createCourseMutation.mutateAsync({
      code: courseCode,
      title: courseTitle,
      description: courseDesc,
    });
    setCourseCode('');
    setCourseTitle('');
    setCourseDesc('');
  };

  const handleLaunchSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) return;

    const session = await createSessionMutation.mutateAsync({
      courseId: selectedCourseId,
      title: sessionTitle || 'Lecture Attendance',
    });

    navigate(`/teacher/live-attendance/${session.id}`);
  };

  const totalEnrollments = courses?.reduce((sum, c) => sum + (c._count?.enrollments || 0), 0) ?? 0;
  const totalAssessments = courses?.reduce((sum, c) => sum + (c._count?.assessments || 0), 0) ?? 0;

  // Render Curriculum view when ?tab=curriculum is requested
  if (isCurriculumTab) {
    const activeCourseId = searchParams.get('courseId') || (courses && courses.length > 0 ? courses[0].id : undefined);

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchParams({})}
              className="text-xs gap-1.5 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-medium shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                Curriculum & Concepts
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Explore course prerequisite graphs, learning resources, and conceptual hierarchy.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="curriculum-course-selector" className="text-xs font-semibold text-slate-700 whitespace-nowrap">
              Course:
            </label>
            <select
              id="curriculum-course-selector"
              value={activeCourseId || ''}
              onChange={(e) => setSearchParams({ tab: 'curriculum', courseId: e.target.value })}
              className="text-xs rounded-md bg-white border border-slate-300 text-slate-900 px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer max-w-[280px] truncate shadow-xs"
            >
              {courses && courses.length > 0 ? (
                courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} – {c.title}
                  </option>
                ))
              ) : (
                <option value="">No courses available</option>
              )}
            </select>
          </div>
        </div>
        <ConceptResourceViewer
          courseId={activeCourseId}
          onCourseChange={(newCourseId) => setSearchParams({ tab: 'curriculum', courseId: newCourseId })}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Instructor Dashboard
            </h1>
            <Badge variant="outline" className="text-xs font-mono border-blue-200 text-blue-700 bg-blue-50 font-semibold">
              Prof. {user?.lastName}
            </Badge>
          </div>
          <p className="mt-1 text-xs md:text-sm text-slate-600 font-medium">
            Overview of department courses, live attendance sessions, student mastery, and grading queues.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            size="sm"
            onClick={() => navigate('/teacher/live-attendance')}
            className="text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white gap-2 shadow-xs hover:shadow-sm transition-all active:scale-[0.99]"
          >
            <Radio className="w-4 h-4 text-emerald-300 animate-pulse" />
            Live Attendance Console
          </Button>
        </div>
      </div>

      {/* Standard 5-Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="p-4 border-slate-200 bg-white shadow-xs hover:shadow-sm transition-all rounded-xl">
          <div className="text-xs text-slate-500 flex items-center gap-1.5 font-semibold">
            <span className="p-1 rounded-md bg-blue-50 text-blue-600"><Library className="w-3.5 h-3.5" /></span>
            Active Courses
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900 mt-2">
            {courses?.length ?? 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Faculty managed</p>
        </Card>

        <Card className="p-4 border-slate-200 bg-white shadow-xs hover:shadow-sm transition-all rounded-xl">
          <div className="text-xs text-slate-500 flex items-center gap-1.5 font-semibold">
            <span className="p-1 rounded-md bg-emerald-50 text-emerald-600"><Users className="w-3.5 h-3.5" /></span>
            Enrolled Students
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900 mt-2">
            {totalEnrollments}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Across all cohorts</p>
        </Card>

        <Card className="p-4 border-slate-200 bg-white shadow-xs hover:shadow-sm transition-all rounded-xl">
          <div className="text-xs text-slate-500 flex items-center gap-1.5 font-semibold">
            <span className="p-1 rounded-md bg-indigo-50 text-indigo-600"><HelpCircle className="w-3.5 h-3.5" /></span>
            Assessments
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900 mt-2">
            {totalAssessments}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Quizzes & exams</p>
        </Card>

        <Card
          className="p-4 border-amber-200 bg-white shadow-xs hover:shadow-sm hover:border-amber-400 cursor-pointer transition-all rounded-xl"
          onClick={() => navigate('/teacher/courses/all/review')}
        >
          <div className="text-xs text-amber-700 flex items-center gap-1.5 font-semibold">
            <span className="p-1 rounded-md bg-amber-50 text-amber-600"><CheckSquare className="w-3.5 h-3.5" /></span>
            Pending Reviews
          </div>
          <div className="text-2xl font-extrabold font-mono text-amber-600 mt-2 flex items-center justify-between">
            <span>{pendingCount}</span>
            <ExternalLink className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Requires verification</p>
        </Card>

        <Card
          className="p-4 border-rose-200 bg-white shadow-xs hover:shadow-sm hover:border-rose-400 cursor-pointer transition-all rounded-xl"
          onClick={() => navigate('/teacher/analytics')}
        >
          <div className="text-xs text-rose-700 flex items-center gap-1.5 font-semibold">
            <span className="p-1 rounded-md bg-rose-50 text-rose-600"><AlertCircle className="w-3.5 h-3.5" /></span>
            Needs Support
          </div>
          <div className="text-2xl font-extrabold font-mono text-rose-600 mt-2 flex items-center justify-between">
            <span>{atRiskTotal}</span>
            <ExternalLink className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {criticalCount > 0 ? `${criticalCount} critical, ${watchCount} watch` : 'Attendance & mastery'}
          </p>
        </Card>
      </div>

      {/* Pending Reviews Card with Priority Preview */}
      {pendingCount > 0 && (
        <Card className="border-amber-200 bg-amber-50/60 shadow-xs rounded-xl overflow-hidden">
          <CardHeader className="p-4 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-xs">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                  <span>Submissions Pending Manual Review</span>
                  <Badge className="bg-amber-600 text-white font-bold text-[10px] px-1.5 py-0 shadow-xs">
                    {pendingCount}
                  </Badge>
                </h3>
                <p className="text-xs text-amber-800/90 font-medium">
                  AI-evaluated short answers with low confidence scores, handwritten answer scans, or rubric flags.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => navigate('/teacher/courses/all/review')}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs gap-1.5 shrink-0 shadow-xs"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              Review Queue ({pendingCount})
            </Button>
          </CardHeader>

          {/* Quick Preview of Top 3 Queue Items */}
          {reviewQueueData?.items && reviewQueueData.items.length > 0 && (
            <CardContent className="px-4 pb-4 pt-0">
              <div className="border-t border-amber-200/80 pt-3 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-amber-800 font-semibold px-1">
                  <span>Priority Queue Preview</span>
                  <span className="text-slate-500 text-[10px] font-normal">Click any item to jump straight into grading</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  {reviewQueueData.items.slice(0, 3).map((item) => (
                    <div
                      key={item.submissionId}
                      onClick={() => navigate(`/teacher/review/${item.submissionId}`)}
                      className="p-3 rounded-lg border border-amber-200 bg-white hover:border-amber-400 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between gap-2.5 group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-slate-900 group-hover:text-amber-700 transition-colors truncate">
                            {item.studentName}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1 py-0 border-amber-300 text-amber-800 bg-amber-50 font-mono font-semibold"
                          >
                            {item.reasons?.[0] || 'NEEDS REVIEW'}
                          </Badge>
                        </div>
                        <p className="text-[11px] font-medium text-slate-700 line-clamp-1">
                          {item.assessmentTitle}
                        </p>
                        <p className="text-[10px] text-slate-500 line-clamp-2 italic">
                          "{item.questionPrompt}"
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[10px]">
                        <span className="text-slate-500 font-mono font-medium">Max: {item.maxMarks} pts</span>
                        <span className="text-amber-700 font-semibold flex items-center gap-0.5 group-hover:underline">
                          Grade Submission &rarr;
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Academic Intervention Alert Banner */}
      {atRiskTotal > 0 && (
        <Card className="border-rose-200 bg-rose-50/60 shadow-xs rounded-xl overflow-hidden">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 shadow-xs">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-rose-950 flex items-center gap-2">
                  <span>Academic Intervention Required</span>
                  <Badge className="bg-rose-600 text-white font-bold text-[10px] px-1.5 py-0 shadow-xs">
                    {atRiskTotal} {atRiskTotal === 1 ? 'Student' : 'Students'}
                  </Badge>
                  {criticalCount > 0 && (
                    <span className="text-[11px] text-rose-700 font-semibold hidden sm:inline">
                      ({criticalCount} Critical, {watchCount} Watch)
                    </span>
                  )}
                </h3>
                <p className="text-xs text-rose-800/90 font-medium">
                  Students identified with low lecture attendance (&lt;75%) or concept mastery gaps requiring teacher support.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => navigate('/teacher/analytics')}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs gap-1.5 shrink-0 shadow-xs"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              At-Risk Roster ({atRiskTotal})
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main 12-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Department Courses (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold flex items-center gap-2 text-slate-900">
              <BookOpen className="w-4 h-4 text-blue-600" />
              My Department Courses
            </h2>
            <span className="text-xs text-slate-500 font-mono font-medium">
              {courses?.length ?? 0} {courses?.length === 1 ? 'Course' : 'Courses'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses?.map((c) => (
              <Card key={c.id} className="border-slate-200 bg-white shadow-xs hover:shadow-md transition-all rounded-xl flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center gap-2">
                    <Badge variant="outline" className="font-mono bg-blue-50 text-blue-700 border-blue-200 font-bold">{c.code}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRosterCourse({ id: c.id, code: c.code, title: c.title })}
                      className="h-7 px-2 text-xs text-slate-600 hover:text-blue-700 hover:bg-blue-50 gap-1.5 font-medium"
                      title="View class roster"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>{c._count?.enrollments || 0} Roster</span>
                    </Button>
                  </div>
                  <CardTitle className="text-base mt-2 font-bold text-slate-900">{c.title}</CardTitle>
                  <CardDescription className="line-clamp-2 text-xs text-slate-500 leading-relaxed">
                    {c.description || 'No description provided'}
                  </CardDescription>

                  {/* 4-Stat Metadata Strip */}
                  <div className="grid grid-cols-4 gap-1.5 pt-2 text-center">
                    <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                      <div className="text-xs font-extrabold font-mono text-slate-900">{c._count?.enrollments || 0}</div>
                      <div className="text-[10px] text-slate-500 font-medium">Students</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                      <div className="text-xs font-extrabold font-mono text-slate-900">{c._count?.concepts || 0}</div>
                      <div className="text-[10px] text-slate-500 font-medium">Topics</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                      <div className="text-xs font-extrabold font-mono text-slate-900">{c._count?.assessments || 0}</div>
                      <div className="text-[10px] text-slate-500 font-medium">Quizzes</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                      <div className="text-xs font-extrabold font-mono text-slate-900">{c._count?.sessions || 0}</div>
                      <div className="text-[10px] text-slate-500 font-medium">Sessions</div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-2 border-t border-slate-100 space-y-3">
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span className="flex items-center gap-1 text-[11px] font-medium text-slate-600">
                      <Radio className="w-3 h-3 text-blue-600" />
                      {c._count?.sessions || 0} Lectures Conducted
                    </span>
                    <span className="text-slate-700 flex items-center gap-1 font-mono text-[11px] font-semibold">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Auto-Grading
                    </span>
                  </div>

                  {c.id === primaryCourseId && atRiskTotal > 0 && (
                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-rose-50 border border-rose-200 text-xs">
                      <span className="text-rose-700 flex items-center gap-1.5 font-semibold text-[11px]">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {atRiskTotal} Students Need Academic Support
                      </span>
                      <button
                        type="button"
                        onClick={() => navigate(`/teacher/courses/${c.id}/analytics`)}
                        className="text-[11px] text-rose-700 hover:underline font-mono font-bold"
                      >
                        View List &rarr;
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="w-full text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs gap-1"
                      onClick={() => navigate(`/teacher/courses/${c.id}/assessments`)}
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      Assessments
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 font-semibold gap-1"
                      onClick={() => navigate(`/teacher/courses/${c.id}/analytics`)}
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      Analytics
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200 font-semibold gap-1"
                      onClick={() => navigate(`/teacher/courses/${c.id}/review`)}
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      Review
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 font-semibold gap-1"
                      onClick={() => setSearchParams({ tab: 'curriculum', courseId: c.id })}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      Curriculum
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Right Column: Attendance & Course Authoring (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Start Attendance Session Card */}
          <Card className="border-slate-200 bg-white shadow-xs rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                <QrCode className="w-4 h-4 text-blue-600" /> Start Live QR Attendance
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Broadcast rotating verification codes for lectures
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLaunchSession} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Course</label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    required
                  >
                    <option value="">Select course...</option>
                    {courses?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} - {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Session Topic</label>
                  <Input
                    placeholder="e.g. Transactions & ACID"
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                    required
                    className="h-9 text-xs bg-white border-slate-300 text-slate-900"
                  />
                </div>

                <Button
                  type="submit"
                  size="sm"
                  variant="default"
                  className="w-full text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
                  disabled={createSessionMutation.isPending}
                >
                  {createSessionMutation.isPending ? 'Starting...' : 'Launch QR Session'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Recent Attendance Sessions Card */}
          <Card className="border-slate-200 bg-white shadow-xs rounded-xl">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                  <Clock className="w-4 h-4 text-emerald-600" /> Recent Lecture Sessions
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Latest sessions and turnout rates
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/teacher/live-attendance')}
                className="text-[11px] h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1 font-mono font-semibold"
              >
                Console &rarr;
              </Button>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {recentSessions.length === 0 ? (
                <div className="py-5 text-center text-slate-400 text-xs">
                  No attendance sessions conducted yet.
                </div>
              ) : (
                recentSessions.map((session) => {
                  const turnout = sessionTurnoutMap.get(session.id);
                  const total = turnout ? turnout.present + turnout.absent + turnout.flagged : 0;
                  const percent = total > 0 && turnout ? Math.round((turnout.present / total) * 100) : 0;
                  const dateStr = new Date(session.sessionDate).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <div
                      key={session.id}
                      onClick={() => navigate(`/teacher/live-attendance/${session.id}`)}
                      className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/80 hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {session.title}
                          </span>
                          {session.isActive && (
                            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] px-1 py-0 font-bold animate-pulse">
                              LIVE
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {dateStr}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        {turnout ? (
                          <div className="text-right">
                            <span className="text-xs font-mono font-bold text-slate-900">
                              {turnout.present}/{total}
                            </span>
                            <span className="text-[10px] text-slate-500 ml-1 font-medium">({percent}%)</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {session.isActive ? 'Active now' : 'Recorded'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Create New Course Card */}
          <Card className="border-slate-200 bg-white shadow-xs rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                <PlusCircle className="w-4 h-4 text-blue-600" /> Create New Course
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Add a new syllabus to the department
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateCourse} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">Code</label>
                    <Input
                      placeholder="e.g. CS302"
                      value={courseCode}
                      onChange={(e) => setCourseCode(e.target.value)}
                      required
                      className="h-9 text-xs bg-white border-slate-300 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">Title</label>
                    <Input
                      placeholder="e.g. Distributed Systems"
                      value={courseTitle}
                      onChange={(e) => setCourseTitle(e.target.value)}
                      required
                      className="h-9 text-xs bg-white border-slate-300 text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Description</label>
                  <Input
                    placeholder="Syllabus overview..."
                    value={courseDesc}
                    onChange={(e) => setCourseDesc(e.target.value)}
                    className="h-9 text-xs bg-white border-slate-300 text-slate-900"
                  />
                </div>

                <Button
                  type="submit"
                  size="sm"
                  variant="default"
                  className="w-full text-xs bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-xs"
                  disabled={createCourseMutation.isPending}
                >
                  {createCourseMutation.isPending ? 'Publishing...' : 'Publish Course'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Course Roster Dialog */}
      <CourseRosterDialog
        isOpen={Boolean(rosterCourse)}
        courseId={rosterCourse?.id || null}
        courseCode={rosterCourse?.code}
        courseTitle={rosterCourse?.title}
        onClose={() => setRosterCourse(null)}
      />
    </div>
  );
};
