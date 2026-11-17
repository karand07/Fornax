import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { RiskBadge, FACTOR_LABELS } from '../profile/RiskBadge';
import type { RiskFactor } from '../../api/hooks';

export interface AtRiskItem {
  studentId: string;
  name: string;
  level: 'AT_RISK' | 'WATCH';
  score: number;
  factors: RiskFactor[];
  weakestConcepts: string[];
}

export interface AtRiskListProps {
  courseId: string;
  items: AtRiskItem[];
}

export function AtRiskList({ courseId, items }: AtRiskListProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <CardTitle className="text-base font-semibold">Students Needing Attention</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            {items.length} {items.length === 1 ? 'Student' : 'Students'}
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Ranked by risk heuristic: 40% attendance, 60% average mastery.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed rounded-lg bg-muted/20">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-2">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-foreground">No students need attention right now</p>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-sm">
              All enrolled students with assessed activity are on track according to current attendance and concept mastery metrics.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((student) => (
              <div
                key={student.studentId}
                className="p-3.5 rounded-lg border border-border bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground text-sm truncate">
                      {student.name}
                    </span>
                    <RiskBadge
                      level={student.level}
                      score={student.score}
                      variant="teacher"
                      className="flex-row items-center gap-1.5"
                    />
                  </div>

                  {/* Factor tags */}
                  {student.factors.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {student.factors.map((f) => (
                        <Badge
                          key={f}
                          variant="outline"
                          className="text-[11px] py-0 px-1.5 text-muted-foreground bg-muted/30"
                        >
                          {FACTOR_LABELS[f]?.teacher || f}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Weakest concepts */}
                  {student.weakestConcepts.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Focus areas:{' '}
                      <span className="text-foreground/90 font-medium">
                        {student.weakestConcepts.join(', ')}
                      </span>
                    </p>
                  )}
                </div>

                <Link
                  to={`/teacher/courses/${courseId}/students/${student.studentId}`}
                  className="shrink-0"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2.5 text-xs text-primary hover:text-primary gap-1"
                  >
                    <span>View Profile</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground italic border-t border-border/50 pt-2">
          Note: Risk is a heuristic: 40% attendance, 60% average mastery.
        </p>
      </CardContent>
    </Card>
  );
}
