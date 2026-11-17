import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSystemOverview, useAllUsers, useCourses, useCurrentUser } from '@/api/hooks';
import { Badge } from '@/components/ui/badge';

import { TelemetryTab } from './TelemetryTab';
import { UserDirectoryTab } from './UserDirectoryTab';
import { CourseCatalogTab } from './CourseCatalogTab';
import { SecurityTab } from './SecurityTab';

type TabKey = 'telemetry' | 'users' | 'courses' | 'security';

export const AdminDashboard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as TabKey) || 'telemetry';

  // Queries
  const { data: currentUser } = useCurrentUser();
  const { data: overview, isLoading: overviewLoading } = useSystemOverview();
  const { data: users, isLoading: usersLoading } = useAllUsers();
  const { data: courses, isLoading: coursesLoading } = useCourses();

  // Dynamic contextual header per active section (single source of truth; no duplicate tab bar)
  const viewHeaders: Record<
    TabKey,
    { badge: string; title: string; description: string; statusText: string }
  > = {
    telemetry: {
      badge: 'System Administration',
      title: 'Institutional Operations & Telemetry',
      description:
        'Manage platform identities, course offerings, biometric enrollments, and real-time security rules.',
      statusText: 'All Services Operational',
    },
    users: {
      badge: 'Identity & Access',
      title: 'User Directory & Governance',
      description:
        'Manage platform identities, system roles, biometric facial credentials, and account provisioning.',
      statusText: `${users?.length ?? 0} Registered Users`,
    },
    courses: {
      badge: 'Curriculum Management',
      title: 'Academic Course Catalog',
      description:
        'Configure accredited course offerings, assign instructional faculty, and monitor enrollment.',
      statusText: `${courses?.length ?? 0} Active Courses`,
    },
    security: {
      badge: 'Security Enforcement',
      title: 'Platform Security & Rule Engine',
      description:
        'Simulate institutional IP boundary rules and Mode B biometric attendance verification criteria.',
      statusText: 'Rule Engine Active',
    },
  };

  const currentHeader = viewHeaders[activeTab] || viewHeaders.telemetry;

  return (
    <div className="space-y-6">
      {/* View Header Banner (Original Theme Colors, cleanly aligned) */}
      <div className="rounded-lg bg-card border border-border p-6 md:p-7">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Badge variant="secondary" className="mb-2">
              {currentHeader.badge}
            </Badge>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-100 tracking-tight">
              {currentHeader.title}
            </h1>
            <p className="mt-1.5 text-sm text-slate-400">
              {currentHeader.description}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {currentHeader.statusText}
            </span>
          </div>
        </div>
      </div>

      {/* Active View (controlled by the left navigation panel) */}
      {activeTab === 'telemetry' && (
        <TelemetryTab overview={overview} isLoading={overviewLoading} />
      )}

      {activeTab === 'users' && (
        <UserDirectoryTab
          users={users}
          isLoading={usersLoading}
          currentUserId={currentUser?.id}
        />
      )}

      {activeTab === 'courses' && (
        <CourseCatalogTab courses={courses} isLoading={coursesLoading} />
      )}

      {activeTab === 'security' && <SecurityTab />}
    </div>
  );
};
