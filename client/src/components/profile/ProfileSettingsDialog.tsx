import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth-context';
import { useUserProfile, useUpdateUserProfile } from '@/api/hooks';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  User,
  Mail,
  Shield,
  ScanFace,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Save,
} from 'lucide-react';

interface ProfileSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProfileSettingsDialog: React.FC<ProfileSettingsDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const { data: profile, isLoading: isProfileLoading } = useUserProfile();
  const updateMutation = useUpdateUserProfile();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync state when profile loads or dialog opens
  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName || '');
      setLastName(profile.lastName || '');
    } else if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
    }
    setSuccessMsg(null);
    setErrorMsg(null);
  }, [profile, user, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    if (!trimmedFirst || !trimmedLast) {
      setErrorMsg('First and last name cannot be empty.');
      return;
    }

    try {
      const updated = await updateMutation.mutateAsync({
        firstName: trimmedFirst,
        lastName: trimmedLast,
      });

      // Update reactive auth-context state so UI updates immediately
      updateUser({
        firstName: updated.firstName,
        lastName: updated.lastName,
      });

      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => {
        onOpenChange(false);
      }, 1200);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to update profile';
      setErrorMsg(msg);
    }
  };

  const hasFaceEnrolled = profile?.hasFaceEnrolled ?? user?.hasFaceEnrolled ?? false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs font-mono">
              {firstName?.[0] || 'U'}
              {lastName?.[0] || ''}
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Account Settings
              </DialogTitle>
              <DialogDescription className="text-xs">
                Manage your institutional identity and verification preferences.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Notifications */}
          {errorMsg && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Readonly Institutional Identity */}
          <div className="rounded-lg bg-muted/40 p-3 border border-border/60 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                Institutional Email
              </span>
              <span className="font-mono font-medium text-foreground">
                {profile?.email || user?.email}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-border/40">
              <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                Role
              </span>
              <Badge variant="outline" className="font-mono text-[10px] tracking-wider text-primary border-primary/30">
                {profile?.role || user?.role || 'STUDENT'}
              </Badge>
            </div>

            {profile?.createdAt && (
              <div className="flex items-center justify-between pt-1 border-t border-border/40">
                <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  Account Created
                </span>
                <span className="font-mono text-muted-foreground text-[11px]">
                  {new Date(profile.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Biometrics Status Card */}
          <div className="p-3 rounded-lg border border-border/80 bg-card/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ScanFace className="w-5 h-5 text-indigo-400 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-foreground">Biometric Facial Profile</div>
                <div className="text-[11px] text-muted-foreground">
                  {hasFaceEnrolled
                    ? '128-dimensional embedding active for Mode B verification'
                    : 'Not enrolled yet. Required for Mode B attendance.'}
                </div>
              </div>
            </div>

            <Button
              type="button"
              variant={hasFaceEnrolled ? 'outline' : 'default'}
              size="sm"
              className="text-xs h-7 shrink-0 font-medium"
              onClick={() => {
                onOpenChange(false);
                navigate('/student/enroll-face');
              }}
            >
              {hasFaceEnrolled ? 'Re-enroll' : 'Enroll Now'}
            </Button>
          </div>

          {/* Editable Names */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center gap-1">
                <User className="w-3 h-3 text-muted-foreground" />
                First Name
              </label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className="text-xs h-9"
                required
                disabled={isProfileLoading || updateMutation.isPending}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center gap-1">
                <User className="w-3 h-3 text-muted-foreground" />
                Last Name
              </label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                className="text-xs h-9"
                required
                disabled={isProfileLoading || updateMutation.isPending}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              size="sm"
              className="text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
