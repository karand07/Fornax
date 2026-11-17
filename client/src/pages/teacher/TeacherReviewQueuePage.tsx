import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  useReviewQueue,
  useCourse,
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
} from 'lucide-react';

export const TeacherReviewQueuePage: React.FC = () => {
  const params = useParams<{ id?: string; courseId?: string }>();
  const courseIdParam = params.courseId || params.id;
  const isAllCourses = !courseIdParam || courseIdParam === 'all';
  const effectiveCourseId = isAllCourses ? undefined : courseIdParam;

  const navigate = useNavigate();

  const [status, setStatus] = useState<'pending' | 'done'>('pending');
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('all');

  const { data: currentCourse } = useCourse(effectiveCourseId || '');
  const { data: assessments } = useCourseAssessments(effectiveCourseId || '');

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
            className="text-[11px] bg-sky-950/40 text-sky-300 border-sky-800/60 inline-flex items-center gap-1"
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
            className="text-[11px] bg-amber-950/40 text-amber-300 border-amber-800/60 inline-flex items-center gap-1"
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
            className="text-[11px] bg-purple-950/40 text-purple-300 border-purple-800/60 inline-flex items-center gap-1"
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
            className="text-[11px] bg-slate-800 text-slate-300 border-slate-700 inline-flex items-center gap-1"
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
            className="text-[11px] bg-red-950/40 text-red-300 border-red-800/60 inline-flex items-center gap-1"
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
            className="text-[11px] bg-red-950/40 text-red-300 border-red-800/60 inline-flex items-center gap-1"
          >
            <XCircle className="w-3 h-3" />
            <span>OCR failed</span>
          </Badge>
        );
      default:
        return (
          <Badge key={reason} variant="outline" className="text-[11px]">
            {reason}
          </Badge>
        );
    }
  };

  const items = queueData?.items || [];
  const total = queueData?.total ?? 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link to={effectiveCourseId ? `/teacher/courses/${effectiveCourseId}/assessments` : '/teacher'}>
              <Button variant="outline" size="sm" className="gap-1.5 border-slate-800 text-slate-300">
                <ArrowLeft className="w-4 h-4" />
                {effectiveCourseId ? 'Back to Course' : 'Faculty Dashboard'}
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3 mt-2">
            <span>Teacher Review Queue</span>
            {currentCourse && <Badge variant="secondary">{currentCourse.code}</Badge>}
            <Badge variant="outline" className="text-xs font-mono">
              {total} {status === 'pending' ? 'Pending' : 'Completed'}
            </Badge>
          </h1>
          <p className="text-xs text-slate-400">
            Review short-answer & handwritten submissions flagged for low confidence, transcription edits, or teacher oversight.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Assessment Filter */}
          {assessments && assessments.length > 0 && (
            <div className="flex items-center gap-2 min-w-[200px]">
              <Filter className="w-4 h-4 text-slate-400" />
              <Select
                value={selectedAssessmentId}
                onValueChange={(val) => setSelectedAssessmentId(val)}
              >
                <SelectTrigger className="w-[200px] h-9 text-xs bg-slate-900 border-slate-800 text-slate-200">
                  <SelectValue placeholder="All Assessments" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
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

          {/* Pending / Done Tabs */}
          <Tabs
            value={status}
            onValueChange={(val) => setStatus(val as 'pending' | 'done')}
            className="w-auto"
          >
            <TabsList className="bg-slate-900 border border-slate-800 h-9">
              <TabsTrigger
                value="pending"
                className="text-xs px-3 data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
              >
                Pending
              </TabsTrigger>
              <TabsTrigger
                value="done"
                className="text-xs px-3 data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
              >
                Done
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Queue Table */}
      <Card className="bg-slate-900/60 border-slate-800 overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full bg-slate-800/60" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400">
                <Inbox className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-200">Nothing to review</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                {status === 'pending'
                  ? 'All flagged submissions have been reviewed and approved.'
                  : 'No completed reviews match the current filter.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-950/70">
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="w-[180px] text-xs text-slate-300 font-semibold">Student</TableHead>
                  <TableHead className="w-[180px] text-xs text-slate-300 font-semibold">Assessment</TableHead>
                  <TableHead className="text-xs text-slate-300 font-semibold">Question</TableHead>
                  <TableHead className="w-[110px] text-xs text-slate-300 font-semibold">Type</TableHead>
                  <TableHead className="w-[100px] text-xs text-slate-300 font-semibold">Marks</TableHead>
                  <TableHead className="w-[140px] text-xs text-slate-300 font-semibold">Confidence</TableHead>
                  <TableHead className="w-[220px] text-xs text-slate-300 font-semibold">Flag Reasons</TableHead>
                  <TableHead className="w-[140px] text-xs text-slate-300 font-semibold text-right">Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow
                    key={item.submissionId}
                    onClick={() => navigate(`/teacher/review/${item.submissionId}`)}
                    className="border-slate-800/80 hover:bg-slate-800/50 cursor-pointer transition-colors group"
                  >
                    <TableCell className="font-medium text-xs text-slate-200 group-hover:text-indigo-300">
                      {item.studentName}
                    </TableCell>
                    <TableCell className="text-xs text-slate-300 truncate max-w-[180px]">
                      {item.assessmentTitle}
                    </TableCell>
                    <TableCell className="text-xs text-slate-300">
                      <div className="line-clamp-2">{item.questionPrompt}</div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-mono ${
                          item.type === 'HANDWRITTEN'
                            ? 'border-purple-800 bg-purple-950/30 text-purple-300'
                            : 'border-slate-700 bg-slate-800/50 text-slate-300'
                        }`}
                      >
                        {item.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono font-medium text-slate-200">
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
                    <TableCell className="text-xs text-slate-400 font-mono text-right whitespace-nowrap">
                      {new Date(item.submittedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
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
