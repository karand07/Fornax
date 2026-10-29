import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCourseAssessments, AssessmentListItem } from '@/api/hooks';
import { Button } from '@/components/ui/button';
import { PlayCircle, Eye, HelpCircle } from 'lucide-react';

interface StudentCourseAssessmentsProps {
  courseId: string;
}

export const StudentCourseAssessments: React.FC<StudentCourseAssessmentsProps> = ({
  courseId,
}) => {
  const navigate = useNavigate();
  const { data: assessments, isLoading } = useCourseAssessments(courseId);

  if (isLoading) {
    return (
      <div className="py-2 text-xs text-slate-500 font-mono animate-pulse">
        Checking course assessments...
      </div>
    );
  }

  if (!assessments || assessments.length === 0) {
    return (
      <div className="text-xs text-slate-500 italic py-1">
        No published assessments for this course yet.
      </div>
    );
  }

  return (
    <div className="space-y-2 pt-2 border-t border-slate-800">
      <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
        <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
        Course Assessments ({assessments.length})
      </div>
      <div className="space-y-1.5">
        {assessments.map((a: AssessmentListItem) => (
          <div
            key={a.id}
            className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
          >
            <div>
              <div className="font-medium text-slate-200">{a.title}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {a.questionCount} {a.questionCount === 1 ? 'Question' : 'Questions'} • {a.totalMarks} Marks
              </div>
            </div>

            <div>
              {a.submitted ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/student/assessments/${a.id}/result`)}
                  className="h-7 text-xs border-emerald-900/60 bg-emerald-950/30 text-emerald-400 hover:bg-emerald-900/50 hover:text-emerald-300 gap-1.5"
                >
                  <Eye className="w-3 h-3" />
                  View Result
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => navigate(`/student/assessments/${a.id}`)}
                  className="h-7 text-xs bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5"
                >
                  <PlayCircle className="w-3 h-3" />
                  Start
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
