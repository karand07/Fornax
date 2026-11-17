import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  GraduationCap,
  CalendarCheck,
  Award,
  User,
  AlertCircle,
} from 'lucide-react';
import {
  useStudentProfile,
  useCourse,
  useCourseEnrollments,
} from '@/api/hooks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RiskBadge } from '@/components/profile/RiskBadge';
import { MasteryRadar } from '@/components/profile/MasteryRadar';
import { TrendChart } from '@/components/profile/TrendChart';
import { RecommendationCard } from '@/components/profile/RecommendationCard';
import { formatPercent } from '@/lib/mastery-ui';

export const TeacherStudentProfilePage: React.FC = () => {
  const { id: courseIdParam, courseId: courseIdParamAlt, studentId } = useParams<{
    id?: string;
    courseId?: string;
    studentId: string;
  }>();
  const navigate = useNavigate();

  const courseId = courseIdParam || courseIdParamAlt || '';

  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useStudentProfile(studentId, courseId);

  const { data: course } = useCourse(courseId);
  const { data: enrollments } = useCourseEnrollments(courseId);

  const handleStudentSwitch = (newStudentId: string) => {
    navigate(`/teacher/courses/${courseId}/students/${newStudentId}`);
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Top Header / Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-card border shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                Student Academic Profile
              </span>
              {course && (
                <Badge variant="outline" className="font-mono text-[11px]">
                  {course.code}
                </Badge>
              )}
            </div>
            <h1 className="text-lg md:text-xl font-bold text-foreground">
              {profile ? profile.student.name : 'Loading Profile...'}
            </h1>
          </div>
        </div>

        {/* Student Switcher Dropdown */}
        {enrollments && enrollments.length > 0 && (
          <div className="flex items-center gap-2 w-full sm:w-72">
            <User className="w-4 h-4 text-muted-foreground shrink-0" />
            <Select value={studentId} onValueChange={handleStudentSwitch}>
              <SelectTrigger className="w-full text-xs bg-background">
                <SelectValue placeholder="Switch Student" />
              </SelectTrigger>
              <SelectContent>
                {enrollments.map((e) => (
                  <SelectItem key={e.userId} value={e.userId} className="text-xs">
                    {e.user.firstName} {e.user.lastName} ({e.user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {profileLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-32 w-full rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-80 w-full rounded-xl" />
            <Skeleton className="h-80 w-full rounded-xl" />
          </div>
        </div>
      ) : profileError || !profile ? (
        <Card className="border-destructive/40 bg-destructive/10 p-8 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
          <h3 className="text-base font-semibold text-foreground">Unable to load student profile</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            The student profile could not be loaded. Please ensure the student is currently enrolled in this course.
          </p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Student Overview & Risk Banner */}
          <Card className="border bg-card/60 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-bold">{profile.student.name}</CardTitle>
                    <span className="text-xs text-muted-foreground font-mono">
                      ({profile.student.email})
                    </span>
                  </div>
                  <CardDescription className="text-xs">
                    Enrolled in {profile.course.code} — {profile.course.title}
                  </CardDescription>
                </div>

                {/* Teacher variant Risk Badge */}
                <div className="p-3 rounded-lg border bg-background/50">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Risk Assessment
                  </span>
                  <RiskBadge
                    level={profile.risk.level}
                    factors={profile.risk.factors}
                    score={profile.risk.score}
                    usedWeights={profile.risk.usedWeights}
                    variant="teacher"
                  />
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Attendance Metric */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5 font-medium">
                    <CalendarCheck className="w-4 h-4 text-emerald-400" /> Attendance Rate
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {profile.attendance.attended}/{profile.attendance.total} Sessions
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold font-mono text-foreground">
                  {formatPercent(profile.attendance.rate)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {profile.attendance.total > 0
                    ? `Attended ${profile.attendance.attended} of ${profile.attendance.total} completed lectures`
                    : 'No ended lectures evaluated yet'}
                </p>
              </CardContent>
            </Card>

            {/* Mastery Metric */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5 font-medium">
                    <GraduationCap className="w-4 h-4 text-indigo-400" /> Concept Mastery Avg
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {(profile.mastery?.concepts ?? (profile as any).concepts ?? []).length} Topics
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold font-mono text-foreground">
                  {formatPercent(profile.mastery?.average ?? (profile as any).avgMastery)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Average score across assessed curriculum topics
                </p>
              </CardContent>
            </Card>

            {/* Assessment History Metric */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Award className="w-4 h-4 text-amber-400" /> Assessment Average
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {(profile.assessmentHistory ?? (profile as any).assessments ?? []).length} Graded
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold font-mono text-foreground">
                  {formatPercent(profile.assessmentAvg)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Average across all completed assessments
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Visualizations Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Concept Mastery Radar */}
            <MasteryRadar
              concepts={profile.mastery?.concepts ?? (profile as any).concepts ?? []}
              average={profile.mastery?.average ?? (profile as any).avgMastery}
            />

            {/* Assessment History & Trajectory Line Chart */}
            <TrendChart
              history={profile.assessmentHistory ?? (profile as any).assessments ?? []}
              assessmentAvg={profile.assessmentAvg}
            />
          </div>

          {/* Remediation & Recommendations */}
          <div>
            <RecommendationCard
              recommendations={profile.recommendations}
              notAssessed={profile.notAssessed}
            />
          </div>
        </div>
      )}
    </div>
  );
};
