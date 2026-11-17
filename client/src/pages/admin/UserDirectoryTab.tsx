import React, { useState } from 'react';
import { Users, UserPlus, Search, ScanFace, Trash2, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AdminFeedback, type FeedbackState } from './AdminFeedback';
import type { User } from '@/api/hooks';
import {
  useAdminCreateUser,
  useUpdateUserRole,
  useResetUserFace,
  useDeleteUser,
} from '@/api/hooks';

type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';
type RoleFilter = 'ALL' | Role;

interface UserDirectoryTabProps {
  users: Array<User & { createdAt?: string; faceDescriptor?: string | null }> | undefined;
  isLoading: boolean;
  currentUserId: string | undefined;
}

const ROLE_LABELS: Record<Role, string> = {
  STUDENT: 'Student',
  TEACHER: 'Faculty',
  ADMIN: 'Administrator',
};

function extractApiError(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const resp = (err as { response?: { data?: { error?: string } } }).response;
    return resp?.data?.error || fallback;
  }
  return fallback;
}

export const UserDirectoryTab: React.FC<UserDirectoryTabProps> = ({
  users,
  isLoading,
  currentUserId,
}) => {
  // --- Form state ---
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'STUDENT' as Role,
  });
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  // --- Search + filter ---
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');

  // --- Mutations ---
  const createUser = useAdminCreateUser();
  const updateRole = useUpdateUserRole();
  const resetFace = useResetUserFace();
  const deleteUser = useDeleteUser();

  // --- Derived ---
  const allUsers = users ?? [];
  const roleCounts = {
    ALL: allUsers.length,
    STUDENT: allUsers.filter((u) => u.role === 'STUDENT').length,
    TEACHER: allUsers.filter((u) => u.role === 'TEACHER').length,
    ADMIN: allUsers.filter((u) => u.role === 'ADMIN').length,
  };

  const filteredUsers = allUsers.filter((u) => {
    const q = search.toLowerCase();
    const matchesSearch =
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q);
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // --- Handlers ---
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      setFeedback({ type: 'error', text: 'All fields are required.' });
      return;
    }

    try {
      await createUser.mutateAsync(form);
      setFeedback({
        type: 'success',
        text: `Created ${ROLE_LABELS[form.role].toLowerCase()} account: ${form.email}`,
      });
      setForm({ firstName: '', lastName: '', email: '', password: '', role: 'STUDENT' });
    } catch (err: unknown) {
      setFeedback({ type: 'error', text: extractApiError(err, 'Failed to create user') });
    }
  };

  const handleRoleChange = async (userId: string, name: string, newRole: Role) => {
    try {
      await updateRole.mutateAsync({ userId, role: newRole });
      setFeedback({ type: 'success', text: `Updated ${name} to ${ROLE_LABELS[newRole]}` });
    } catch {
      setFeedback({ type: 'error', text: `Failed to update role for ${name}` });
    }
  };

  const handleResetFace = async (userId: string, name: string) => {
    try {
      await resetFace.mutateAsync(userId);
      setFeedback({ type: 'success', text: `Biometric data reset for ${name}` });
    } catch {
      setFeedback({ type: 'error', text: `Failed to reset biometrics for ${name}` });
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete ${email}? This action cannot be undone.`)) return;

    try {
      await deleteUser.mutateAsync(userId);
      setFeedback({ type: 'success', text: `User ${email} has been deleted.` });
    } catch (err: unknown) {
      setFeedback({ type: 'error', text: extractApiError(err, 'Failed to delete user') });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Create User Form */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-emerald-400" /> Enroll New User
          </CardTitle>
          <CardDescription>Create a Student, Faculty, or Admin account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <AdminFeedback feedback={feedback} onDismiss={() => setFeedback(null)} />

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">First Name</label>
                <Input
                  placeholder="e.g. Maya"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Last Name</label>
                <Input
                  placeholder="e.g. Lin"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Email Address</label>
              <Input
                type="email"
                placeholder="user@fornax.edu"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Password</label>
              <Input
                type="password"
                placeholder="Min 6 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Role</label>
              <Select
                value={form.role}
                onValueChange={(val) => setForm({ ...form, role: val as Role })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STUDENT">Student — Course Access & Submissions</SelectItem>
                  <SelectItem value="TEACHER">Faculty — Grading, Attendance & Analytics</SelectItem>
                  <SelectItem value="ADMIN">Admin — System-wide Authority</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full mt-2" disabled={createUser.isPending}>
              {createUser.isPending ? 'Enrolling...' : 'Enroll Account'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* User Directory Table */}
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" /> Identity Directory
            </CardTitle>
            <CardDescription>
              {allUsers.length} registered users across institutional roles
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <Input
              className="pl-8 text-xs h-8"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Role Filter Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {(['ALL', 'STUDENT', 'TEACHER', 'ADMIN'] as RoleFilter[]).map((role) => {
              const labels: Record<RoleFilter, string> = {
                ALL: 'All',
                STUDENT: 'Students',
                TEACHER: 'Faculty',
                ADMIN: 'Admins',
              };
              const isSelected = roleFilter === role;
              return (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {labels[role]} ({roleCounts[role]})
                </button>
              );
            })}
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading user directory...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">No users match your search.</div>
          ) : (
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-900/60 border-b border-border text-xs uppercase font-semibold">
                    <TableHead className="text-slate-400">Identity</TableHead>
                    <TableHead className="text-slate-400">Email</TableHead>
                    <TableHead className="text-slate-400">Role & Elevation</TableHead>
                    <TableHead className="text-slate-400">Biometrics</TableHead>
                    <TableHead className="text-slate-400">Registered</TableHead>
                    <TableHead className="text-right text-slate-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => {
                    const hasFace = Boolean(u.faceDescriptor);
                    const isSelf = u.id === currentUserId;
                    const fullName = `${u.firstName} ${u.lastName}`;

                    return (
                      <TableRow key={u.id} className="border-b border-border/50 hover:bg-slate-900/40">
                        <TableCell className="font-medium text-slate-200 text-xs">
                          {fullName}
                          {isSelf && (
                            <span className="ml-1.5 text-[10px] text-emerald-400 font-mono">(You)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-400 font-mono text-[11px]">
                          {u.email}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={u.role}
                            onValueChange={(val) => handleRoleChange(u.id, fullName, val as Role)}
                            disabled={updateRole.isPending}
                          >
                            <SelectTrigger className="h-7 w-28 text-[11px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="STUDENT">Student</SelectItem>
                              <SelectItem value="TEACHER">Faculty</SelectItem>
                              <SelectItem value="ADMIN">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {hasFace ? (
                              <>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] text-emerald-400 border-emerald-500/30 gap-1"
                                >
                                  <ScanFace className="w-3 h-3 text-emerald-400" /> Enrolled
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-1 text-[10px] text-slate-400 hover:text-amber-400"
                                  title="Reset biometric data"
                                  disabled={resetFace.isPending}
                                  onClick={() => handleResetFace(u.id, fullName)}
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </Button>
                              </>
                            ) : (
                              <span className="text-[11px] text-slate-500">Pending</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-500 text-[11px]">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {!isSelf && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                              title="Delete user account"
                              disabled={deleteUser.isPending}
                              onClick={() => handleDeleteUser(u.id, u.email)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
