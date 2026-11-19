import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { formatPercent } from '../../lib/mastery-ui';

export interface AssessmentHistoryItem {
  assessmentId: string;
  title: string;
  date: string;
  score: number;
  max: number;
  percentage: number;
}

export interface TrendChartProps {
  history: AssessmentHistoryItem[];
  assessmentAvg?: number | null;
  className?: string;
}

export function TrendChart({ history, assessmentAvg, className = '' }: TrendChartProps) {
  const sorted = [...history].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const chartData = sorted.map((item) => ({
    title: item.title,
    date: new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    fullDate: new Date(item.date).toLocaleString(),
    percentage: Math.round(item.percentage),
    score: item.score,
    max: item.max,
  }));

  const canRenderChart = sorted.length >= 2;

  // Text summary: latest vs previous
  let trendSummary: string | null = null;
  if (sorted.length >= 2) {
    const latest = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];
    const diff = latest.percentage - prev.percentage;
    const sign = diff > 0 ? '+' : '';
    trendSummary = `Latest: ${Math.round(latest.percentage)}% (${sign}${Math.round(diff)}% vs previous ${Math.round(prev.percentage)}%)`;
  } else if (sorted.length === 1) {
    trendSummary = `Latest: ${Math.round(sorted[0].percentage)}%`;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <CardTitle className="text-base font-semibold">Assessment History</CardTitle>
          </div>
          {assessmentAvg !== null && assessmentAvg !== undefined && (
            <Badge variant="outline" className="text-xs font-mono">
              Avg: {formatPercent(assessmentAvg)}
            </Badge>
          )}
        </div>
        <CardDescription>
          {trendSummary || 'Track your assessment scores and improvement over time'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {canRenderChart ? (
          <div className="w-full h-[220px] min-h-[220px] min-w-0">
            <ResponsiveContainer width="100%" height={220} minWidth={0}>
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  stroke="#cbd5e1"
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  stroke="#cbd5e1"
                  unit="%"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border bg-popover p-2 shadow-md text-xs space-y-1">
                          <p className="font-semibold text-foreground">{data.title}</p>
                          <p className="text-muted-foreground">{data.fullDate}</p>
                          <p className="text-primary font-medium">
                            Score: {data.score}/{data.max} ({data.percentage}%)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="percentage"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#10b981' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : sorted.length === 1 ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/20 text-xs">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1">
                <span className="font-medium text-foreground">{sorted[0].title}</span>
                <span className="text-muted-foreground ml-2">
                  {new Date(sorted[0].date).toLocaleDateString()}
                </span>
              </div>
              <Badge variant="outline" className="font-mono">
                {sorted[0].score}/{sorted[0].max} ({Math.round(sorted[0].percentage)}%)
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Complete more assessments to view your trajectory line chart.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed rounded-lg bg-muted/20 text-xs text-muted-foreground">
            <AlertCircle className="w-5 h-5 mb-1 text-muted-foreground/60" />
            <p className="font-medium text-foreground">No graded assessments yet</p>
            <p className="mt-0.5">Your scores will appear here after your first quiz is submitted.</p>
          </div>
        )}

        {/* Detailed recent assessments list if chart is rendered */}
        {canRenderChart && (
          <div className="space-y-1.5 pt-2 border-t border-border/50">
            {sorted.slice(-3).reverse().map((item) => (
              <div
                key={item.assessmentId}
                className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-muted/30"
              >
                <span className="text-muted-foreground truncate max-w-[200px]">{item.title}</span>
                <span className="font-mono text-foreground font-medium">
                  {item.score}/{item.max} ({Math.round(item.percentage)}%)
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
