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
    <header className="h-16 border-b border-border bg-card/90 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-blue-600 text-white flex items-center justify-center shadow-xs">
          <GraduationCap className="w-4 h-4" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-bold tracking-tight text-base text-foreground">FORNAX</span>
          <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider bg-muted border border-border px-1.5 py-0.5 rounded">
            Academic Portal
          </span>
        </div>
      </div>

      {user && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 bg-muted/60 border border-border py-1 px-2.5 rounded-md">
            <div className="w-6 h-6 rounded-full bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold text-[11px] uppercase">
              {user.firstName[0]}
              {user.lastName[0]}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-medium text-foreground">
                {user.firstName} {user.lastName}
              </span>
              <span className="text-[10px] text-muted-foreground">{user.email}</span>
            </div>
            <Badge variant={getRoleBadgeVariant(user.role)} className="text-[10px] uppercase font-mono px-1.5 py-0">
              {user.role}
            </Badge>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-muted-foreground hover:text-rose-600 hover:bg-rose-50 text-xs h-8"
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            Logout
          </Button>
        </div>
      )}
    </header>
  );
};
