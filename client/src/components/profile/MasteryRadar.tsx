import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { masteryBand, formatPercent } from '../../lib/mastery-ui';

export interface ConceptMasteryItem {
  id: string;
  name: string;
  score: number;
  attempts: number;
  prerequisiteId?: string | null;
}

export interface MasteryRadarProps {
  concepts: ConceptMasteryItem[];
  average?: number;
  className?: string;
}

export function MasteryRadar({ concepts, average, className = '' }: MasteryRadarProps) {
  // Radar data points (0..100)
  const chartData = concepts.map((c) => ({
    name: c.name.length > 20 ? `${c.name.slice(0, 18)}...` : c.name,
    fullName: c.name,
    score: Math.round(c.score * 100),
    attempts: c.attempts,
    isAssessed: c.attempts > 0,
  }));

  const canRenderRadar = concepts.length >= 3;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Concept Mastery</CardTitle>
          {average !== undefined && (
            <Badge variant="outline" className="text-xs font-mono">
              Average: {formatPercent(average)}
            </Badge>
          )}
        </div>
        <CardDescription>Visualizing your current understanding across all course concepts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Accessible hidden table for screen readers */}
        <table className="sr-only">
          <caption>Course Concept Mastery Scores</caption>
          <thead>
            <tr>
              <th scope="col">Concept</th>
              <th scope="col">Mastery Score</th>
              <th scope="col">Attempts</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {concepts.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{Math.round(c.score * 100)}%</td>
                <td>{c.attempts}</td>
                <td>{c.attempts > 0 ? 'Assessed' : 'Not Assessed'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Radar Chart (if >= 3 concepts) or Fallback List */}
        {canRenderRadar ? (
          <div className="w-full h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
                <PolarGrid stroke="#334155" strokeDasharray="3 3" />
                <PolarAngleAxis
                  dataKey="name"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  stroke="#334155"
                />
                <Radar
                  name="Mastery"
                  dataKey="score"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.4}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const band = masteryBand(data.score / 100);
                      return (
                        <div className="rounded-lg border bg-popover p-2 shadow-md text-xs space-y-1">
                          <p className="font-semibold text-foreground">{data.fullName}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Mastery:</span>
                            <span className={`font-medium ${band.textColor}`}>
                              {data.score}% ({band.label})
                            </span>
                          </div>
                          <p className="text-muted-foreground">
                            {data.isAssessed
                              ? `${data.attempts} assessment ${data.attempts === 1 ? 'attempt' : 'attempts'}`
                              : 'Not assessed yet'}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="p-4 border rounded-lg bg-muted/20 text-center text-xs text-muted-foreground">
            Radar visualization requires 3 or more concepts. Viewing detailed breakdown below.
          </div>
        )}

        {/* Detailed Concept Breakdown List */}
        <div className="space-y-3 pt-2 border-t border-border/50">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            All Concepts
          </div>
          {concepts.map((c) => {
            const isAssessed = c.attempts > 0;
            const band = masteryBand(c.score);
            return (
              <div
                key={c.id}
                className="flex items-center justify-between p-2.5 rounded-md border border-border/60 bg-muted/20 text-xs"
              >
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground truncate">{c.name}</span>
                    {!isAssessed && (
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        not assessed
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Progress value={isAssessed ? c.score * 100 : 0} className="h-1.5 flex-1" />
                    <span className="text-[11px] font-mono text-muted-foreground w-9 text-right">
                      {isAssessed ? formatPercent(c.score) : '—'}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-muted-foreground text-[11px]">
                    {c.attempts} {c.attempts === 1 ? 'att.' : 'att.'}
                  </span>
                  {isAssessed ? (
                    <Badge
                      variant={band.badgeVariant}
                      className={`text-[10px] py-0 px-2 ${band.bgColor} ${band.textColor} border ${band.borderColor}`}
                    >
                      {band.label}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] py-0 px-2 text-muted-foreground">
                      Unassessed
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
