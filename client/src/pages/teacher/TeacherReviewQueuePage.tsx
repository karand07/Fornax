import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  useReviewQueue,
  useCourse,
  useCourses,
  useCourseAssessments,
} from '@/api/hooks';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfidenceBadge } from '@/components/grading/ConfidenceBadge';
import { confidenceLevel } from '@/lib/evidence';
import {
  ArrowLeft,
  Clock,
  AlertTriangle,
  AlignLeft,
  EyeOff,
  XCircle,
  PenTool,
  Inbox,
  Filter,
  Search,
  BookOpen,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';

export const TeacherReviewQueuePage: React.FC = () => {
  const params = useParams<{ id?: string; courseId?: string }>();
  const courseIdParam = params.courseId || params.id;
  const isAllCoursesParam = !courseIdParam || courseIdParam === 'all';

  const navigate = useNavigate();

  // All courses for dropdown selector
  const { data: courses } = useCourses();

  // Selected course state
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    isAllCoursesParam ? 'all' : (courseIdParam || 'all')
  );

  useEffect(() => {
    if (courseIdParam && courseIdParam !== 'all') {
      setSelectedCourseId(courseIdParam);
    } else {
      setSelectedCourseId('all');
    }
  }, [courseIdParam]);

  const effectiveCourseId = selectedCourseId === 'all' ? undefined : selectedCourseId;

  const [status, setStatus] = useState<'pending' | 'done'>('pending');
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('all');
  const [selectedReason, setSelectedReason] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { data: currentCourse } = useCourse(effectiveCourseId || '');
  const { data: assessments } = useCourseAssessments(effectiveCourseId || '');

  // Reset assessment filter if course changes
  const handleCourseChange = (val: string) => {
    setSelectedCourseId(val);
    setSelectedAssessmentId('all');
    if (val === 'all') {
      navigate('/teacher/courses/all/review');
    } else {
      navigate(`/teacher/courses/${val}/review`);
    }
  };

  const { data: queueData, isLoading } = useReviewQueue({
    courseId: effectiveCourseId,
    assessmentId: selectedAssessmentId !== 'all' ? selectedAssessmentId : undefined,
    status,
    limit: 100,
  });

  const renderReasonBadge = (reason: string) => {
    switch (reason) {
      case 'HANDWRITTEN':
        return (
          <Badge
            key={reason}
            variant="outline"
            className="text-[11px] bg-sky-50 text-sky-700 border-sky-200 font-semibold inline-flex items-center gap-1"
          >
            <PenTool className="w-3 h-3" />
            <span>Handwritten</span>
          </Badge>
        );
      case 'LOW_CONFIDENCE':
        return (
          <Badge
            key={reason}
            variant="outline"
            className="text-[11px] bg-amber-50 text-amber-800 border-amber-200 font-semibold inline-flex items-center gap-1"
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Low confidence</span>
          </Badge>
        );
      case 'VERY_SHORT_ANSWER':
        return (
          <Badge
            key={reason}
            variant="outline"
            className="text-[11px] bg-purple-50 text-purple-700 border-purple-200 font-semibold inline-flex items-center gap-1"
          >
            <AlignLeft className="w-3 h-3" />
            <span>Short answer</span>
          </Badge>
        );
      case 'UNGRADED':
        return (
          <Badge
            key={reason}
            variant="outline"
            className="text-[11px] bg-slate-100 text-slate-700 border-slate-200 font-semibold inline-flex items-center gap-1"
          >
            <Clock className="w-3 h-3" />
            <span>Ungraded</span>
          </Badge>
        );
      case 'UNREADABLE':
        return (
          <Badge
            key={reason}
            variant="outline"
            className="text-[11px] bg-rose-50 text-rose-700 border-rose-200 font-semibold inline-flex items-center gap-1"
          >
            <EyeOff className="w-3 h-3" />
            <span>Unreadable</span>
          </Badge>
        );
      case 'OCR_FAILED':
        return (
          <Badge
            key={reason}
            variant="outline"
            className="text-[11px] bg-rose-50 text-rose-700 border-rose-200 font-semibold inline-flex items-center gap-1"
          >
            <XCircle className="w-3 h-3" />
            <span>OCR failed</span>
          </Badge>
        );
      default:
        return (
          <Badge key={reason} variant="outline" className="text-[11px] bg-slate-100 text-slate-700 border-slate-200 font-semibold">
            {reason}
          </Badge>
        );
    }
  };

  const rawItems = queueData?.items || [];
  const total = queueData?.total ?? 0;

  // Filter items by reason and search query
  const items = useMemo(() => {
    return rawItems.filter((item) => {
      // Reason filter
      if (selectedReason !== 'all' && !item.reasons.includes(selectedReason)) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesStudent = item.studentName.toLowerCase().includes(q);
        const matchesAssessment = item.assessmentTitle.toLowerCase().includes(q);
        const matchesPrompt = item.questionPrompt.toLowerCase().includes(q);
        const matchesCourse =
          (item.courseCode && item.courseCode.toLowerCase().includes(q)) ||
          (item.courseTitle && item.courseTitle.toLowerCase().includes(q));
        return matchesStudent || matchesAssessment || matchesPrompt || matchesCourse;
      }
      return true;
    });
  }, [rawItems, selectedReason, searchQuery]);

  // Summary Metrics
  const lowConfidenceCount = useMemo(
    () => rawItems.filter((i) => i.reasons.includes('LOW_CONFIDENCE')).length,
    [rawItems]
  );
  const handwrittenCount = useMemo(
    () => rawItems.filter((i) => i.reasons.includes('HANDWRITTEN')).length,
    [rawItems]
  );
  const ungradedOrUnreadableCount = useMemo(
    () =>
      rawItems.filter(
        (i) =>
          i.reasons.includes('UNGRADED') ||
          i.reasons.includes('UNREADABLE') ||
          i.reasons.includes('OCR_FAILED')
      ).length,
    [rawItems]
  );

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedReason('all');
    setSelectedAssessmentId('all');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link to={effectiveCourseId ? `/teacher/courses/${effectiveCourseId}/assessments` : '/teacher'}>
              <Button variant="outline" size="sm" className="gap-1.5 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-medium shadow-xs">
                <ArrowLeft className="w-4 h-4" />
                {effectiveCourseId ? 'Back to Course' : 'Faculty Dashboard'}
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3 mt-2">
            <span>Teacher Review Queue</span>
            {currentCourse ? (
              <Badge variant="outline" className="font-mono text-xs bg-blue-50 text-blue-700 border-blue-200 font-bold">
                {currentCourse.code}
              </Badge>
            ) : (
              <Badge variant="outline" className="font-mono text-xs bg-slate-100 text-slate-700 border-slate-200 font-bold">
                All Courses
              </Badge>
            )}
            <Badge variant="outline" className="text-xs font-mono border-slate-300 text-slate-700 font-semibold">
              {total} {status === 'pending' ? 'Pending Review' : 'Completed'}
            </Badge>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Review short-answer & handwritten student submissions flagged for low confidence, transcription edits, or teacher oversight.
          </p>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-3">
          <Tabs
            value={status}
            onValueChange={(val) => setStatus(val as 'pending' | 'done')}
            className="w-auto"
          >
            <TabsList className="bg-slate-100 border border-slate-200 p-0.5 h-9 rounded-lg">
              <TabsTrigger
                value="pending"
                className="text-xs px-3.5 font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs"
              >
                Pending ({status === 'pending' ? total : ''})
              </TabsTrigger>
              <TabsTrigger
                value="done"
                className="text-xs px-3.5 font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs"
              >
                Reviewed ({status === 'done' ? total : ''})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-white border-slate-200 shadow-xs hover:shadow-sm transition-all rounded-xl">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
              <span>Total Flagged</span>
              <span className="p-1 rounded-md bg-blue-50 text-blue-600"><Inbox className="w-3.5 h-3.5" /></span>
            </div>
            <p className="text-2xl font-extrabold font-mono text-slate-900">{total}</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-amber-200 shadow-xs hover:shadow-sm transition-all rounded-xl">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-amber-700 text-xs font-semibold mb-1">
              <span>Low Confidence</span>
              <span className="p-1 rounded-md bg-amber-50 text-amber-600"><AlertTriangle className="w-3.5 h-3.5" /></span>
            </div>
            <p className="text-2xl font-extrabold font-mono text-amber-600">{lowConfidenceCount}</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-sky-200 shadow-xs hover:shadow-sm transition-all rounded-xl">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-sky-700 text-xs font-semibold mb-1">
              <span>Handwritten</span>
              <span className="p-1 rounded-md bg-sky-50 text-sky-600"><PenTool className="w-3.5 h-3.5" /></span>
            </div>
            <p className="text-2xl font-extrabold font-mono text-sky-600">{handwrittenCount}</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-rose-200 shadow-xs hover:shadow-sm transition-all rounded-xl">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-rose-700 text-xs font-semibold mb-1">
              <span>Unreadable / Failed</span>
              <span className="p-1 rounded-md bg-rose-50 text-rose-600"><EyeOff className="w-3.5 h-3.5" /></span>
            </div>
            <p className="text-2xl font-extrabold font-mono text-rose-600">{ungradedOrUnreadableCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Search bar */}
          <div className="relative min-w-[200px] max-w-[260px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Search student or assessment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white"
            />
          </div>

          {/* Course Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-slate-500" />
            <Select
              value={selectedCourseId}
              onValueChange={handleCourseChange}
            >
              <SelectTrigger className="w-[180px] h-8 text-xs bg-slate-50 border-slate-200 text-slate-900 font-medium focus:bg-white">
                <SelectValue placeholder="Filter by Course" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200 text-slate-900 shadow-lg">
                <SelectItem value="all">All Courses</SelectItem>
                {courses?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code} — {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assessment Filter Dropdown */}
          {assessments && assessments.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <Select
                value={selectedAssessmentId}
                onValueChange={(val) => setSelectedAssessmentId(val)}
              >
                <SelectTrigger className="w-[180px] h-8 text-xs bg-slate-50 border-slate-200 text-slate-900 font-medium focus:bg-white">
                  <SelectValue placeholder="All Assessments" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 text-slate-900 shadow-lg">
                  <SelectItem value="all">All Assessments</SelectItem>
                  {assessments.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Reason Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <Select
              value={selectedReason}
              onValueChange={(val) => setSelectedReason(val)}
            >
              <SelectTrigger className="w-[160px] h-8 text-xs bg-slate-50 border-slate-200 text-slate-900 font-medium focus:bg-white">
                <SelectValue placeholder="All Flag Reasons" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200 text-slate-900 shadow-lg">
                <SelectItem value="all">All Flag Reasons</SelectItem>
                <SelectItem value="LOW_CONFIDENCE">Low Confidence (&lt;70%)</SelectItem>
                <SelectItem value="HANDWRITTEN">Handwritten Answer</SelectItem>
                <SelectItem value="VERY_SHORT_ANSWER">Very Short Answer</SelectItem>
                <SelectItem value="UNREADABLE">Unreadable Handwriting</SelectItem>
                <SelectItem value="OCR_FAILED">OCR Failed</SelectItem>
                <SelectItem value="UNGRADED">Ungraded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Clear filters button */}
        {(searchQuery || selectedReason !== 'all' || selectedAssessmentId !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 gap-1 px-2 font-semibold"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Filters</span>
          </Button>
        )}
      </div>

      {/* Queue Table */}
      <Card className="bg-white border-slate-200 overflow-hidden shadow-xs rounded-xl">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full bg-slate-100" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                <Inbox className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {rawItems.length > 0 ? 'No matching submissions' : 'Nothing to review'}
              </h3>
              <p className="text-xs text-slate-600 font-medium max-w-sm">
                {rawItems.length > 0
                  ? 'Try broadening your search term or clearing the selected reason filters.'
                  : status === 'pending'
                  ? 'All flagged submissions have been reviewed and approved.'
                  : 'No completed reviews match the current course filter.'}
              </p>
              {rawItems.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  className="text-xs border-slate-300 text-slate-700 hover:bg-slate-50 mt-2 font-medium"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/80 border-b border-slate-200">
                <TableRow className="border-b border-slate-200 hover:bg-transparent">
                  <TableHead className="w-[170px] text-xs text-slate-700 font-bold">Student</TableHead>
                  {selectedCourseId === 'all' && (
                    <TableHead className="w-[110px] text-xs text-slate-700 font-bold">Course</TableHead>
                  )}
                  <TableHead className="w-[170px] text-xs text-slate-700 font-bold">Assessment</TableHead>
                  <TableHead className="text-xs text-slate-700 font-bold">Question</TableHead>
                  <TableHead className="w-[100px] text-xs text-slate-700 font-bold">Type</TableHead>
                  <TableHead className="w-[90px] text-xs text-slate-700 font-bold">Marks</TableHead>
                  <TableHead className="w-[130px] text-xs text-slate-700 font-bold">Confidence</TableHead>
                  <TableHead className="w-[200px] text-xs text-slate-700 font-bold">Flag Reasons</TableHead>
                  <TableHead className="w-[110px] text-xs text-slate-700 font-bold text-right">Submitted</TableHead>
                  <TableHead className="w-[80px] text-xs text-slate-700 font-bold text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow
                    key={item.submissionId}
                    onClick={() => navigate(`/teacher/review/${item.submissionId}`)}
                    className="border-b border-slate-100 hover:bg-blue-50/40 cursor-pointer transition-colors group"
                  >
                    <TableCell className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors">
                      {item.studentName}
                    </TableCell>

                    {selectedCourseId === 'all' && (
                      <TableCell className="text-xs">
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px] bg-slate-100 text-slate-700 border border-slate-200 font-semibold"
                        >
                          {item.courseCode || 'Course'}
                        </Badge>
                      </TableCell>
                    )}

                    <TableCell className="text-xs text-slate-700 font-medium truncate max-w-[170px]">
                      {item.assessmentTitle}
                    </TableCell>

                    <TableCell className="text-xs text-slate-600">
                      <div className="line-clamp-2">{item.questionPrompt}</div>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-mono font-semibold ${
                          item.type === 'HANDWRITTEN'
                            ? 'border-purple-200 bg-purple-50 text-purple-700'
                            : 'border-slate-200 bg-slate-100 text-slate-700'
                        }`}
                      >
                        {item.type}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-xs font-mono font-bold text-slate-900">
                      {item.marks !== null ? `${item.marks} / ${item.maxMarks}` : `— / ${item.maxMarks}`}
                    </TableCell>

                    <TableCell>
                      {item.confidence !== null ? (
                        <ConfidenceBadge
                          level={confidenceLevel(item.confidence)}
                          value={item.confidence}
                        />
                      ) : (
                        <span className="text-xs text-slate-400 font-mono">N/A</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.reasons.map((r) => renderReasonBadge(r))}
                      </div>
                    </TableCell>

                    <TableCell className="text-xs text-slate-500 font-mono text-right whitespace-nowrap">
                      {new Date(item.submittedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2.5 text-xs text-blue-600 group-hover:text-white group-hover:bg-blue-600 font-semibold gap-1 rounded-md transition-all shadow-2xs"
                      >
                        <span>Review</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
