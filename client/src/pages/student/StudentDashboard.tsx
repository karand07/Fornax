import React, { useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/auth-context';
import {
  useCourses,
  useMyEnrolledCourses,
  useStudentCourseAttendance,
  useCourseAssessments,
  useFaceStatus,
  useStudentProfile,
} from '@/api/hooks';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { RiskBadge } from '@/components/profile/RiskBadge';
import { MasteryRadar } from '@/components/profile/MasteryRadar';
import { TrendChart } from '@/components/profile/TrendChart';
import { RecommendationCard } from '@/components/profile/RecommendationCard';
import { ConceptResourceViewer } from '@/components/ConceptResourceViewer';
import { formatPercent, masteryBand } from '@/lib/mastery-ui';
import {
  CalendarCheck,
  Award,
  CheckCircle2,
  Clock,
  ArrowRight,
  ScanFace,
  GraduationCap,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  BookOpen,
  Layers,
  XCircle,
  Check,
} from 'lucide-react';

const VALID_TABS = ['overview', 'courses', 'concepts', 'attendance', 'analytics'] as const;
type DashboardTab = typeof VALID_TABS[number];

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Tab handling
  const rawTab = searchParams.get('tab');
  const activeTab: DashboardTab = VALID_TABS.includes(rawTab as DashboardTab)
    ? (rawTab as DashboardTab)
    : 'overview';

  const handleTabChange = (newTab: DashboardTab) => {
    const nextParams = new URLSearchParams(searchParams);
    if (newTab === 'overview') {
      nextParams.delete('tab');
    } else {
      nextParams.set('tab', newTab);
    }
    setSearchParams(nextParams);
  };

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
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('courseId', newCourseId);
    setSearchParams(nextParams);
  };

  // Unified Student Profile (Day 11)
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useStudentProfile(user?.id, selectedCourseId);

  // Queries for attendance sessions history & assessments
  const {
    data: attendance,
    isLoading: attendanceLoading,
  } = useStudentCourseAttendance(selectedCourseId);

  const {
    data: assessments,
    isLoading: assessmentsLoading,
  } = useCourseAssessments(selectedCourseId);

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
            <Badge
              variant="secondary"
              className="font-semibold text-xs text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
            >
              Student Portal
            </Badge>
            {selectedCourse && (
              <Badge variant="outline" className="font-mono text-xs">
                {selectedCourse.code}
              </Badge>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            Welcome back, {user?.firstName}
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Track your course progress, concept mastery, verification records, and personalized study recommendations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="default"
            size="sm"
            onClick={() => navigate('/student/mark-attendance')}
            className="text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shadow-sm"
          >
            <CalendarCheck className="w-4 h-4" />
            Mark Attendance (Mode B)
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/student/enroll-face')}
            className="text-xs font-mono gap-2"
          >
            <ScanFace className="w-4 h-4 text-primary" />
            {faceStatus?.enrolled ? 'Face Profile Active ✓' : 'Enroll Biometrics'}
          </Button>
        </div>
      </div>

      {/* Active Course Selector Header Row (shown on course-dependent tabs) */}
      {activeTab !== 'courses' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-card border shadow-sm">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-400 shrink-0" />
            <div>
              <div className="text-xs font-medium text-muted-foreground">Active Course Context</div>
              <div className="text-sm font-semibold text-foreground">
                {selectedCourse ? `${selectedCourse.code} — ${selectedCourse.title}` : 'Select a course'}
              </div>
            </div>
          </div>

          {courses.length > 1 && (
            <div className="w-full sm:w-64">
              <Select value={selectedCourseId} onValueChange={handleCourseChange}>
                <SelectTrigger className="w-full text-xs">
                  <SelectValue placeholder="Switch Course" />
                </SelectTrigger>
                <SelectContent>
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
      )}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <>
          {coursesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Skeleton className="h-44 w-full" />
              <Skeleton className="h-44 w-full" />
              <Skeleton className="h-44 w-full" />
            </div>
          ) : !selectedCourseId ? (
            <Card className="p-8 text-center">
              <p className="text-sm text-muted-foreground">You are not enrolled in any courses yet.</p>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Top Row: Attendance, Academic Status (Risk), and Recent Assessments */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. Attendance Card */}
                <Card className="flex flex-col justify-between shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <CalendarCheck className="w-4 h-4 text-emerald-400" />
                        Attendance Record
                      </CardTitle>
                      <Badge variant="outline" className="text-[11px] font-mono">
                        Mode B
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      Ended lectures for {selectedCourse?.code}
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
                        <div className="text-2xl font-bold text-muted-foreground font-mono">
                          No sessions yet
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Attendance calculations start once class sessions end.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-baseline gap-2">
                          <div className="text-4xl font-extrabold font-mono tracking-tight text-foreground">
                            {attendance.rate !== null ? formatPercent(attendance.rate) : 'No sessions yet'}
                          </div>
                          <span className="text-xs text-muted-foreground font-medium">rate</span>
                        </div>

                        <p className="text-xs text-foreground/80">
                          Present <span className="font-semibold text-emerald-400">{attendance.present}</span> of{' '}
                          <span className="font-semibold">{attendance.totalSessions}</span> sessions
                          {attendance.flagged > 0 && (
                            <span className="text-amber-400 ml-1">
                              ({attendance.flagged} flagged pending review)
                            </span>
                          )}
                        </p>

                        {/* Last 5 sessions colored dots with tooltips */}
                        {last5Sessions.length > 0 && (
                          <div className="pt-2 border-t border-border/60">
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-2">
                              <span>Recent sessions:</span>
                              <span className="text-[10px]">hover for date</span>
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
                                          className={`w-3.5 h-3.5 rounded-full cursor-pointer transition-transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${dotColor}`}
                                        />
                                      </TooltipTrigger>
                                      <TooltipContent className="text-xs">
                                        <p className="font-semibold capitalize">{s.status}</p>
                                        <p className="text-[11px] text-muted-foreground">
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

                {/* 2. Academic Standing / Risk Status Card */}
                <Card className="flex flex-col justify-between shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                        Academic Standing
                      </CardTitle>
                      <Badge variant="outline" className="text-[11px]">
                        Status
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      Engagement and performance evaluation
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-1">
                    {profileLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-8 w-36 rounded-full" />
                        <Skeleton className="h-4 w-48" />
                      </div>
                    ) : profileError ? (
                      <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-xs text-destructive space-y-2">
                        <div className="flex items-center gap-1.5 font-medium">
                          <AlertCircle className="w-4 h-4" />
                          <span>Status temporarily unavailable</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => refetchProfile()}
                          className="h-6 text-[11px] px-2 gap-1"
                        >
                          <RefreshCw className="w-3 h-3" /> Retry
                        </Button>
                      </div>
                    ) : profile ? (
                      <div className="space-y-3">
                        <RiskBadge
                          level={profile.risk.level}
                          factors={profile.risk.factors}
                          variant="student"
                        />
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Status is updated automatically after every graded quiz and class attendance review.
                        </p>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                {/* 3. Recent Assessments Card */}
                <Card className="flex flex-col justify-between shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-400" />
                        Assessments
                      </CardTitle>
                      <span className="text-[11px] text-muted-foreground font-mono">Last 5</span>
                    </div>
                    <CardDescription className="text-xs">
                      Quizzes and exams for this course
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-1 space-y-2.5">
                    {assessmentsLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : recentAssessments.length === 0 ? (
                      <div className="text-center py-4 text-xs text-muted-foreground">
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
                            className="p-2.5 rounded-lg border bg-card/60 flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <p className="font-medium text-foreground truncate">{a.title}</p>
                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <span>{a.questionCount} Qs</span>
                                <span>•</span>
                                <span>{a.totalMarks} pts</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {isSubmitted ? (
                                <Badge
                                  variant="default"
                                  className="text-[10px] gap-1 px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
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
                                  className="h-6 px-2 text-xs text-primary hover:text-primary gap-1"
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
              </div>

              {/* Middle Row: Concept Mastery Radar & Assessment Trend Chart */}
              {profileLoading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Skeleton className="h-80 w-full rounded-xl" />
                  <Skeleton className="h-80 w-full rounded-xl" />
                </div>
              ) : profileError ? (
                <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-center text-xs text-destructive">
                  Unable to load concept analytics.
                </div>
              ) : profile ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <MasteryRadar
                    concepts={profile.mastery.concepts}
                    average={profile.mastery.average}
                  />
                  <TrendChart
                    history={profile.assessmentHistory}
                    assessmentAvg={profile.assessmentAvg}
                  />
                </div>
              ) : null}

              {/* Bottom Row: Targeted Recommendations Card */}
              {profileLoading ? (
                <Skeleton className="h-64 w-full rounded-xl" />
              ) : profile ? (
                <RecommendationCard
                  recommendations={profile.recommendations}
                  notAssessed={profile.notAssessed}
                />
              ) : null}
            </div>
          )}
        </>
      )}

      {/* TAB 2: MY COURSES */}
      {activeTab === 'courses' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">Enrolled Academic Courses</h2>
              <p className="text-xs text-muted-foreground">
                All degree courses where your attendance and concept mastery are tracked.
              </p>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {courses.length} {courses.length === 1 ? 'Course' : 'Courses'}
            </Badge>
          </div>

          {coursesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Skeleton className="h-48 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
          ) : courses.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium text-foreground">No enrolled courses</p>
              <p className="text-xs text-muted-foreground mt-1">
                You are not currently enrolled in any academic courses.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((c) => {
                const isCurrent = c.id === selectedCourseId;

                return (
                  <Card
                    key={c.id}
                    className={`transition-all relative overflow-hidden flex flex-col justify-between ${
                      isCurrent
                        ? 'border-primary/50 shadow-md ring-1 ring-primary/20 bg-card'
                        : 'hover:border-border/80 bg-card/70'
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <Badge
                          variant={isCurrent ? 'default' : 'secondary'}
                          className="font-mono text-xs"
                        >
                          {c.code}
                        </Badge>
                        {isCurrent && (
                          <Badge
                            variant="outline"
                            className="text-[10px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10 gap-1"
                          >
                            <Check className="w-3 h-3" /> Active View
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-base font-bold leading-tight">
                        {c.title}
                      </CardTitle>
                      <CardDescription className="text-xs line-clamp-2 mt-1">
                        {c.description || 'Comprehensive curriculum covering foundational principles and real-world implementations.'}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-0 space-y-4">
                      <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-indigo-400" />
                          Curriculum DAG
                        </span>
                        <span className="flex items-center gap-1.5">
                          <CalendarCheck className="w-3.5 h-3.5 text-emerald-400" />
                          Mode B Active
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          variant={isCurrent ? 'secondary' : 'default'}
                          size="sm"
                          className="flex-1 text-xs gap-1.5"
                          onClick={() => {
                            handleCourseChange(c.id);
                            handleTabChange('overview');
                          }}
                        >
                          <span>{isCurrent ? 'View Overview' : 'Switch & View'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => {
                            handleCourseChange(c.id);
                            handleTabChange('concepts');
                          }}
                        >
                          Concepts
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CONCEPT GRAPH */}
      {activeTab === 'concepts' && (
        <div className="space-y-4">
          <ConceptResourceViewer courseId={selectedCourseId} />
        </div>
      )}

      {/* TAB 4: CHECK-IN HISTORY */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-foreground">Lecture Check-In History</h2>
              <p className="text-xs text-muted-foreground">
                Verified attendance sessions for {selectedCourse?.title} ({selectedCourse?.code})
              </p>
            </div>

            <Button
              size="sm"
              onClick={() => navigate('/student/mark-attendance')}
              className="text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            >
              <CalendarCheck className="w-4 h-4" />
              Check In Now
            </Button>
          </div>

          {/* Attendance Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-card/60">
              <div className="text-xs font-medium text-muted-foreground">Attendance Rate</div>
              <div className="text-2xl font-bold font-mono mt-1 text-foreground">
                {attendance?.rate !== null && attendance?.rate !== undefined
                  ? formatPercent(attendance.rate)
                  : 'N/A'}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Target: &gt;= 75%
              </div>
            </Card>

            <Card className="p-4 bg-card/60">
              <div className="text-xs font-medium text-muted-foreground">Present</div>
              <div className="text-2xl font-bold font-mono mt-1 text-emerald-400">
                {attendance?.present ?? 0}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Verified lectures
              </div>
            </Card>

            <Card className="p-4 bg-card/60">
              <div className="text-xs font-medium text-muted-foreground">Flagged</div>
              <div className="text-2xl font-bold font-mono mt-1 text-amber-400">
                {attendance?.flagged ?? 0}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Awaiting instructor review
              </div>
            </Card>

            <Card className="p-4 bg-card/60">
              <div className="text-xs font-medium text-muted-foreground">Total Sessions</div>
              <div className="text-2xl font-bold font-mono mt-1 text-foreground">
                {attendance?.totalSessions ?? 0}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Completed classes
              </div>
            </Card>
          </div>

          {/* Detailed Sessions Table */}
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-emerald-400" />
                Session Verification Log
              </CardTitle>
              <CardDescription className="text-xs">
                History of completed sessions in chronological reverse order.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {attendanceLoading ? (
                <div className="p-6 space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : !attendance || attendance.history.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  <CalendarCheck className="w-8 h-8 mx-auto mb-2 opacity-40 text-muted-foreground" />
                  <p className="font-medium text-foreground">No lecture sessions concluded yet</p>
                  <p className="mt-0.5">Sessions will automatically appear here once your instructor closes them.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                      <tr>
                        <th className="py-3 px-4">Lecture Date & Time</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Verification Method</th>
                        <th className="py-3 px-4">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {attendance.history.map((s) => {
                        const isPresent = s.status === 'PRESENT';
                        const isFlagged = s.status === 'FLAGGED';

                        return (
                          <tr key={s.sessionId} className="hover:bg-muted/20 transition-colors">
                            <td className="py-3 px-4 font-mono font-medium text-foreground">
                              {new Date(s.date).toLocaleString(undefined, {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="py-3 px-4">
                              {isPresent ? (
                                <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 gap-1 text-[11px]">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Present
                                </Badge>
                              ) : isFlagged ? (
                                <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 gap-1 text-[11px]">
                                  <Clock className="w-3.5 h-3.5" />
                                  Flagged (Pending Review)
                                </Badge>
                              ) : (
                                <Badge className="bg-rose-500/15 text-rose-400 border-rose-500/30 gap-1 text-[11px]">
                                  <XCircle className="w-3.5 h-3.5" />
                                  Absent
                                </Badge>
                              )}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground font-mono">
                              Mode B (Biometrics + Rotating Code)
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {isPresent
                                ? 'Verified on-premises'
                                : isFlagged
                                ? 'Flagged for instructor manual verification'
                                : 'No verification recorded'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 5: MASTERY & GROWTH */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">Concept Mastery & Academic Growth</h2>
              <p className="text-xs text-muted-foreground">
                In-depth cognitive telemetry, learning trajectories, and remedial focus areas.
              </p>
            </div>
            {profile && (
              <Badge variant="outline" className="font-mono text-xs">
                Class Mean: {formatPercent(profile.mastery.average)}
              </Badge>
            )}
          </div>

          {/* Academic Standing Card */}
          {profile && (
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    Overall Academic Standing
                  </CardTitle>
                  <span className="text-xs font-mono text-muted-foreground">
                    Heuristic: 40% Attendance + 60% Mastery
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-1">
                <RiskBadge
                  level={profile.risk.level}
                  factors={profile.risk.factors}
                  variant="student"
                />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your academic standing is continuously updated. Keeping attendance above 75% and concept scores above 70% ensures you remain On Track.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Charts Row */}
          {profileLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Skeleton className="h-80 w-full rounded-xl" />
              <Skeleton className="h-80 w-full rounded-xl" />
            </div>
          ) : profileError ? (
            <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-center text-xs text-destructive">
              Unable to load concept analytics.
            </div>
          ) : profile ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MasteryRadar
                concepts={profile.mastery.concepts}
                average={profile.mastery.average}
              />
              <TrendChart
                history={profile.assessmentHistory}
                assessmentAvg={profile.assessmentAvg}
              />
            </div>
          ) : null}

          {/* Detailed Concept Breakdown Table */}
          {profile && profile.mastery.concepts.length > 0 && (
            <Card className="shadow-sm overflow-hidden">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  Concept Mastery Breakdown
                </CardTitle>
                <CardDescription className="text-xs">
                  Detailed status across all syllabus concepts in {selectedCourse?.code}.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                      <tr>
                        <th className="py-3 px-4">Concept</th>
                        <th className="py-3 px-4">Mastery Score</th>
                        <th className="py-3 px-4">Mastery Band</th>
                        <th className="py-3 px-4">Assessment Attempts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {profile.mastery.concepts.map((c) => {
                        const band = masteryBand(c.score);
                        const isUnassessed = c.attempts === 0;

                        return (
                          <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                            <td className="py-3 px-4 font-semibold text-foreground">
                              {c.name}
                            </td>
                            <td className="py-3 px-4 font-mono font-medium">
                              {isUnassessed ? '–' : formatPercent(c.score)}
                            </td>
                            <td className="py-3 px-4">
                              {isUnassessed ? (
                                <Badge variant="outline" className="text-[11px] text-muted-foreground bg-muted/20">
                                  Not Assessed
                                </Badge>
                              ) : (
                                <Badge className={`text-[11px] border ${band.bgColor} ${band.textColor} ${band.borderColor}`}>
                                  {band.label}
                                </Badge>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono text-muted-foreground">
                              {c.attempts} {c.attempts === 1 ? 'attempt' : 'attempts'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations Card */}
          {profileLoading ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : profile ? (
            <RecommendationCard
              recommendations={profile.recommendations}
              notAssessed={profile.notAssessed}
            />
          ) : null}
        </div>
      )}
    </div>
  );
};
