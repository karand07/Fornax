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
  FileCheck2,
  Library,
  ChevronRight,
  ScanFace,
} from 'lucide-react';

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

  if (!user) return null;

  const studentNav: NavItem[] = [
    { label: 'Overview', href: '/student', icon: LayoutDashboard },
    { label: 'Enroll Face', href: '/student/enroll-face', icon: ScanFace },
    { label: 'My Courses', href: '/student?tab=courses', icon: BookOpen },
    { label: 'Concept Graph', href: '/student?tab=concepts', icon: Layers, badge: '6 Units' },
    { label: 'Attendance Check-In', href: '/student?tab=attendance', icon: CalendarCheck },
    { label: 'Mastery & Growth', href: '/student?tab=analytics', icon: TrendingUp },
  ];

  const teacherNav: NavItem[] = [
    { label: 'Faculty Overview', href: '/teacher', icon: LayoutDashboard },
    { label: 'Live Attendance', href: '/teacher/live-attendance', icon: QrCode, badge: 'Live' },
    { label: 'Course Management', href: '/teacher?tab=courses', icon: Library },
    { label: 'Curriculum & Concepts', href: '/teacher?tab=curriculum', icon: Layers, badge: 'Prereqs' },
    { label: 'Assessments & Grading', href: '/teacher?tab=grading', icon: FileCheck2 },
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
    ADMIN: { title: 'Institutional Admin', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    TEACHER: { title: 'Faculty Portal', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    STUDENT: { title: 'Student Portal', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  };

  const handleNavClick = (href: string) => {
    navigate(href);
  };

  const isActive = (href: string) => {
    const [path, search] = href.split('?');
    if (search) {
      return location.pathname === path && location.search.includes(search);
    }
    return location.pathname === path && (!location.search || location.search === '?tab=overview');
  };

  return (
    <aside className="w-64 flex-shrink-0 bg-card border-r border-border flex flex-col justify-between h-screen sticky top-0 z-30 select-none">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base tracking-tight text-slate-100">FORNAX</span>
              <span className="text-[10px] uppercase font-mono px-1 py-0.5 rounded bg-blue-500/20 text-blue-400 font-semibold">
                LMS
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate">Academic Adaptive Suite</p>
          </div>
        </div>

        {/* Role Chip */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-xs font-medium text-slate-300">Active Workspace</span>
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
          <div className="px-3 pb-2 pt-1 text-[11px] font-semibold text-slate-400 tracking-wider uppercase font-mono">
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
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110 ${
                      active ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge ? (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                      active
                        ? 'bg-blue-700 text-blue-100'
                        : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : (
                  <ChevronRight
                    className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity ${
                      active ? 'opacity-100' : 'text-slate-500'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Footer Profile & Sign Out */}
      <div className="p-3 border-t border-border bg-slate-900/40">
        <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs border border-blue-500/30">
              {user.firstName[0]}
              {user.lastName[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-200 truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="w-full justify-start text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 gap-2 h-9"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </Button>
      </div>
    </aside>
  );
};
