import React from 'react';
import {
  Users,
  BookOpen,
  FileText,
  CheckCircle,
  Activity,
  Shield,
  Server,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from 'recharts';
import type { AnalyticsOverview } from '@/api/hooks';

interface TelemetryTabProps {
  overview: AnalyticsOverview | undefined;
  isLoading: boolean;
}

const ROLE_COLORS = ['#2563eb', '#0284c7', '#0d9488'];

const SERVICES = [
  { name: 'PostgreSQL Relational DB', status: 'Healthy', latency: '4ms' },
  { name: 'JWT Cryptographic Engine', status: 'Operational', latency: '< 1ms' },
  { name: 'Automated Evaluation Service', status: 'Connected', latency: '350ms' },
  { name: 'Biometric Facial Verification', status: 'Ready', latency: 'Local' },
] as const;

export const TelemetryTab: React.FC<TelemetryTabProps> = ({ overview, isLoading }) => {
  const roleChartData =
    overview?.usersByRole.map((item) => ({
      name: item.role,
      count: item._count._all,
    })) ?? [];

  const metrics = [
    { label: 'Total Users', value: overview?.totalUsers, icon: Users, color: 'text-blue-400', sub: 'Students, Faculty & Staff' },
    { label: 'Active Courses', value: overview?.totalCourses, icon: BookOpen, color: 'text-sky-400', sub: 'Across all departments' },
    { label: 'Total Submissions', value: overview?.totalSubmissions, icon: FileText, color: 'text-slate-400', sub: 'Assessments turned in' },
    { label: 'Attendance Verified', value: overview?.totalAttendances, icon: CheckCircle, color: 'text-emerald-400', sub: 'Biometric & QR check-ins' },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <Card key={m.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {m.label}
                </CardTitle>
                <Icon className={`w-4 h-4 ${m.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-100">
                  {isLoading ? '...' : m.value}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">{m.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Analytics Chart & Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Role Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" /> Role Distribution
            </CardTitle>
            <CardDescription>Breakdown of active identities in the system</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roleChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {roleChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={ROLE_COLORS[index % ROLE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Security / System Health Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" /> System Integrity & Services
            </CardTitle>
            <CardDescription>Core architectural dependencies</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {SERVICES.map((svc) => (
              <div
                key={svc.name}
                className="flex items-center justify-between p-3 rounded-md bg-slate-950/40 border border-border text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <Server className="w-3.5 h-3.5 text-slate-500" />
                  <div>
                    <p className="font-medium text-slate-200">{svc.name}</p>
                    <p className="text-slate-500 mt-0.5">Latency: {svc.latency}</p>
                  </div>
                </div>
                <Badge variant="success">{svc.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
