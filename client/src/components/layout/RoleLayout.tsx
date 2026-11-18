import React, { useState } from 'react';
import { RoleSidebar } from './RoleSidebar';
import { useAuth } from '@/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProfileSettingsDialog } from '@/components/profile/ProfileSettingsDialog';
import { Menu, X, Database } from 'lucide-react';

interface RoleLayoutProps {
  children: React.ReactNode;
}

export const RoleLayout: React.FC<RoleLayoutProps> = ({ children }) => {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <RoleSidebar />
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-50 w-72 max-w-[80vw] h-full shadow-2xl">
            <RoleSidebar />
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 border-b border-border bg-card/60 backdrop-blur-md px-4 md:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden p-2 text-slate-300"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-200">
                {user?.role === 'STUDENT'
                  ? 'Student Learning Portal'
                  : user?.role === 'TEACHER'
                  ? 'Faculty Academic Management'
                  : 'Institutional Telemetry & Governance'}
              </span>
              <span className="hidden sm:inline-block text-xs text-slate-500">•</span>
              {user?.role === 'ADMIN' ? (
                <Badge variant="outline" className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono border-blue-500/20 text-blue-400 bg-blue-500/5">
                  <Database className="w-3 h-3 text-blue-400" />
                  Admin Console
                </Badge>
              ) : (
                <Badge variant="outline" className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono border-blue-500/20 text-blue-400 bg-blue-500/5">
                  <Database className="w-3 h-3 text-blue-400" />
                  Database Systems (CS301)
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              LMS Connected
            </span>

            <button
              onClick={() => setProfileDialogOpen(true)}
              className="flex items-center gap-2 pl-2 border-l border-border hover:bg-muted/40 p-1.5 rounded-lg transition-colors text-left"
              title="Click to manage account settings"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-xs font-semibold text-blue-300">
                {user?.firstName?.[0]}
                {user?.lastName?.[0]}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-medium text-slate-200">
                  {user?.firstName} {user?.lastName}
                </div>
                <div className="text-[10px] text-slate-400 uppercase font-mono">
                  {user?.role}
                </div>
              </div>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Profile Settings Modal */}
        <ProfileSettingsDialog
          open={profileDialogOpen}
          onOpenChange={setProfileDialogOpen}
        />
      </div>
    </div>
  );
};
