import React, { useState, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/auth-context';
import {
  useCourses,
  useMyEnrolledCourses,
  useEnrollCourse,
  useUnenrollCourse,
  useStudentCourseAttendance,
  useCourseAssessments,
  useFaceStatus,
  useStudentProfile,
  useMyAttendance,
} from '@/api/hooks';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { RiskBadge } from '@/components/profile/RiskBadge';
import { MasteryRadar, type ConceptMasteryItem } from '@/components/profile/MasteryRadar';
import { TrendChart, type AssessmentHistoryItem } from '@/components/profile/TrendChart';
import { RecommendationCard } from '@/components/profile/RecommendationCard';
import { AdaptivePracticeDialog } from '@/components/profile/AdaptivePracticeDialog';
import { AdaptiveQuizModal } from '@/components/profile/AdaptiveQuizModal';
import { StudyNotesDialog } from '@/components/profile/StudyNotesDialog';
import { ConceptSkillTree } from '@/components/profile/ConceptSkillTree';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ConceptResourceViewer } from '@/components/ConceptResourceViewer';
import { ProfileSettingsDialog } from '@/components/profile/ProfileSettingsDialog';
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
  Network,
  Sparkles,
  BrainCircuit,
  BookOpen,
  Layers,
  XCircle,
  Check,
  Plus,
  Trash2,
  Search,
  Compass,
  Loader2,
  Globe,
  Filter,
  UserCog,
  QrCode,
} from 'lucide-react';

