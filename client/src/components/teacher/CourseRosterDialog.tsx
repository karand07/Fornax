import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCourseEnrollments } from '@/api/hooks';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Search, GraduationCap, ExternalLink } from 'lucide-react';

interface CourseRosterDialogProps {
  courseId: string | null;
  courseTitle?: string;
  courseCode?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CourseRosterDialog: React.FC<CourseRosterDialogProps> = ({
  courseId,
  courseTitle,
  courseCode,
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: enrollments, isLoading } = useCourseEnrollments(
    isOpen && courseId ? courseId : undefined
  );

  const filteredEnrollments = useMemo(() => {
    if (!enrollments) return [];
    if (!search.trim()) return enrollments;
    const query = search.toLowerCase();
    return enrollments.filter(
      (e) =>
        e.user.firstName.toLowerCase().includes(query) ||
        e.user.lastName.toLowerCase().includes(query) ||
        e.user.email.toLowerCase().includes(query)
    );
  }, [enrollments, search]);

  const handleOpenStudentProfile = (studentId: string) => {
    onClose();
    navigate(`/teacher/courses/${courseId}/students/${studentId}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader className="pb-3 border-b border-slate-800">
          <div className="flex items-center justify-between pr-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <span>Class Roster</span>
                  {courseCode && (
                    <Badge variant="outline" className="font-mono text-xs border-blue-500/30 text-blue-400">
                      {courseCode}
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  {courseTitle || 'Enrolled Students'}
                </DialogDescription>
              </div>
            </div>
            {enrollments && (
              <Badge variant="secondary" className="text-xs font-mono">
                {enrollments.length} {enrollments.length === 1 ? 'Student' : 'Students'}
              </Badge>
            )}
          </div>

          <div className="pt-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Search students by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-blue-500"
              />
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2 space-y-2 pr-1">
          {isLoading ? (
            <div className="space-y-2 py-4">
              <Skeleton className="h-14 w-full bg-slate-800/60 rounded-lg" />
              <Skeleton className="h-14 w-full bg-slate-800/60 rounded-lg" />
              <Skeleton className="h-14 w-full bg-slate-800/60 rounded-lg" />
            </div>
          ) : filteredEnrollments.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <GraduationCap className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-xs font-medium">
                {search ? 'No enrolled students match your search' : 'No students enrolled in this course yet'}
              </p>
            </div>
          ) : (
            filteredEnrollments.map((enrollment) => (
              <div
                key={enrollment.id}
                className="p-3 rounded-lg border border-slate-800/80 bg-slate-950/60 hover:border-slate-700/80 hover:bg-slate-800/30 transition-colors flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold text-xs flex items-center justify-center shrink-0">
                    {enrollment.user.firstName.charAt(0)}
                    {enrollment.user.lastName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate">
                      {enrollment.user.firstName} {enrollment.user.lastName}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono truncate">
                      {enrollment.user.email}
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenStudentProfile(enrollment.user.id)}
                  className="text-xs border-slate-700 hover:border-indigo-500 hover:text-indigo-300 gap-1.5 shrink-0 h-8 px-2.5"
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Profile</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
