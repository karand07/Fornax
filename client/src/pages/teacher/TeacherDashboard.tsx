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
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchParams({})}
              className="text-xs gap-1.5 border-slate-700 text-slate-300 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-xl font-bold text-slate-100">Curriculum & Concepts</h1>
              <p className="text-xs text-slate-400">
                Explore course prerequisite graphs, learning resources, and conceptual hierarchy.
              </p>
            </div>
          </div>
        </div>
        <ConceptResourceViewer />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
              Instructor Dashboard
            </h1>
            <Badge variant="outline" className="text-xs font-mono border-blue-500/30 text-blue-400 bg-blue-500/10">
              Prof. {user?.lastName}
            </Badge>
          </div>
          <p className="mt-1 text-xs md:text-sm text-slate-400">
            Overview of department courses, live attendance sessions, student mastery, and grading queues.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            size="sm"
            onClick={() => navigate('/teacher/live-attendance')}
            className="text-xs font-mono bg-blue-600 hover:bg-blue-500 text-white gap-2 shadow-md shadow-blue-900/30"
          >
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            Live Attendance Console
          </Button>
        </div>
      </div>

      {/* Standard 5-Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="p-4 border-slate-800 bg-slate-900/40">
          <div className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
            <Library className="w-3.5 h-3.5 text-blue-400" /> Active Courses
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
            {courses?.length ?? 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Faculty managed</p>
        </Card>

        <Card className="p-4 border-slate-800 bg-slate-900/40">
          <div className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
            <Users className="w-3.5 h-3.5 text-emerald-400" /> Enrolled Students
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
            {totalEnrollments}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Across all cohorts</p>
        </Card>

        <Card className="p-4 border-slate-800 bg-slate-900/40">
          <div className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400" /> Assessments
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
            {totalAssessments}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Quizzes & exams</p>
        </Card>

        <Card
          className="p-4 border-slate-800 bg-slate-900/40 cursor-pointer hover:border-amber-700/60 transition-colors"
          onClick={() => navigate('/teacher/courses/all/review')}
        >
          <div className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
            <CheckSquare className="w-3.5 h-3.5 text-amber-400" /> Pending Reviews
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1 flex items-center justify-between">
            <span>{pendingCount}</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Requires verification</p>
        </Card>

        <Card
          className="p-4 border-slate-800 bg-slate-900/40 cursor-pointer hover:border-rose-700/60 transition-colors"
          onClick={() => navigate('/teacher/analytics')}
        >
          <div className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" /> Needs Support
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-1 flex items-center justify-between">
            <span>{atRiskTotal}</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {criticalCount > 0 ? `${criticalCount} critical, ${watchCount} watch` : 'Attendance & mastery'}
          </p>
        </Card>
      </div>

      {/* Pending Reviews Card with Priority Preview */}
      {pendingCount > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="p-4 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <span>Submissions Pending Manual Review</span>
                  <Badge className="bg-amber-500 text-slate-950 font-bold text-[10px] px-1.5 py-0">
                    {pendingCount}
                  </Badge>
                </h3>
                <p className="text-xs text-slate-400">
                  AI-evaluated short answers with low confidence scores, handwritten answer scans, or rubric flags.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => navigate('/teacher/courses/all/review')}
              className="bg-amber-600 hover:bg-amber-500 text-white text-xs gap-1.5 shrink-0"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              Review Queue ({pendingCount})
            </Button>
          </CardHeader>

          {/* Quick Preview of Top 3 Queue Items */}
          {reviewQueueData?.items && reviewQueueData.items.length > 0 && (
            <CardContent className="px-4 pb-4 pt-0">
              <div className="border-t border-amber-500/20 pt-3 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-amber-400/90 font-medium px-1">
                  <span>Priority Queue Preview</span>
                  <span className="text-slate-400 text-[10px]">Click any item to jump straight into grading</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  {reviewQueueData.items.slice(0, 3).map((item) => (
                    <div
                      key={item.submissionId}
                      onClick={() => navigate(`/teacher/review/${item.submissionId}`)}
                      className="p-2.5 rounded-lg border border-amber-500/20 bg-slate-950/70 hover:border-amber-500/50 hover:bg-slate-900 transition-all cursor-pointer flex flex-col justify-between gap-2 group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-semibold text-slate-200 group-hover:text-amber-300 transition-colors truncate">
                            {item.studentName}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1 py-0 border-amber-500/30 text-amber-400 bg-amber-500/10 font-mono"
                          >
                            {item.reasons?.[0] || 'NEEDS REVIEW'}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1">
                          {item.assessmentTitle}
                        </p>
                        <p className="text-[10px] text-slate-500 line-clamp-2 italic">
                          "{item.questionPrompt}"
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px]">
                        <span className="text-slate-400 font-mono">Max: {item.maxMarks} pts</span>
                        <span className="text-amber-400 flex items-center gap-0.5 group-hover:underline">
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
        <Card className="border-rose-500/30 bg-rose-500/5">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <span>Academic Intervention Required</span>
                  <Badge className="bg-rose-500 text-white font-bold text-[10px] px-1.5 py-0">
                    {atRiskTotal} {atRiskTotal === 1 ? 'Student' : 'Students'}
                  </Badge>
                  {criticalCount > 0 && (
                    <span className="text-[11px] text-rose-400 font-medium hidden sm:inline">
                      ({criticalCount} Critical, {watchCount} Watch)
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400">
                  Students identified with low lecture attendance (&lt;75%) or concept mastery gaps requiring teacher support.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => navigate('/teacher/analytics')}
              className="bg-rose-600 hover:bg-rose-500 text-white text-xs gap-1.5 shrink-0"
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
            <h2 className="text-base font-semibold flex items-center gap-2 text-slate-200">
              <BookOpen className="w-4 h-4 text-blue-400" />
              My Department Courses
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              {courses?.length ?? 0} {courses?.length === 1 ? 'Course' : 'Courses'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses?.map((c) => (
              <Card key={c.id} className="border-slate-800 bg-slate-900/60 flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center gap-2">
                    <Badge variant="default" className="font-mono">{c.code}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRosterCourse({ id: c.id, code: c.code, title: c.title })}
                      className="h-7 px-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 gap-1.5"
                      title="View class roster"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>{c._count?.enrollments || 0} Roster</span>
                    </Button>
                  </div>
                  <CardTitle className="text-base mt-2 font-semibold text-slate-100">{c.title}</CardTitle>
                  <CardDescription className="line-clamp-2 text-xs text-slate-400">
                    {c.description || 'No description provided'}
                  </CardDescription>

                  {/* 4-Stat Metadata Strip */}
                  <div className="grid grid-cols-4 gap-1.5 pt-2 text-center">
                    <div className="bg-slate-950/60 rounded p-1.5 border border-slate-800/80">
                      <div className="text-[11px] font-bold font-mono text-slate-200">{c._count?.enrollments || 0}</div>
                      <div className="text-[10px] text-slate-500">Students</div>
                    </div>
                    <div className="bg-slate-950/60 rounded p-1.5 border border-slate-800/80">
                      <div className="text-[11px] font-bold font-mono text-slate-200">{c._count?.concepts || 0}</div>
                      <div className="text-[10px] text-slate-500">Topics</div>
                    </div>
                    <div className="bg-slate-950/60 rounded p-1.5 border border-slate-800/80">
                      <div className="text-[11px] font-bold font-mono text-slate-200">{c._count?.assessments || 0}</div>
                      <div className="text-[10px] text-slate-500">Quizzes</div>
                    </div>
                    <div className="bg-slate-950/60 rounded p-1.5 border border-slate-800/80">
                      <div className="text-[11px] font-bold font-mono text-slate-200">{c._count?.sessions || 0}</div>
                      <div className="text-[10px] text-slate-500">Sessions</div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-2 border-t border-slate-800/80 space-y-3">
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Radio className="w-3 h-3 text-blue-400" />
                      {c._count?.sessions || 0} Lectures Conducted
                    </span>
                    <span className="text-slate-300 flex items-center gap-1 font-mono text-[11px]">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Auto-Grading
                    </span>
                  </div>

                  {c.id === primaryCourseId && atRiskTotal > 0 && (
                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-xs">
                      <span className="text-rose-400 flex items-center gap-1.5 font-medium text-[11px]">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {atRiskTotal} Students Need Academic Support
                      </span>
                      <button
                        type="button"
                        onClick={() => navigate(`/teacher/courses/${c.id}/analytics`)}
                        className="text-[11px] text-rose-300 hover:underline font-mono"
                      >
                        View List &rarr;
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="w-full text-xs bg-indigo-600 hover:bg-indigo-500 text-white gap-1"
                      onClick={() => navigate(`/teacher/courses/${c.id}/assessments`)}
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      Assessments
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs border-emerald-800/60 text-emerald-400 hover:bg-emerald-950/40 gap-1"
                      onClick={() => navigate(`/teacher/courses/${c.id}/analytics`)}
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      Analytics
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs border-indigo-800/60 text-indigo-300 hover:bg-indigo-950/40 gap-1"
                      onClick={() => navigate(`/teacher/courses/${c.id}/review`)}
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      Review
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs text-blue-400 hover:text-white hover:bg-blue-600 gap-1"
                      onClick={() => setSearchParams({ tab: 'curriculum' })}
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
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-100">
                <QrCode className="w-4 h-4 text-blue-400" /> Start Live QR Attendance
              </CardTitle>
              <CardDescription className="text-xs">
                Broadcast rotating verification codes for lectures
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLaunchSession} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 mb-1 block">Course</label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full h-9 rounded-md border border-border bg-slate-950 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                  <label className="text-xs font-medium text-slate-300 mb-1 block">Session Topic</label>
                  <Input
                    placeholder="e.g. Transactions & ACID"
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                    required
                    className="h-9 text-xs bg-slate-950 border-border"
                  />
                </div>

                <Button
                  type="submit"
                  size="sm"
                  variant="default"
                  className="w-full text-xs bg-blue-600 hover:bg-blue-500 text-white"
                  disabled={createSessionMutation.isPending}
                >
                  {createSessionMutation.isPending ? 'Starting...' : 'Launch QR Session'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Recent Attendance Sessions Card */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-100">
                  <Clock className="w-4 h-4 text-emerald-400" /> Recent Lecture Sessions
                </CardTitle>
                <CardDescription className="text-xs">
                  Latest sessions and turnout rates
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/teacher/live-attendance')}
                className="text-[11px] h-7 px-2 text-blue-400 hover:text-blue-300 gap-1 font-mono"
              >
                Console &rarr;
              </Button>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {recentSessions.length === 0 ? (
                <div className="py-5 text-center text-slate-500 text-xs">
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
                      className="p-2.5 rounded-lg border border-slate-800/80 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-800/30 transition-colors cursor-pointer flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-200 truncate">
                            {session.title}
                          </span>
                          {session.isActive && (
                            <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] px-1 py-0 animate-pulse">
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
                            <span className="text-xs font-mono font-bold text-slate-200">
                              {turnout.present}/{total}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-1">({percent}%)</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono">
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
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-100">
                <PlusCircle className="w-4 h-4 text-sky-400" /> Create New Course
              </CardTitle>
              <CardDescription className="text-xs">
                Add a new syllabus to the department
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateCourse} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1 block">Code</label>
                    <Input
                      placeholder="e.g. CS302"
                      value={courseCode}
                      onChange={(e) => setCourseCode(e.target.value)}
                      required
                      className="h-9 text-xs bg-slate-950 border-border"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1 block">Title</label>
                    <Input
                      placeholder="e.g. Distributed Systems"
                      value={courseTitle}
                      onChange={(e) => setCourseTitle(e.target.value)}
                      required
                      className="h-9 text-xs bg-slate-950 border-border"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 mb-1 block">Description</label>
                  <Input
                    placeholder="Syllabus overview..."
                    value={courseDesc}
                    onChange={(e) => setCourseDesc(e.target.value)}
                    className="h-9 text-xs bg-slate-950 border-border"
                  />
                </div>

                <Button
                  type="submit"
                  size="sm"
                  variant="outline"
                  className="w-full text-xs border-slate-700 text-slate-200 hover:text-white"
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