const VALID_TABS = ['overview', 'courses', 'concepts', 'attendance', 'analytics'] as const;
type DashboardTab = typeof VALID_TABS[number];

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [practiceConcept, setPracticeConcept] = useState<{ id: string; title: string } | null>(null);
  const [isAdaptiveQuizOpen, setIsAdaptiveQuizOpen] = useState(false);
  const [notesConcept, setNotesConcept] = useState<{ id?: string; title?: string } | null>(null);

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
  const { data: enrolledCoursesData, isLoading: enrolledLoading } = useMyEnrolledCourses();
  const { data: allCoursesData, isLoading: allCoursesLoading } = useCourses();
  const { data: faceStatus } = useFaceStatus();

  const enrollMutation = useEnrollCourse();
  const unenrollMutation = useUnenrollCourse();

  const enrolledCourses = useMemo(() => enrolledCoursesData || [], [enrolledCoursesData]);
  const allCourses = useMemo(() => allCoursesData || [], [allCoursesData]);
  const courses = enrolledCourses;

  const coursesLoading = enrolledLoading;

  // State for Course Management Tab
  const [courseCatalogTab, setCourseCatalogTab] = useState<'enrolled' | 'explore'>('enrolled');
  const [courseSearch, setCourseSearch] = useState('');
  const [courseToDrop, setCourseToDrop] = useState<{ id: string; code: string; title: string } | null>(null);
  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null);
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);

  const unenrolledCourses = useMemo(() => {
    return allCourses.filter((ac) => !enrolledCourses.some((ec) => ec.id === ac.id));
  }, [allCourses, enrolledCourses]);

  const filteredEnrolledCourses = useMemo(() => {
    if (!courseSearch.trim()) return enrolledCourses;
    const q = courseSearch.toLowerCase();
    return enrolledCourses.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
    );
  }, [enrolledCourses, courseSearch]);

  const filteredExploreCourses = useMemo(() => {
    if (!courseSearch.trim()) return unenrolledCourses;
    const q = courseSearch.toLowerCase();
    return unenrolledCourses.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        (c.teacher && `${c.teacher.firstName} ${c.teacher.lastName}`.toLowerCase().includes(q))
    );
  }, [unenrolledCourses, courseSearch]);

  const handleEnroll = async (courseId: string) => {
    setEnrollingCourseId(courseId);
    try {
      await enrollMutation.mutateAsync(courseId);
      handleCourseChange(courseId);
      setCourseCatalogTab('enrolled');
    } catch (err: any) {
      console.error('Failed to enroll:', err);
    } finally {
      setEnrollingCourseId(null);
    }
  };

  const handleConfirmDrop = async () => {
    if (!courseToDrop) return;
    try {
      await unenrollMutation.mutateAsync(courseToDrop.id);
      if (selectedCourseId === courseToDrop.id) {
        const remaining = enrolledCourses.filter((c) => c.id !== courseToDrop.id);
        if (remaining.length > 0) {
          handleCourseChange(remaining[0].id);
        } else {
          const nextParams = new URLSearchParams(searchParams);
          nextParams.delete('courseId');
          setSearchParams(nextParams);
        }
      }
      setCourseToDrop(null);
    } catch (err: any) {
      console.error('Failed to unenroll:', err);
    }
  };

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

  // Cross-Course Lifetime Attendance (GET /api/attendance/my-history)
  const {
    data: myGlobalAttendanceData,
    isLoading: myGlobalAttendanceLoading,
  } = useMyAttendance();

  const [attendanceScope, setAttendanceScope] = useState<'current' | 'all'>('current');
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<string>('ALL');
  const [attendanceSearch, setAttendanceSearch] = useState<string>('');

  const globalAttendanceRecords = useMemo(() => myGlobalAttendanceData || [], [myGlobalAttendanceData]);

  const globalStats = useMemo(() => {
    const total = globalAttendanceRecords.length;
    const present = globalAttendanceRecords.filter((r) => r.status === 'PRESENT').length;
    const flagged = globalAttendanceRecords.filter((r) => r.status === 'FLAGGED').length;
    const absent = globalAttendanceRecords.filter((r) => r.status === 'ABSENT').length;
    const rate = total > 0 ? Math.round((present / total) * 100) : null;
    return { total, present, flagged, absent, rate };
  }, [globalAttendanceRecords]);

  const filteredGlobalRecords = useMemo(() => {
    return globalAttendanceRecords.filter((r) => {
      if (attendanceStatusFilter !== 'ALL' && r.status !== attendanceStatusFilter) {
        return false;
      }
      if (attendanceSearch.trim()) {
        const q = attendanceSearch.toLowerCase();
        const courseMatch =
          r.session?.course?.code?.toLowerCase().includes(q) ||
          r.session?.course?.title?.toLowerCase().includes(q);
        const sessionMatch = r.session?.title?.toLowerCase().includes(q);
        return Boolean(courseMatch || sessionMatch);
      }
      return true;
    });
  }, [globalAttendanceRecords, attendanceStatusFilter, attendanceSearch]);

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

  // Robust fallbacks for profile mastery and assessment history
  const profileConcepts: ConceptMasteryItem[] = useMemo(() => {
    if (!profile) return [];
    if (profile.mastery?.concepts && Array.isArray(profile.mastery.concepts)) {
      return profile.mastery.concepts;
    }
    if ((profile as any).concepts && Array.isArray((profile as any).concepts)) {
      return (profile as any).concepts.map((c: any) => ({
        id: c.conceptId || c.id || c.name,
        conceptId: c.conceptId || c.id,
        name: c.name,
        score: c.score ?? 0,
        attempts: c.attempts ?? 0,
        prerequisiteId: c.prerequisiteId ?? null,
      }));
    }
    return [];
  }, [profile]);

  const profileMasteryAvg: number | undefined = useMemo(() => {
    if (!profile) return undefined;
    return profile.mastery?.average ?? (profile as any).avgMastery ?? undefined;
  }, [profile]);

  const profileHistory: AssessmentHistoryItem[] = useMemo(() => {
    if (!profile) return [];
    if (profile.assessmentHistory && Array.isArray(profile.assessmentHistory)) {
      return profile.assessmentHistory;
    }
    if ((profile as any).assessments && Array.isArray((profile as any).assessments)) {
      return (profile as any).assessments.map((a: any) => ({
        assessmentId: a.assessmentId || a.id || '',
        title: a.title || 'Assessment',
        date: a.date || (typeof a.submittedAt === 'string' ? a.submittedAt : a.submittedAt?.toISOString ? a.submittedAt.toISOString() : ''),
        score: a.score ?? a.awarded ?? 0,
        max: a.max ?? 0,
        percentage: a.percentage ?? 0,
      }));
    }
    return [];
  }, [profile]);

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
            onClick={() => navigate('/student/mark-attendance?mode=qr&scan=true')}
            className="text-xs font-semibold gap-1.5 border-border bg-slate-900/60 hover:bg-slate-800 text-slate-200"
          >
            <QrCode className="w-3.5 h-3.5 text-blue-400" />
            <span>Scan QR</span>
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

          <Button
            variant="outline"
            size="sm"
            onClick={() => setProfileSettingsOpen(true)}
            className="text-xs gap-1.5"
          >
            <UserCog className="w-4 h-4 text-primary" />
            Account Settings
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

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Button
              size="sm"
              onClick={() => setIsAdaptiveQuizOpen(true)}
              className="text-xs h-8 gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-sm font-medium"
            >
              <BrainCircuit className="w-3.5 h-3.5 text-indigo-200" />
              <span>AI Dynamic Challenge</span>
            </Button>

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
            <Card className="p-8 text-center border-dashed">
              <Compass className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-semibold text-foreground">You are not enrolled in any courses yet</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Explore the course catalog to enroll in courses and begin tracking your attendance, cognitive telemetry, and concept mastery.
              </p>
              <Button
                variant="default"
                size="sm"
                className="mt-4 gap-2 text-xs"
                onClick={() => {
                  handleTabChange('courses');
                  setCourseCatalogTab('explore');
                }}
              >
                <Plus className="w-4 h-4" /> Browse Course Catalog
              </Button>
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
                    concepts={profileConcepts}
                    average={profileMasteryAvg}
                  />
                  <TrendChart
                    history={profileHistory}
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

      {/* TAB 2: MY COURSES & COURSE CATALOG */}
      {activeTab === 'courses' && (
        <div className="space-y-6">
          {/* Top Header & Sub-tab Pill Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">Academic Courses</h2>
              <p className="text-xs text-muted-foreground">
                Manage your enrolled classes or discover available courses across the academic curriculum.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border border-border/60 self-start sm:self-auto">
              <Button
                variant={courseCatalogTab === 'enrolled' ? 'default' : 'ghost'}
                size="sm"
                className="text-xs h-8 gap-1.5"
                onClick={() => setCourseCatalogTab('enrolled')}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>My Enrolled</span>
                <Badge
                  variant={courseCatalogTab === 'enrolled' ? 'secondary' : 'outline'}
                  className="ml-1 text-[10px] px-1.5 py-0 font-mono"
                >
                  {enrolledCourses.length}
                </Badge>
              </Button>

              <Button
                variant={courseCatalogTab === 'explore' ? 'default' : 'ghost'}
                size="sm"
                className="text-xs h-8 gap-1.5"
                onClick={() => setCourseCatalogTab('explore')}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Explore Catalog</span>
                {unenrolledCourses.length > 0 && (
                  <Badge
                    variant={courseCatalogTab === 'explore' ? 'secondary' : 'outline'}
                    className="ml-1 text-[10px] px-1.5 py-0 font-mono text-indigo-400 border-indigo-500/30"
                  >
                    {unenrolledCourses.length}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder={
                courseCatalogTab === 'enrolled'
                  ? 'Search enrolled courses...'
                  : 'Search course catalog by title, code, instructor...'
              }
              value={courseSearch}
              onChange={(e) => setCourseSearch(e.target.value)}
              className="text-xs pl-9 h-9"
            />
          </div>

          {/* VIEW A: ENROLLED COURSES */}
          {courseCatalogTab === 'enrolled' && (
            <>
              {coursesLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Skeleton className="h-48 w-full rounded-xl" />
                  <Skeleton className="h-48 w-full rounded-xl" />
                </div>
              ) : enrolledCourses.length === 0 ? (
                <Card className="p-8 text-center border-dashed">
                  <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium text-foreground">No enrolled courses</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    You are not currently enrolled in any academic courses. Browse available courses in the catalog to get started.
                  </p>
                  <Button
                    variant="default"
                    size="sm"
                    className="mt-4 gap-1.5 text-xs"
                    onClick={() => setCourseCatalogTab('explore')}
                  >
                    <Plus className="w-4 h-4" /> Explore Course Catalog
                  </Button>
                </Card>
              ) : filteredEnrolledCourses.length === 0 ? (
                <Card className="p-8 text-center border-dashed">
                  <p className="text-sm font-medium text-foreground">No enrolled courses match your search</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-xs"
                    onClick={() => setCourseSearch('')}
                  >
                    Clear Search
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredEnrolledCourses.map((c) => {
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
                            {c.description ||
                              'Comprehensive curriculum covering foundational principles and real-world implementations.'}
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

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => setCourseToDrop({ id: c.id, code: c.code, title: c.title })}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs">
                                  Drop Course
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* VIEW B: EXPLORE COURSE CATALOG */}
          {courseCatalogTab === 'explore' && (
            <>
              {allCoursesLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Skeleton className="h-48 w-full rounded-xl" />
                  <Skeleton className="h-48 w-full rounded-xl" />
                </div>
              ) : filteredExploreCourses.length === 0 ? (
                <Card className="p-8 text-center border-dashed">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-70" />
                  <p className="text-sm font-medium text-foreground">
                    {courseSearch ? 'No courses match your search filter' : 'You are enrolled in all available courses!'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    {courseSearch
                      ? 'Try modifying your search terms.'
                      : 'All published university curriculum courses are already linked to your student profile.'}
                  </p>
                  {courseSearch ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-3 text-xs"
                      onClick={() => setCourseSearch('')}
                    >
                      Clear Search
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 text-xs"
                      onClick={() => setCourseCatalogTab('enrolled')}
                    >
                      Return to Enrolled Courses
                    </Button>
                  )}
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredExploreCourses.map((c) => {
                    const isEnrolling = enrollingCourseId === c.id;

                    return (
                      <Card
                        key={c.id}
                        className="flex flex-col justify-between border-border/80 bg-card/60 hover:border-primary/40 transition-all hover:shadow-sm"
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <Badge variant="outline" className="font-mono text-xs text-primary border-primary/30">
                              {c.code}
                            </Badge>
                            {c.teacher && (
                              <span className="text-[11px] text-muted-foreground font-medium">
                                Prof. {c.teacher.firstName} {c.teacher.lastName}
                              </span>
                            )}
                          </div>
                          <CardTitle className="text-base font-bold leading-tight">
                            {c.title}
                          </CardTitle>
                          <CardDescription className="text-xs line-clamp-3 mt-1 leading-relaxed">
                            {c.description ||
                              'Comprehensive syllabus covering core domain fundamentals, problem-solving rubrics, and project-based evaluation.'}
                          </CardDescription>
                        </CardHeader>

                        <CardContent className="pt-0 space-y-4">
                          <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5 text-indigo-400" />
                              {c._count?.concepts ?? c.concepts?.length ?? 0} Concepts
                            </span>
                            <span className="flex items-center gap-1.5">
                              <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                              Self-Enrollment Open
                            </span>
                          </div>

                          <Button
                            variant="default"
                            size="sm"
                            disabled={isEnrolling}
                            className="w-full text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                            onClick={() => handleEnroll(c.id)}
                          >
                            {isEnrolling ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Enrolling...</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                <span>Enroll in Course</span>
                              </>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Drop Course Confirmation Dialog */}
          <Dialog open={Boolean(courseToDrop)} onOpenChange={(open) => !open && setCourseToDrop(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  Drop Course Confirmation
                </DialogTitle>
                <DialogDescription className="text-xs leading-relaxed pt-2">
                  Are you sure you want to drop{' '}
                  <span className="font-semibold text-foreground">
                    {courseToDrop?.code} — {courseToDrop?.title}
                  </span>
                  ? You will lose active attendance tracking and assessment submissions for this course until re-enrolled.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCourseToDrop(null)}
                  disabled={unenrollMutation.isPending}
                  className="text-xs"
                >
                  Keep Course
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={unenrollMutation.isPending}
                  onClick={handleConfirmDrop}
                  className="text-xs gap-1.5"
                >
                  {unenrollMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Dropping...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Confirm Drop</span>
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
          {/* Top Header & Scope Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {attendanceScope === 'current' ? 'Lecture Check-In History' : 'Global Attendance Telemetry'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {attendanceScope === 'current'
                  ? `Verified attendance sessions for ${selectedCourse?.title || 'active course'} (${selectedCourse?.code || ''})`
                  : 'Institutional attendance verification records across all enrolled courses.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-lg border border-border/60">
                <Button
                  variant={attendanceScope === 'current' ? 'default' : 'ghost'}
                  size="sm"
                  className="text-xs h-8 gap-1.5"
                  onClick={() => setAttendanceScope('current')}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{selectedCourse?.code || 'Current Course'}</span>
                </Button>

                <Button
                  variant={attendanceScope === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  className="text-xs h-8 gap-1.5"
                  onClick={() => setAttendanceScope('all')}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>All Courses</span>
                  {globalAttendanceRecords.length > 0 && (
                    <Badge
                      variant={attendanceScope === 'all' ? 'secondary' : 'outline'}
                      className="ml-1 text-[10px] px-1.5 py-0 font-mono"
                    >
                      {globalAttendanceRecords.length}
                    </Badge>
                  )}
                </Button>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/student/mark-attendance?mode=qr&scan=true')}
                className="text-xs font-semibold gap-1.5 border-border bg-slate-900/60 hover:bg-slate-800 text-slate-200 h-8"
              >
                <QrCode className="w-3.5 h-3.5 text-blue-400" />
                <span>Scan QR</span>
              </Button>

              <Button
                size="sm"
                onClick={() => navigate('/student/mark-attendance')}
                className="text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm h-8"
              >
                <CalendarCheck className="w-4 h-4" />
                Check In Now
              </Button>
            </div>
          </div>

          {/* VIEW A: CURRENT COURSE STATS */}
          {attendanceScope === 'current' ? (
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
          ) : (
            /* VIEW B: ALL COURSES STATS */
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 bg-card/60">
                <div className="text-xs font-medium text-muted-foreground">Global Present Rate</div>
                <div className="text-2xl font-bold font-mono mt-1 text-foreground">
                  {globalStats.rate !== null ? `${globalStats.rate}%` : 'N/A'}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Across all enrolled subjects
                </div>
              </Card>

              <Card className="p-4 bg-card/60">
                <div className="text-xs font-medium text-muted-foreground">Total Present</div>
                <div className="text-2xl font-bold font-mono mt-1 text-emerald-400">
                  {globalStats.present}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Verified check-ins
                </div>
              </Card>

              <Card className="p-4 bg-card/60">
                <div className="text-xs font-medium text-muted-foreground">Pending Review</div>
                <div className="text-2xl font-bold font-mono mt-1 text-amber-400">
                  {globalStats.flagged}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Flagged verifications
                </div>
              </Card>

              <Card className="p-4 bg-card/60">
                <div className="text-xs font-medium text-muted-foreground">All Sessions Logged</div>
                <div className="text-2xl font-bold font-mono mt-1 text-foreground">
                  {globalStats.total}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Institutional check-ins
                </div>
              </Card>
            </div>
          )}

          {/* Filter Bar for All Courses History */}
          {attendanceScope === 'all' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="relative max-w-sm flex-1">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Filter by course code or session title..."
                  value={attendanceSearch}
                  onChange={(e) => setAttendanceSearch(e.target.value)}
                  className="text-xs pl-9 h-8"
                />
              </div>

              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <Filter className="w-3.5 h-3.5 text-muted-foreground mr-1" />
                {(['ALL', 'PRESENT', 'FLAGGED', 'ABSENT'] as const).map((status) => (
                  <Button
                    key={status}
                    variant={attendanceStatusFilter === status ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    onClick={() => setAttendanceStatusFilter(status)}
                  >
                    {status}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* TABLE: CURRENT COURSE HISTORY */}
          {attendanceScope === 'current' ? (
            <Card className="shadow-sm overflow-hidden">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-emerald-400" />
                  Session Verification Log ({selectedCourse?.code || 'Active Course'})
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
          ) : (
            /* TABLE: ALL COURSES GLOBAL HISTORY */
            <Card className="shadow-sm overflow-hidden">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Globe className="w-4 h-4 text-indigo-400" />
                  Lifetime Institutional Attendance Log
                </CardTitle>
                <CardDescription className="text-xs">
                  All recorded verification events across degree coursework from `GET /api/attendance/my-history`.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {myGlobalAttendanceLoading ? (
                  <div className="p-6 space-y-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : globalAttendanceRecords.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    <CalendarCheck className="w-8 h-8 mx-auto mb-2 opacity-40 text-muted-foreground" />
                    <p className="font-medium text-foreground">No attendance check-ins recorded yet</p>
                    <p className="mt-0.5">Use the Mark Attendance portal to verify your attendance during active lecture sessions.</p>
                  </div>
                ) : filteredGlobalRecords.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">No records match your filter</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-xs"
                      onClick={() => {
                        setAttendanceSearch('');
                        setAttendanceStatusFilter('ALL');
                      }}
                    >
                      Reset Filters
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                        <tr>
                          <th className="py-3 px-4">Course</th>
                          <th className="py-3 px-4">Lecture / Session</th>
                          <th className="py-3 px-4">Date & Time</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Method</th>
                          <th className="py-3 px-4">Integrity</th>
                          <th className="py-3 px-4">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {filteredGlobalRecords.map((r) => {
                          const isPresent = r.status === 'PRESENT';
                          const isFlagged = r.status === 'FLAGGED';
                          const integrity =
                            r.integrityScore !== null && r.integrityScore !== undefined
                              ? Math.round(r.integrityScore * 100)
                              : null;

                          return (
                            <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                              <td className="py-3 px-4 font-mono font-medium">
                                <Badge variant="outline" className="text-[11px] font-mono">
                                  {r.session?.course?.code || 'COURSE'}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 font-semibold text-foreground">
                                {r.session?.title || 'Class Lecture Session'}
                              </td>
                              <td className="py-3 px-4 font-mono text-muted-foreground whitespace-nowrap">
                                {new Date(r.timestamp).toLocaleString(undefined, {
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
                                    Flagged
                                  </Badge>
                                ) : (
                                  <Badge className="bg-rose-500/15 text-rose-400 border-rose-500/30 gap-1 text-[11px]">
                                    <XCircle className="w-3.5 h-3.5" />
                                    Absent
                                  </Badge>
                                )}
                              </td>
                              <td className="py-3 px-4 text-muted-foreground font-mono">
                                {r.method || r.verifiedBy || 'SELF'}
                              </td>
                              <td className="py-3 px-4 font-mono">
                                {integrity !== null ? (
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] ${
                                      integrity >= 85
                                        ? 'text-emerald-400 border-emerald-500/30'
                                        : 'text-amber-400 border-amber-500/30'
                                    }`}
                                  >
                                    {integrity}%
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-muted-foreground">
                                {isPresent
                                  ? r.livenessPassed !== false
                                    ? 'On-premises verified ✓'
                                    : 'Verified'
                                  : isFlagged
                                  ? 'Instructor review pending'
                                  : 'No verification record'}
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
          )}
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
            {profile && profileMasteryAvg !== undefined && (
              <Badge variant="outline" className="font-mono text-xs">
                Class Mean: {formatPercent(profileMasteryAvg)}
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
                  Status is updated automatically after every graded quiz and class attendance review. Keeping attendance above 75% and concept scores above 70% ensures you remain On Track.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAdaptiveQuizOpen(true)}
                  className="w-full text-xs h-8 gap-1.5 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10 font-medium"
                >
                  <BrainCircuit className="w-3.5 h-3.5 text-indigo-400" />
                  Take AI Performance Booster
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Charts Row: Concept Progression & Multi-Axis Analytics */}
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
                  concepts={profileConcepts}
                  onStartPractice={(id, title) => setPracticeConcept({ id, title })}
                  onViewNotes={(id, title) => setNotesConcept({ id, title })}
                />
              </TabsContent>

              <TabsContent value="charts" className="m-0 focus-visible:outline-none">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <MasteryRadar
                    concepts={profileConcepts}
                    average={profileMasteryAvg}
                  />
                  <TrendChart
                    history={profileHistory}
                    assessmentAvg={profile.assessmentAvg}
                  />
                </div>
              </TabsContent>
            </Tabs>
          ) : null}

          {/* Detailed Concept Breakdown Table */}
          {profile && profileConcepts.length > 0 && (
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
                      {profileConcepts.map((c) => {
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
              onStartPractice={(conceptId, conceptTitle) =>
                setPracticeConcept({ id: conceptId, title: conceptTitle })
              }
              onViewNotes={(conceptId, conceptTitle) =>
                setNotesConcept({ id: conceptId, title: conceptTitle })
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

          {/* Autonomous AI Adaptive Challenge Quiz Modal */}
          <AdaptiveQuizModal
            isOpen={isAdaptiveQuizOpen}
            studentId={user?.id || ''}
            courseId={selectedCourseId}
            courseTitle={selectedCourse?.title}
            onClose={() => setIsAdaptiveQuizOpen(false)}
          />

          {/* Personalized High-Yield Study Notes Dialog */}
          <StudyNotesDialog
            isOpen={Boolean(notesConcept)}
            studentId={user?.id || ''}
            courseId={selectedCourseId}
            conceptId={notesConcept?.id || null}
            conceptTitle={notesConcept?.title}
            onClose={() => setNotesConcept(null)}
          />
        </div>
      )}

      {/* Account Profile Settings Modal */}
      <ProfileSettingsDialog
        open={profileSettingsOpen}
        onOpenChange={setProfileSettingsOpen}
      />
    </div>
  );
};
