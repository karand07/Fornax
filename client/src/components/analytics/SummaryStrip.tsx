import { Users, GraduationCap, AlertTriangle, Target } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { formatPercent } from '../../lib/mastery-ui';

export interface SummaryStripProps {
  studentsTotal: number;
  studentsWithAnyAssessment: number;
  atRiskCount: number;
  classAverageMastery: number | null;
}

export function SummaryStrip({
  studentsTotal,
  studentsWithAnyAssessment,
  atRiskCount,
  classAverageMastery,
}: SummaryStripProps) {
  const coveragePercent =
    studentsTotal > 0 ? Math.round((studentsWithAnyAssessment / studentsTotal) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Enrolled */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            Enrolled Students
          </CardTitle>
          <Users className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-mono text-foreground">{studentsTotal}</div>
          <p className="text-xs text-muted-foreground mt-1">Active class roster</p>
        </CardContent>
      </Card>

      {/* 2. Class Average Mastery */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            Class Average Mastery
          </CardTitle>
          <GraduationCap className="w-4 h-4 text-indigo-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-mono text-foreground">
            {classAverageMastery !== null ? formatPercent(classAverageMastery) : 'n/a'}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Mean across student mastery</p>
        </CardContent>
      </Card>

      {/* 3. Students At-Risk + Watch */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            Needs Attention
          </CardTitle>
          <AlertTriangle className="w-4 h-4 text-amber-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-mono text-foreground">{atRiskCount}</div>
          <p className="text-xs text-muted-foreground mt-1">Students in Watch or At-Risk</p>
        </CardContent>
      </Card>

      {/* 4. Assessment Coverage */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            Assessment Coverage
          </CardTitle>
          <Target className="w-4 h-4 text-emerald-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-mono text-foreground">
            {studentsWithAnyAssessment} of {studentsTotal}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{coveragePercent}% assessed on concepts</p>
        </CardContent>
      </Card>
    </div>
  );
}
