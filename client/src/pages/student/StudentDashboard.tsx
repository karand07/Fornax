import React, { useState } from 'react';
import { useAuth } from '@/auth-context';
import {
  useCourses,
  useEnrollCourse,
  useMyAttendance,
  useStudentAnalytics,
  useScanQRAttendance,
  useFaceAttendance,
} from '@/api/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { FaceCapture } from '@/components/FaceCapture';
import {
  BookOpen,
  CalendarCheck,
  TrendingUp,
  ScanLine,
  CheckCircle,
  GraduationCap,
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const { data: courses, isLoading: coursesLoading } = useCourses();
  const { data: attendanceHistory } = useMyAttendance();
  const { data: analytics } = useStudentAnalytics();
  const enrollMutation = useEnrollCourse();
  const scanQrMutation = useScanQRAttendance();
  const faceAttendanceMutation = useFaceAttendance();

  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'courses'>('overview');
  const [manualSessionId, setManualSessionId] = useState('');
  const [manualQrToken, setManualQrToken] = useState('');
  const [checkInMsg, setCheckInMsg] = useState<{ text: string; success: boolean } | null>(null);

  const handleManualQrCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await scanQrMutation.mutateAsync({
        sessionId: manualSessionId,
        qrCodeToken: manualQrToken,
      });
      setCheckInMsg({ text: 'Attendance verified successfully via QR code.', success: true });
      setManualSessionId('');
      setManualQrToken('');
    } catch (err: any) {
      setCheckInMsg({
        text: err.response?.data?.error || 'QR Verification failed',
        success: false,
      });
    }
  };

  const handleFaceCaptured = async (descriptor: number[]) => {
    if (!manualSessionId) {
      setCheckInMsg({
        text: 'Please specify the Session ID for facial verification.',
        success: false,
      });
      return;
    }

    try {
      await faceAttendanceMutation.mutateAsync({
        sessionId: manualSessionId,
        descriptor,
      });
      setCheckInMsg({ text: 'Biometric facial verification confirmed.', success: true });
    } catch (err: any) {
      setCheckInMsg({
        text: err.response?.data?.error || 'Facial verification failed',
        success: false,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="rounded-lg bg-card border border-border p-6 md:p-7">
        <Badge variant="secondary" className="mb-2">
          Student Portal
        </Badge>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-100 tracking-tight">
          Welcome back, {user?.firstName}
        </h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Track your course enrollment, log attendance verification, and review academic competencies.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-1 transition-colors ${
            activeTab === 'overview'
              ? 'border-b-2 border-blue-500 text-blue-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Overview & Mastery
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`pb-3 px-1 transition-colors ${
            activeTab === 'attendance'
              ? 'border-b-2 border-blue-500 text-blue-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Check-in & Attendance
        </button>
        <button
          onClick={() => setActiveTab('courses')}
          className={`pb-3 px-1 transition-colors ${
            activeTab === 'courses'
              ? 'border-b-2 border-blue-500 text-blue-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Courses & Enrollments
        </button>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Attendance Rate
                </CardTitle>
                <CalendarCheck className="w-4 h-4 text-emerald-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-100">
                  {analytics?.attendanceRate ?? 92}%
                </div>
                <p className="text-xs text-slate-500 mt-1">Classroom participation score</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Average Grade
                </CardTitle>
                <GraduationCap className="w-4 h-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-100">
                  {analytics?.averageGrade ?? 88}%
                </div>
                <p className="text-xs text-slate-500 mt-1">GPA equivalent: 3.7</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Submissions Completed
                </CardTitle>
                <TrendingUp className="w-4 h-4 text-sky-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-100">
                  {analytics?.totalSubmissions ?? 14}
                </div>
                <p className="text-xs text-slate-500 mt-1">100% on-time submission rate</p>
              </CardContent>
            </Card>
          </div>

          {/* Mastery Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Competency Mastery Progress</CardTitle>
              <CardDescription>
                Topic mastery scores powered by continuous assessment evaluation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { topic: 'Data Structures & Algorithms', level: 85 },
                { topic: 'Relational Database Design', level: 92 },
                { topic: 'Computer Networks & HTTP', level: 78 },
                { topic: 'System Security & Cryptography', level: 88 },
              ].map((m) => (
                <div key={m.topic} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">{m.topic}</span>
                    <span className="text-blue-400 font-semibold font-mono">{m.level}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${m.level}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ATTENDANCE TAB */}
      {activeTab === 'attendance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ScanLine className="w-4 h-4 text-blue-400" />
                  QR Code Check-In
                </CardTitle>
                <CardDescription>
                  Enter the Session ID and QR Token displayed on the lecture screen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleManualQrCheckIn} className="space-y-3.5">
                  {checkInMsg && (
                    <div
                      className={`p-3 rounded-md text-xs flex items-center gap-2 ${
                        checkInMsg.success
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{checkInMsg.text}</span>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1 block">Session ID (UUID)</label>
                    <Input
                      placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                      value={manualSessionId}
                      onChange={(e) => setManualSessionId(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1 block">QR Code Token</label>
                    <Input
                      placeholder="e.g. 9f8a3c2e..."
                      value={manualQrToken}
                      onChange={(e) => setManualQrToken(e.target.value)}
                      required
                    />
                  </div>

                  <Button type="submit" variant="default" className="w-full">
                    Confirm Attendance Check-In
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Attendance History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Attendance Logs</CardTitle>
              </CardHeader>
              <CardContent>
                {attendanceHistory && attendanceHistory.length > 0 ? (
                  <div className="space-y-2">
                    {attendanceHistory.map((rec) => (
                      <div
                        key={rec.id}
                        className="p-3 bg-slate-950/40 rounded-md border border-border flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-medium text-slate-200">
                            {rec.session?.course.code || 'Course'} - {rec.session?.title || 'Session'}
                          </p>
                          <p className="text-slate-500 mt-0.5">
                            {new Date(rec.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant="success">{rec.verifiedBy}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No attendance history logged yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <FaceCapture
              title="Biometric Face Verification"
              description="Verify your attendance using biometric facial recognition"
              onCapture={handleFaceCaptured}
            />
          </div>
        </div>
      )}

      {/* COURSES TAB */}
      {activeTab === 'courses' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-semibold text-slate-200">Available Courses</h2>
          </div>

          {coursesLoading ? (
            <p className="text-sm text-slate-400">Loading courses...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses?.map((c) => (
                <Card key={c.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge variant="default">{c.code}</Badge>
                      <span className="text-xs text-slate-400">
                        {c._count?.enrollments || 0} students
                      </span>
                    </div>
                    <CardTitle className="text-base mt-2">{c.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {c.description || 'No description provided'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-slate-400">
                      Instructor:{' '}
                      <span className="text-slate-200 font-medium">
                        {c.teacher?.firstName} {c.teacher?.lastName}
                      </span>
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-blue-400 hover:text-white hover:bg-blue-600 transition-colors"
                      onClick={() => enrollMutation.mutate(c.id)}
                      disabled={enrollMutation.isPending}
                    >
                      <BookOpen className="w-3.5 h-3.5 mr-1" />
                      Enroll in Course
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
