import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { CalendarCheck, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';

export interface SessionAttendanceItem {
  id: string;
  date: string;
  present: number;
  flagged: number;
  absent: number;
}

export interface SessionsChartProps {
  sessions: SessionAttendanceItem[];
}

export function SessionsChart({ sessions }: SessionsChartProps) {
  const chartData = sessions.map((s) => ({
    id: s.id,
    date: new Date(s.date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    }),
    fullDate: new Date(s.date).toLocaleString(),
    Present: s.present,
    Flagged: s.flagged,
    Absent: s.absent,
  }));

  const canRenderChart = sessions.length >= 2;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-emerald-400" />
            <CardTitle className="text-base font-semibold">Attendance by Session</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            {sessions.length} {sessions.length === 1 ? 'Session' : 'Sessions'}
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Turnout distribution across completed lectures (Mode B verification)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Screen reader accessible hidden data table */}
        <table className="sr-only">
          <caption>Attendance Counts per Class Session</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Present</th>
              <th scope="col">Flagged</th>
              <th scope="col">Absent</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id}>
                <td>{new Date(s.date).toLocaleDateString()}</td>
                <td>{s.present}</td>
                <td>{s.flagged}</td>
                <td>{s.absent}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {canRenderChart ? (
          <div className="w-full h-[260px] min-h-[260px] min-w-0">
            <ResponsiveContainer width="100%" height={260} minWidth={0}>
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  stroke="#cbd5e1"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  stroke="#cbd5e1"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const total = data.Present + data.Flagged + data.Absent;
                      return (
                        <div className="rounded-lg border bg-popover p-2.5 shadow-md text-xs space-y-1">
                          <p className="font-semibold text-foreground">{data.fullDate}</p>
                          <div className="space-y-0.5 text-muted-foreground pt-1">
                            <p className="text-emerald-400 font-medium">Present: {data.Present}</p>
                            <p className="text-amber-400 font-medium">Flagged: {data.Flagged}</p>
                            <p className="text-rose-400 font-medium">Absent: {data.Absent}</p>
                            <p className="text-foreground/80 font-mono text-[11px] pt-1 border-t border-border">
                              Total Enrolled: {total}
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                />
                <Bar dataKey="Present" stackId="a" fill="#10b981" />
                <Bar dataKey="Flagged" stackId="a" fill="#f59e0b" />
                <Bar dataKey="Absent" stackId="a" fill="#f43f5e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : sessions.length === 1 ? (
          <div className="space-y-2 p-3 rounded-lg border bg-card/60 text-xs">
            <div className="flex items-center justify-between font-semibold">
              <span>{new Date(sessions[0].date).toLocaleDateString()}</span>
              <span className="font-mono text-muted-foreground">Single Ended Session</span>
            </div>
            <div className="flex items-center gap-4 text-muted-foreground pt-1">
              <span className="text-emerald-400 font-medium">Present: {sessions[0].present}</span>
              <span className="text-amber-400 font-medium">Flagged: {sessions[0].flagged}</span>
              <span className="text-rose-400 font-medium">Absent: {sessions[0].absent}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed rounded-lg bg-muted/20">
            <AlertCircle className="w-5 h-5 text-muted-foreground mb-1" />
            <p className="text-sm font-medium text-foreground">No ended sessions yet</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Attendance turnouts will be graphed here after lectures conclude.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
