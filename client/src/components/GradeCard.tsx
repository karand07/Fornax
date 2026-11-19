import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, MessageSquareQuote, Calendar } from 'lucide-react';

interface GradeCardProps {
  assessmentTitle: string;
  courseCode: string;
  score: number | null;
  maxScore: number;
  feedback?: string | null;
  submittedAt?: string;
  gradedAt?: string | null;
}

export const GradeCard: React.FC<GradeCardProps> = ({
  assessmentTitle,
  courseCode,
  score,
  maxScore,
  feedback,
  submittedAt,
  gradedAt,
}) => {
  const percentage = score !== null ? Math.round((score / maxScore) * 100) : null;

  const getScoreBadge = () => {
    if (percentage === null) {
      return <Badge variant="secondary">Pending Review</Badge>;
    }
    if (percentage >= 90) {
      return <Badge variant="success">Excellent ({percentage}%)</Badge>;
    }
    if (percentage >= 75) {
      return <Badge variant="default">Proficient ({percentage}%)</Badge>;
    }
    return <Badge variant="destructive">Needs Improvement ({percentage}%)</Badge>;
  };

  return (
    <Card className="border-slate-200 bg-white shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <div>
          <Badge variant="outline" className="mb-2 bg-slate-100 text-slate-700 border-slate-200 font-semibold font-mono text-[11px]">
            {courseCode}
          </Badge>
          <CardTitle className="text-base font-bold text-slate-900">{assessmentTitle}</CardTitle>
        </div>
        {getScoreBadge()}
      </CardHeader>
      <CardContent className="space-y-3 pt-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600 font-medium flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-500" /> Score
          </span>
          <span className="font-bold font-mono text-slate-900">
            {score !== null ? `${score} / ${maxScore}` : 'Not graded'}
          </span>
        </div>

        {feedback && (
          <div className="p-3 bg-slate-50 rounded-md border border-slate-200 text-xs text-slate-700 font-medium">
            <div className="flex items-center gap-1 text-blue-700 font-bold mb-1">
              <MessageSquareQuote className="w-3.5 h-3.5" /> Evaluator Feedback:
            </div>
            <p className="leading-relaxed">{feedback}</p>
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 font-medium">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" /> Submitted: {submittedAt ? new Date(submittedAt).toLocaleDateString() : 'N/A'}
          </span>
          <span>{gradedAt ? `Graded: ${new Date(gradedAt).toLocaleDateString()}` : 'Awaiting Grade'}</span>
        </div>
      </CardContent>
    </Card>
  );
};
