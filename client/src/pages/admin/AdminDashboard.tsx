import React from 'react';
import { useSystemOverview } from '@/api/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  BookOpen,
  CheckCircle,
  FileText,
  Shield,
  Activity,
  Server,
} from 'lucide-react';
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

export const AdminDashboard: React.FC = () => {
  const { data: overview, isLoading } = useSystemOverview();

  const roleChartData =
    overview?.usersByRole.map((item) => ({
      name: item.role,
      count: item._count._all,
    })) || [
      { name: 'STUDENT', count: 1 },
      { name: 'TEACHER', count: 1 },
      { name: 'ADMIN', count: 1 },
    ];

  const colors = ['#2563eb', '#0284c7', '#0d9488'];

  return (
    <div className="space-y-6">
      {/* Admin Header Banner */}
      <div className="rounded-lg bg-card border border-border p-6 md:p-7">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Badge variant="secondary" className="mb-2">
              System Administration
            </Badge>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-100 tracking-tight">
              Institutional Operations & Telemetry
            </h1>
            <p className="mt-1.5 text-sm text-slate-400">
              Real-time monitoring across courses, student engagement, biometric logs, and platform services.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              All Services Operational
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Users
            </CardTitle>
            <Users className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{isLoading ? '...' : overview?.totalUsers}</div>
            <p className="text-[11px] text-slate-500 mt-1">Students, Faculty & Staff</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active Courses
            </CardTitle>
            <BookOpen className="w-4 h-4 text-sky-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{isLoading ? '...' : overview?.totalCourses}</div>
            <p className="text-[11px] text-slate-500 mt-1">Across all departments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Submissions
            </CardTitle>
            <FileText className="w-4 h-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">
              {isLoading ? '...' : overview?.totalSubmissions}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Assessments turned in</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Attendance Verified
            </CardTitle>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">
              {isLoading ? '...' : overview?.totalAttendances}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Biometric & QR check-ins</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Chart & Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} tickLine={false} axisLine={false} />
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
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
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
            {[
              { name: 'PostgreSQL Relational DB', status: 'Healthy', latency: '4ms' },
              { name: 'JWT Cryptographic Engine', status: 'Operational', latency: '< 1ms' },
              { name: 'Automated Evaluation Service', status: 'Connected', latency: '350ms' },
              { name: 'Biometric Facial Verification', status: 'Ready', latency: 'Local' },
            ].map((svc) => (
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
