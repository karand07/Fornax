import { AlertCircle, TrendingDown } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { masteryBand, formatPercent } from '../../lib/mastery-ui';

export interface WeakestConceptItem {
  conceptId: string;
  name: string;
  average: number;
  assessedCount: number;
}

export interface WeakestConceptsProps {
  items: WeakestConceptItem[];
}

export function WeakestConcepts({ items }: WeakestConceptsProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-rose-400" />
            <CardTitle className="text-base font-semibold">Priority Focus Concepts</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            {items.length} Tracked
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Concepts with the lowest class averages having at least 2 assessed students
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed rounded-lg bg-muted/20">
            <AlertCircle className="w-6 h-6 text-muted-foreground mb-1.5" />
            <p className="text-sm font-medium text-foreground">Not enough assessed students yet</p>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-xs">
              Concepts require at least 2 assessed students to identify class-wide remedial focus areas.
            </p>
          </div>
        ) : (
          items.map((item) => {
            const band = masteryBand(item.average);
            const scorePct = Math.round(item.average * 100);

            return (
              <div
                key={item.conceptId}
                className="p-3 rounded-lg border border-border bg-card/60 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground truncate block">
                    {item.name}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="outline"
                      className={`text-xs ${band.bgColor} ${band.textColor} border ${band.borderColor}`}
                    >
                      {formatPercent(item.average)} ({band.label})
                    </Badge>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {item.assessedCount} assessed
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Progress
                    value={scorePct}
                    className="h-2 flex-1"
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
