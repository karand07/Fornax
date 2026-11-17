import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  RefreshCw,
  AlertCircle,
  GraduationCap,
  Users,
} from 'lucide-react';
import {
  useCourseAnalytics,
  useCourse,
  downloadCourseAnalyticsCsv,
} from '../../api/hooks';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { SummaryStrip } from '../../components/analytics/SummaryStrip';
import { Heatmap } from '../../components/analytics/Heatmap';
import { WeakestConcepts } from '../../components/analytics/WeakestConcepts';
import { AtRiskList } from '../../components/analytics/AtRiskList';
import { SessionsChart } from '../../components/analytics/SessionsChart';

export const TeacherAnalyticsPage = () => {
  const { id: courseIdParam, courseId: courseIdParamAlt } = useParams<{
    id?: string;
    courseId?: string;
  }>();
  const navigate = useNavigate();

  const courseId = courseIdParam || courseIdParamAlt || '';

  const {
    data: analytics,
    isLoading: analyticsLoading,
    error: analyticsError,
    refetch,
    isFetching,
  } = useCourseAnalytics(courseId);

  const { data: course } = useCourse(courseId);

  // CSV download state
  const [isExporting, setIsExporting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleExportCsv = async () => {
    if (!courseId) return;
    setIsExporting(true);
    setToastMessage(null);
    try {
      await downloadCourseAnalyticsCsv(courseId);
      setToastMessage({
        type: 'success',
        text: 'Analytics report exported successfully.',
      });
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to export CSV';
      setToastMessage({
        type: 'error',
        text: msg,
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Mean of row average masteries
  const classAverageMastery = useMemo(() => {
    if (!analytics || analytics.rows.length === 0) return null;
    const assessedRows = analytics.rows.filter((r) => r.avgMastery !== null);
    if (assessedRows.length === 0) return null;
    const sum = assessedRows.reduce((acc, r) => acc + r.avgMastery!, 0);
    return sum / assessedRows.length;
  }, [analytics]);

  // Mean of row attendance rates
  const classAverageAttendance = useMemo(() => {
    if (!analytics || analytics.rows.length === 0) return null;
    const assessedRows = analytics.rows.filter((r) => r.attendanceRate !== null);
    if (assessedRows.length === 0) return null;
    const sum = assessedRows.reduce((acc, r) => acc + r.attendanceRate!, 0);
    return sum / assessedRows.length;
  }, [analytics]);

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Toast Alert */}
      {toastMessage && (
        <Alert
          variant={toastMessage.type === 'error' ? 'destructive' : 'default'}
          className={
            toastMessage.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : ''
          }
        >
          <AlertTitle className="text-xs font-semibold">
            {toastMessage.type === 'success' ? 'Export Complete' : 'Export Failed'}
          </AlertTitle>
          <AlertDescription className="text-xs">{toastMessage.text}</AlertDescription>
        </Alert>
      )}

      {/* Top Header & Actions Bar */}
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
                Teacher Analytics
              </span>
              {course && (
                <Badge variant="outline" className="font-mono text-[11px]">
                  {course.code}
                </Badge>
              )}
            </div>
            <h1 className="text-lg md:text-xl font-bold text-foreground">
              {course ? `${course.title} — Analytics` : 'Course Analytics'}
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {analytics?.generatedAt && (
            <span className="text-xs text-muted-foreground font-mono hidden md:inline">
              Updated: {new Date(analytics.generatedAt).toLocaleTimeString()}
            </span>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleExportCsv}
            disabled={isExporting || analyticsLoading}
            className="text-xs gap-1.5 bg-primary text-primary-foreground"
          >
            <Download className="w-3.5 h-3.5" />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {analyticsLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
          <Skeleton className="h-96 w-full rounded-xl" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      ) : analyticsError || !analytics ? (
        <Card className="border-destructive/40 bg-destructive/10 p-8 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
          <h3 className="text-base font-semibold text-foreground">
            Unable to load course analytics
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {analyticsError instanceof Error ? analyticsError.message : 'Failed to retrieve analytics data.'}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </Card>
      ) : analytics.coverage.studentsTotal === 0 ? (
        /* Empty State: No students enrolled */
        <Card className="p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <Users className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">No Students Enrolled</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Analytics requires enrolled students to calculate attendance and topic mastery.
            </p>
          </div>
          <Link to={`/teacher/courses/${courseId}/assessments`}>
            <Button variant="outline" size="sm" className="text-xs">
              View Course Hub
            </Button>
          </Link>
        </Card>
      ) : analytics.concepts.length === 0 ? (
        /* Empty State: No concepts created */
        <Card className="p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">No Concepts Mapped</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Please define course curriculum concepts and map them in prerequisite graphs to enable the heatmap.
            </p>
          </div>
          <Link to={`/teacher/courses/${courseId}/assessments`}>
            <Button variant="outline" size="sm" className="text-xs">
              Go to Assessments & Concepts
            </Button>
          </Link>
        </Card>
      ) : (
        /* Main Analytics Content */
        <div className="space-y-6">
          {/* 1. Summary Strip */}
          <SummaryStrip
            studentsTotal={analytics.coverage.studentsTotal}
            studentsWithAnyAssessment={analytics.coverage.studentsWithAnyAssessment}
            atRiskCount={analytics.atRisk.length}
            classAverageMastery={classAverageMastery}
          />

          {/* 2. Heatmap Table */}
          <Heatmap
            courseId={courseId}
            concepts={analytics.concepts}
            rows={analytics.rows}
            classStats={analytics.classStats}
            classAvgMastery={classAverageMastery}
            classAvgAttendance={classAverageAttendance}
          />

          {/* 3. Priority Focus Areas & Students Needing Attention */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weakest Concepts */}
            <WeakestConcepts items={analytics.weakestConcepts} />

            {/* At-Risk Students */}
            <AtRiskList courseId={courseId} items={analytics.atRisk} />
          </div>

          {/* 4. Attendance Turnout by Session */}
          <SessionsChart sessions={analytics.sessions} />
        </div>
      )}
    </div>
  );
};
