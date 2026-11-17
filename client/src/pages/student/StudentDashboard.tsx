import React, { useMemo, useState } from 'react';
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
import { AdaptivePracticeDialog } from '@/components/profile/AdaptivePracticeDialog';
import { ConceptSkillTree } from '@/components/profile/ConceptSkillTree';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatPercent } from '@/lib/mastery-ui';
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
  Network,
  Sparkles,
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [practiceConcept, setPracticeConcept] = useState<{ id: string; title: string } | null>(null);

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
              Student Dashboard v2
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
            Monitor attendance verification, track concept mastery, and explore targeted study recommendations.
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

      {/* Course Selector Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-card border shadow-sm">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-indigo-400 shrink-0" />
          <div>
            <div className="text-xs font-medium text-muted-foreground">Active Course View</div>
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
        /* Main Dashboard Grid */
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

            {/* 2. Academic Standing / Risk Status Card (Independent Error State) */}
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

          {/* Middle Row: Concept Progression (Skill Tree vs Radar & Trend View) */}
          {profileLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-9 w-64 rounded-lg" />
              <Skeleton className="h-96 w-full rounded-xl" />
            </div>
          ) : profileError ? (
            <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-center text-xs text-destructive">
              Unable to load concept analytics.
            </div>
          ) : profile ? (
            <Tabs defaultValue="skill-tree" className="w-full space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <TabsList className="bg-slate-900 border border-slate-800 p-1">
                  <TabsTrigger
                    value="skill-tree"
                    className="text-xs gap-1.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-medium"
                  >
                    <Network className="w-3.5 h-3.5" />
                    Adaptive Skill Tree
                  </TabsTrigger>
                  <TabsTrigger
                    value="charts"
                    className="text-xs gap-1.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-medium"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Mastery Radar & Quiz Trends
                  </TabsTrigger>
                </TabsList>

                <p className="text-xs text-muted-foreground hidden sm:block">
                  Explore prerequisite pathways and multi-axis performance analytics
                </p>
              </div>

              <TabsContent value="skill-tree" className="m-0 focus-visible:outline-none">
                <ConceptSkillTree
                  concepts={profile.mastery.concepts}
                  onStartPractice={(id, title) => setPracticeConcept({ id, title })}
                />
              </TabsContent>

              <TabsContent value="charts" className="m-0 focus-visible:outline-none">
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
              </TabsContent>
            </Tabs>
          ) : null}

          {/* Bottom Row: Targeted Recommendations Card */}
          {profileLoading ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : profile ? (
            <RecommendationCard
              recommendations={profile.recommendations}
              notAssessed={profile.notAssessed}
              onStartPractice={(conceptId, conceptTitle) =>
                setPracticeConcept({ id: conceptId, title: conceptTitle })
              }
            />
          ) : null}

          {/* Interactive Adaptive Practice Drill Dialog */}
          <AdaptivePracticeDialog
            isOpen={Boolean(practiceConcept)}
            conceptId={practiceConcept?.id || null}
            conceptTitle={practiceConcept?.title}
            onClose={() => setPracticeConcept(null)}
          />
        </div>
      )}
    </div>
  );
};
