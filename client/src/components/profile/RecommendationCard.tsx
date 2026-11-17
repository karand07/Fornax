import { Sparkles, CheckCircle2, ArrowRight, HelpCircle, Dumbbell } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ResourceLink } from './ResourceLink';
import { masteryBand, formatPercent } from '../../lib/mastery-ui';
import type { RecommendationItem } from '../../api/hooks';

export interface RecommendationCardProps {
  recommendations: RecommendationItem[];
  notAssessed?: { id: string; name: string }[];
  className?: string;
  onStartPractice?: (conceptId: string, conceptTitle: string) => void;
}

export function RecommendationCard({
  recommendations,
  notAssessed = [],
  className = '',
  onStartPractice,
}: RecommendationCardProps) {
  if (recommendations.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <CardTitle className="text-base font-semibold">Recommendations</CardTitle>
          </div>
          <CardDescription>Tailored resources based on your concept mastery</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed rounded-lg bg-muted/20">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-2">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-foreground">Nothing to work on right now</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              You&apos;re doing great across all assessed concepts! Keep up the consistent practice.
            </p>
          </div>

          {notAssessed.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground flex items-start gap-1.5">
              <HelpCircle className="w-4 h-4 shrink-0 text-muted-foreground/70 mt-0.5" />
              <span>
                Not assessed yet: <span className="font-medium text-foreground/80">{notAssessed.map((c) => c.name).join(', ')}</span>.
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <CardTitle className="text-base font-semibold">Recommendations</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {recommendations.length} {recommendations.length === 1 ? 'Focus Area' : 'Focus Areas'}
          </Badge>
        </div>
        <CardDescription>Targeted concepts and study materials to elevate your understanding</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.map((rec) => {
          const band = masteryBand(rec.mastery);
          return (
            <div
              key={rec.conceptId}
              className="p-4 rounded-lg border border-border/70 bg-card/40 space-y-3"
            >
              {/* Concept header */}
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{rec.conceptName}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{rec.reason}</p>
                </div>
                <Badge
                  variant={band.badgeVariant}
                  className={`text-xs shrink-0 ${band.bgColor} ${band.textColor} border ${band.borderColor}`}
                >
                  {band.label} ({formatPercent(rec.mastery)})
                </Badge>
              </div>

              {/* Dependents if any */}
              {rec.dependents.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-amber-500/90 bg-amber-500/5 px-2.5 py-1.5 rounded border border-amber-500/20">
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Unblocks:{' '}
                    <span className="font-medium">
                      {rec.dependents
                        .map((d) => `${d.name} (${formatPercent(d.mastery)})`)
                        .join(', ')}
                    </span>
                  </span>
                </div>
              )}

              {/* Resources */}
              <div className="space-y-2 pt-1">
                {rec.resources.length > 0 ? (
                  rec.resources.map((res) => <ResourceLink key={res.id} resource={res} />)
                ) : (
                  <div className="text-xs text-muted-foreground italic px-2 py-1.5 rounded bg-muted/30 border border-dashed border-border/60">
                    No resources added yet. Ask your teacher.
                  </div>
                )}
              </div>

              {/* Action / Adaptive Practice */}
              {onStartPractice && (
                <div className="pt-2 flex justify-end border-t border-border/40">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 gap-1.5 border-primary/40 text-primary hover:bg-primary/10 hover:border-primary font-medium"
                    onClick={() => onStartPractice(rec.conceptId, rec.conceptName)}
                  >
                    <Dumbbell className="w-3.5 h-3.5" />
                    Start Practice Drill
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        {notAssessed.length > 0 && (
          <div className="pt-2 border-t border-border/50 text-xs text-muted-foreground flex items-start gap-1.5">
            <HelpCircle className="w-4 h-4 shrink-0 text-muted-foreground/70 mt-0.5" />
            <span>
              Not assessed yet: <span className="font-medium text-foreground/80">{notAssessed.map((c) => c.name).join(', ')}</span>.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
