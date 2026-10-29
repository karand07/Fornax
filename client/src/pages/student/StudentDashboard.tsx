import React, { useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/auth-context';
import {
  useCourses,
  useMyEnrolledCourses,
  useStudentCourseAttendance,
  useStudentCourseMastery,
  useCourseAssessments,
  useFaceStatus,
} from '@/api/hooks';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { masteryBand, formatPercent } from '@/lib/mastery-ui';
import {
  CalendarCheck,
  Award,
  CheckCircle2,
  Clock,
  ArrowRight,
  ScanFace,
  Lightbulb,
  ShieldAlert,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Courses
  const { data: enrolledCourses, isLoading: enrolledLoading } = useMyEnrolledCourses();
  const { data: allCourses, isLoading: allCoursesLoading } = useCourses();
  const { data: faceStatus } = useFaceStatus();

  const courses = useMemo(() => {
    if (enrolledCourses && enrolledCourses.length > 0) return enrolledCourses;
    return allCourses || [];
  }, [enrolledCourses, allCourses]);

  const coursesLoading = enrolledLoading && allCoursesLoading;

  // Selected course via URL search params (or default to first course)
  const urlCourseId = searchParams.get('courseId');
  const selectedCourseId = useMemo(() => {
    if (urlCourseId && courses.some((c) => c.id === urlCourseId)) {
      return urlCourseId;
    }
    return courses[0]?.id || '';
  }, [urlCourseId, courses]);

  const selectedCourse = useMemo(() => {
    return courses.find((c) => c.id === selectedCourseId);
  }, [courses, selectedCourseId]);

  const handleCourseChange = (newCourseId: string) => {
    setSearchParams({ courseId: newCourseId });
  };

  // Queries for selected course
  const {
    data: attendance,
    isLoading: attendanceLoading,
  } = useStudentCourseAttendance(selectedCourseId);

  const {
    data: masteryList,
    isLoading: masteryLoading,
  } = useStudentCourseMastery(user?.id || '', selectedCourseId);

  const {
    data: assessments,
    isLoading: assessmentsLoading,
  } = useCourseAssessments(selectedCourseId);

  // Concepts sorted ascending by score (weakest first)
  const sortedConcepts = useMemo(() => {
    if (!masteryList) return [];
    return [...masteryList].sort((a, b) => a.score - b.score);
  }, [masteryList]);

  // Last 5 assessments
  const recentAssessments = useMemo(() => {
    if (!assessments) return [];
    return [...assessments].slice(0, 5);
  }, [assessments]);

  // Last 5 sessions for attendance dots (already newest first from server)
  const last5Sessions = useMemo(() => {
    if (!attendance?.history) return [];
    return attendance.history.slice(0, 5);
  }, [attendance]);

  return (
    <div className="space-y-6 pb-20">
      {/* Top Welcome & Mode B Actions Bar */}
      <div className="rounded-xl bg-card border border-border p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-semibold text-xs text-blue-400 bg-blue-500/10 border-blue-500/20">
              Student Dashboard v1
            </Badge>
            {selectedCourse && (
              <Badge variant="outline" className="font-mono text-xs text-slate-300">
                {selectedCourse.code}
              </Badge>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-100 tracking-tight">
            Welcome back, {user?.firstName}
          </h1>
          <p className="text-xs md:text-sm text-slate-400">
            Monitor attendance verification, inspect prerequisite mastery, and complete course assessments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="default"
            size="sm"
            onClick={() => navigate('/student/mark-attendance')}
            className="text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white gap-2 shadow-sm"
          >
            <CalendarCheck className="w-4 h-4" />
            Mark Attendance (Mode B)
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/student/enroll-face')}
            className="text-xs font-mono border-slate-700 text-slate-300 hover:bg-slate-800 gap-2"
          >
            <ScanFace className="w-4 h-4 text-blue-400" />
            {faceStatus?.enrolled ? 'Face Profile Active ✓' : 'Enroll Biometrics'}
          </Button>
        </div>
      </div>

      {/* Course Selector Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-indigo-400 shrink-0" />
          <div>
            <div className="text-xs font-medium text-slate-400">Active Course View</div>
            <div className="text-sm font-semibold text-slate-200">
              {selectedCourse ? `${selectedCourse.code} — ${selectedCourse.title}` : 'Select a course'}
            </div>
          </div>
        </div>

        {courses.length > 1 && (
          <div className="w-full sm:w-64">
            <Select value={selectedCourseId} onValueChange={handleCourseChange}>
              <SelectTrigger className="w-full bg-slate-950/80 border-slate-700 text-xs">
                <SelectValue placeholder="Switch Course" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.code} - {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {coursesLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      ) : !selectedCourseId ? (
        <Card className="border-slate-800 bg-slate-900/50 p-8 text-center">
          <p className="text-sm text-slate-400">You are not enrolled in any courses yet.</p>
        </Card>
      ) : (
        /* Main Dashboard Grid */
        <div className="space-y-6">
          {/* Top Row: Attendance & Mastery Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. Attendance Card */}
            <Card className="border border-slate-800 bg-slate-900/60 shadow-md flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-emerald-400" />
                    Attendance Record
                  </CardTitle>
                  <Badge variant="outline" className="text-[11px] font-mono text-slate-400 border-slate-800">
                    Mode B
                  </Badge>
                </div>
                <CardDescription className="text-xs text-slate-400">
                  Ended lectures evaluation for {selectedCourse?.code}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 pt-1">
                {attendanceLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-28" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                ) : !attendance || attendance.totalSessions === 0 ? (
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-slate-400 font-mono">
                      No sessions yet
                    </div>
                    <p className="text-xs text-slate-500">
                      Attendance calculations start once class sessions end.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Big Percentage */}
                    <div className="flex items-baseline gap-2">
                      <div className="text-4xl font-extrabold text-slate-100 font-mono tracking-tight">
                        {attendance.rate !== null ? formatPercent(attendance.rate) : 'No sessions yet'}
                      </div>
                      <span className="text-xs text-slate-400 font-medium">rate</span>
                    </div>

                    {/* Small Text */}
                    <p className="text-xs text-slate-300">
                      Present <span className="font-semibold text-emerald-400">{attendance.present}</span> of{' '}
                      <span className="font-semibold text-slate-200">{attendance.totalSessions}</span> sessions
                      {attendance.flagged > 0 && (
                        <span className="text-amber-400 ml-1">
                          ({attendance.flagged} flagged pending review)
                        </span>
                      )}
                    </p>

                    {/* Last 5 sessions colored dots with tooltips */}
                    {last5Sessions.length > 0 && (
                      <div className="pt-2 border-t border-slate-800/80">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                          <span>Recent sessions:</span>
                          <span className="text-[10px] text-slate-500">hover for date</span>
                        </div>
                        <TooltipProvider>
                          <div className="flex items-center gap-2.5">
                            {last5Sessions.map((s, idx) => {
                              const isPresent = s.status === 'PRESENT';
                              const isFlagged = s.status === 'FLAGGED';
                              const dotColor = isPresent
                                ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                                : isFlagged
                                ? 'bg-amber-500 shadow-sm shadow-amber-500/50'
                                : 'bg-rose-500 shadow-sm shadow-rose-500/50';

                              return (
                                <Tooltip key={s.sessionId || idx}>
                                  <TooltipTrigger asChild>
                                    <div
                                      tabIndex={0}
                                      role="button"
                                      aria-label={`Session on ${new Date(s.date).toLocaleDateString()}: ${s.status}`}
                                      className={`w-3.5 h-3.5 rounded-full cursor-pointer transition-transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${dotColor}`}
                                    />
                                  </TooltipTrigger>
                                  <TooltipContent className="text-xs">
                                    <p className="font-semibold capitalize text-slate-100">{s.status}</p>
                                    <p className="text-[11px] text-slate-400">
                                      {new Date(s.date).toLocaleDateString(undefined, {
                                        weekday: 'short',
                                        month: 'short',
                                        day: 'numeric',
                                      })}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                          </div>
                        </TooltipProvider>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 2. Mastery Card (takes 2 columns on lg) */}
            <Card className="border border-slate-800 bg-slate-900/60 shadow-md lg:col-span-2">
              <CardHeader className="pb-3 border-b border-slate-800/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <CardTitle className="text-sm font-semibold text-slate-200">
                      Concept Mastery Breakdown
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[11px] text-slate-400 border-slate-800">
                    Sorted: Weakest First
                  </Badge>
                </div>
                <CardDescription className="text-xs text-slate-400">
                  Topic mastery levels derived from weighted chronological evaluation
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-4 space-y-3">
                {masteryLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                  </div>
                ) : sortedConcepts.length === 0 ? (
                  <p className="text-xs text-slate-500 p-4 text-center">
                    No curriculum concepts mapped for this course yet.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                    {sortedConcepts.map((c) => {
                      const isAssessed = c.attempts > 0;
                      const band = masteryBand(c.score);

                      return (
                        <div
                          key={c.conceptId}
                          className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80 hover:border-slate-700/80 transition-colors space-y-1.5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-0.5 min-w-0 flex-1">
                              <span className="text-xs md:text-sm font-medium text-slate-200 truncate block">
                                {c.name}
                              </span>
                              {c.prerequisiteName && (
                                <p className="text-[11px] text-slate-400 italic">
                                  Prerequisite: {c.prerequisiteName}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {isAssessed ? (
                                <>
                                  <Badge
                                    variant={band.badgeVariant}
                                    className={`text-[10px] font-semibold px-2 py-0.5 border ${band.textColor} ${band.bgColor} ${band.borderColor}`}
                                  >
                                    {band.label}
                                  </Badge>
                                  <span className="text-xs font-mono font-bold text-slate-200 w-10 text-right">
                                    {formatPercent(c.score)}
                                  </span>
                                </>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] text-slate-400 border-slate-700 bg-slate-900/60"
                                >
                                  Not assessed yet
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Progress Bar & attempts */}
                          <div className="flex items-center gap-3 pt-0.5">
                            <Progress
                              value={isAssessed ? c.score * 100 : 0}
                              className="h-1.5 flex-1 bg-slate-800"
                              indicatorClassName={isAssessed ? band.progressColor : 'bg-slate-700'}
                            />
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">
                              {c.attempts} {c.attempts === 1 ? 'attempt' : 'attempts'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Middle Row: Recent Assessments & Day 11 Placeholders */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 3. Recent Assessments Card */}
            <Card className="border border-slate-800 bg-slate-900/60 shadow-md">
              <CardHeader className="pb-3 border-b border-slate-800/60">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <Award className="w-4 h-4 text-indigo-400" />
                    Recent Assessments
                  </CardTitle>
                  <span className="text-[11px] text-slate-400 font-mono">Last 5</span>
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-2.5">
                {assessmentsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : recentAssessments.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-500">
                    No assessments published for this course yet.
                  </div>
                ) : (
                  recentAssessments.map((a) => {
                    const isSubmitted = a.submitted;
                    const actionUrl = isSubmitted
                      ? `/student/assessments/${a.id}/result`
                      : `/student/assessments/${a.id}`;

                    return (
                      <div
                        key={a.id}
                        className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <p className="font-medium text-slate-200 truncate">{a.title}</p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <span>{a.questionCount} questions</span>
                            <span>•</span>
                            <span>{a.totalMarks} marks</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isSubmitted ? (
                            <Badge
                              variant="success"
                              className="text-[10px] gap-1 px-1.5 py-0.5"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Submitted
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="text-[10px] text-amber-400 border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5"
                            >
                              <Clock className="w-3 h-3" /> To Do
                            </Badge>
                          )}

                          <Link to={actionUrl}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-blue-400 hover:text-white hover:bg-blue-600/30 gap-1"
                            >
                              {isSubmitted ? 'Result' : 'Take'}
                              <ArrowRight className="w-3 h-3" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* 4. Placeholder Card: Recommendations (Day 11) */}
            <Card className="border border-slate-800 bg-slate-900/60 shadow-md">
              <CardHeader className="pb-3 border-b border-slate-800/60">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                    Recommendations
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-800">
                    Day 11
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="p-6 text-center rounded-lg border border-dashed border-slate-800 bg-slate-950/30 space-y-1">
                  <p className="text-xs font-semibold text-slate-300">Available soon</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Personalized remediation suggestions and targeted revision resources will plug in here on Day 11.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 5. Placeholder Card: Risk level (Day 11) */}
            <Card className="border border-slate-800 bg-slate-900/60 shadow-md">
              <CardHeader className="pb-3 border-b border-slate-800/60">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    Risk Level
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-800">
                    Day 11
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="p-6 text-center rounded-lg border border-dashed border-slate-800 bg-slate-950/30 space-y-1">
                  <p className="text-xs font-semibold text-slate-300">Available soon</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Early warning risk scoring and multi-factor academic engagement telemetry will plug in here on Day 11.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
