import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  CalendarCheck,
  TrendingUp,
  LogOut,
  QrCode,
  Shield,
  Layers,
  Users,
  Library,
  ChevronRight,
  ScanFace,
  CheckSquare,
  BarChart3,
} from 'lucide-react';
import { useReviewQueue } from '@/api/hooks';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const RoleSidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isTeacherOrAdmin = user?.role === 'TEACHER' || user?.role === 'ADMIN';
  const { data: reviewQueueData } = useReviewQueue(
    { status: 'pending' },
    isTeacherOrAdmin
  );
  const pendingCount = reviewQueueData?.total ?? 0;

  if (!user) return null;

  const studentNav: NavItem[] = [
    { label: 'Overview', href: '/student', icon: LayoutDashboard },
    { label: 'Mark Attendance', href: '/student/mark-attendance', icon: CalendarCheck, badge: 'Mode B' },
    { label: 'Enroll Face', href: '/student/enroll-face', icon: ScanFace },
    { label: 'My Courses', href: '/student?tab=courses', icon: BookOpen },
    { label: 'Concept Graph', href: '/student?tab=concepts', icon: Layers, badge: '6 Units' },
    { label: 'Check-In History', href: '/student?tab=attendance', icon: CalendarCheck },
    { label: 'Mastery & Growth', href: '/student?tab=analytics', icon: TrendingUp },
  ];

  const teacherNav: NavItem[] = [
    { label: 'Dashboard', href: '/teacher', icon: LayoutDashboard },
    { label: 'Live Attendance', href: '/teacher/live-attendance', icon: QrCode, badge: 'Live' },
    { label: 'Course Analytics', href: '/teacher/analytics', icon: BarChart3 },
    { label: 'Curriculum & Concepts', href: '/teacher?tab=curriculum', icon: Layers, badge: 'Prereqs' },
    {
      label: 'Review Queue',
      href: '/teacher/courses/all/review',
      icon: CheckSquare,
      badge: pendingCount > 0 ? `${pendingCount}` : undefined,
    },
  ];

  const adminNav: NavItem[] = [
    { label: 'System Telemetry', href: '/admin', icon: LayoutDashboard },
    { label: 'User Directory', href: '/admin?tab=users', icon: Users, badge: '5 Students' },
    { label: 'Course Catalog', href: '/admin?tab=courses', icon: Library },
    { label: 'Platform Security', href: '/admin?tab=security', icon: Shield },
  ];

  const currentNav =
    user.role === 'ADMIN' ? adminNav : user.role === 'TEACHER' ? teacherNav : studentNav;

  const roleLabels = {
    ADMIN: { title: 'Institutional Admin', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    TEACHER: { title: 'Faculty Portal', color: 'bg-amber-50 text-amber-800 border-amber-200' },
    STUDENT: { title: 'Student Portal', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  };

  const handleNavClick = (href: string) => {
    navigate(href);
  };

  const isActive = (href: string) => {
    const [path, search] = href.split('?');
    if (location.pathname !== path) return false;
    const currentParams = new URLSearchParams(location.search);
    const targetParams = new URLSearchParams(search || '');
    const targetTab = targetParams.get('tab');
    const currentTab = currentParams.get('tab');

    if (targetTab) {
      return currentTab === targetTab;
    }
    return !currentTab || currentTab === 'overview';
  };

  return (
    <aside className="w-64 flex-shrink-0 bg-card border-r border-border flex flex-col justify-between h-screen sticky top-0 z-30 select-none">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base tracking-tight text-foreground">FORNAX</span>
              <span className="text-[10px] uppercase font-mono px-1 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold">
                LMS
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate">Academic Adaptive Suite</p>
          </div>
        </div>

        {/* Role Chip */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/60 border border-border">
            <span className="text-xs font-medium text-foreground">Active Workspace</span>
            <Badge
              variant="outline"
              className={`text-[10px] font-mono px-2 py-0.5 border ${roleLabels[user.role].color}`}
            >
              {roleLabels[user.role].title}
            </Badge>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="p-3 space-y-1">
          <div className="px-3 pb-2 pt-1 text-[11px] font-semibold text-muted-foreground tracking-wider uppercase font-mono">
            Navigation
          </div>
          {currentNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <button
                key={item.href}
                onClick={() => handleNavClick(item.href)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110 ${
                      active ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge ? (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                      active
                        ? 'bg-blue-700 text-blue-100'
                        : 'bg-slate-100 text-slate-600 group-hover:text-slate-900'
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : (
                  <ChevronRight
                    className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity ${
                      active ? 'opacity-100 text-white' : 'text-slate-400'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Footer Profile & Sign Out */}
      <div className="p-3 border-t border-border bg-muted/30">
        <div className="p-2.5 rounded-lg bg-card border border-border mb-2 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs border border-blue-200">
              {user.firstName[0]}
              {user.lastName[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="w-full justify-start text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-2 h-9"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </Button>
      </div>
    </aside>
  );
};
