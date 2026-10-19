import React from 'react';
import { useAuth } from '@/auth-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LogOut, GraduationCap } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();

  const getRoleBadgeVariant = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'destructive';
      case 'TEACHER':
        return 'default';
      default:
        return 'success';
    }
  };

  return (
    <header className="h-16 border-b border-border bg-slate-900/90 sticky top-0 z-40 px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-blue-600 text-white flex items-center justify-center shadow-sm">
          <GraduationCap className="w-4 h-4" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-bold tracking-tight text-base text-slate-100">FORNAX</span>
          <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider bg-slate-800 border border-slate-700/60 px-1.5 py-0.5 rounded">
            Academic Portal
          </span>
        </div>
      </div>

      {user && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 bg-slate-950/60 border border-slate-800 py-1 px-2.5 rounded-md">
            <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-blue-400 flex items-center justify-center font-bold text-[11px] uppercase">
              {user.firstName[0]}
              {user.lastName[0]}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-medium text-slate-200">
                {user.firstName} {user.lastName}
              </span>
              <span className="text-[10px] text-slate-400">{user.email}</span>
            </div>
            <Badge variant={getRoleBadgeVariant(user.role)} className="text-[10px] uppercase font-mono px-1.5 py-0">
              {user.role}
            </Badge>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 text-xs h-8"
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            Logout
          </Button>
        </div>
      )}
    </header>
  );
};
