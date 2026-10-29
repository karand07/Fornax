import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { ClassPhotoDialog } from '@/components/ClassPhotoDialog';
import {
  useCourses,
  useCreateAttendanceSession,
  useStartAttendanceSession,
  useCloseAttendanceSession,
  useSessionDetails,
  useSessionCode,
  useSessionRecords,
  useOpenAttendanceWindow,
  useReviewAttendanceRecord,
} from '@/api/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  QrCode,
  Play,
  Square,
  Users,
  Clock,
  ShieldCheck,
  CheckCircle2,
  ScanFace,
  Search,
  Copy,
  Check,
  Radio,
  ArrowLeft,
  Hourglass,
  AlertTriangle,
  XCircle,
  Wifi,
  WifiOff,
  Eye,
  EyeOff,
  Camera,
} from 'lucide-react';

export const LiveAttendancePage: React.FC = () => {
  const navigate = useNavigate();
  const { sessionId: paramSessionId } = useParams<{ sessionId?: string }>();
  const { data: courses } = useCourses();
  const queryClient = useQueryClient();

  // Active session ID state
  const [activeSessionId, setActiveSessionId] = useState<string | null>(paramSessionId || null);
  const [isClassPhotoOpen, setIsClassPhotoOpen] = useState(false);

  // New session creation form state
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [sessionTitle, setSessionTitle] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Search filter for students
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  // Mutations
  const createSessionMutation = useCreateAttendanceSession();
  const startSessionMutation = useStartAttendanceSession();
  const closeSessionMutation = useCloseAttendanceSession();
  const openWindowMutation = useOpenAttendanceWindow();
  const reviewRecordMutation = useReviewAttendanceRecord();

  // Mode B window state
  const [windowSecondsInput, setWindowSecondsInput] = useState<number>(90);
  const [windowRemaining, setWindowRemaining] = useState<number | null>(null);

  // Queries for active session
  const { data: sessionData, refetch: refetchDetails } = useSessionDetails(activeSessionId || '');
  const isSessionActive = Boolean(sessionData?.isActive);

  // Rotating Code Query (refetches code every 5s or on manual invalidate)
  const { data: codeData, refetch: refetchCode } = useSessionCode(
    activeSessionId || '',
    isSessionActive
  );

  // Records Query - POLLS EVERY 3 SECONDS
  const { data: records, isLoading: recordsLoading } = useSessionRecords(
    activeSessionId || '',
    isSessionActive
  );

  // Window Ends At countdown timer
  useEffect(() => {
    if (!sessionData?.windowEndsAt) {
      setWindowRemaining(null);
      return;
    }

    const updateWindowRemaining = () => {
      const ends = new Date(sessionData.windowEndsAt!).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((ends - now) / 1000));
      setWindowRemaining(diff);
    };

    updateWindowRemaining();
    const interval = setInterval(updateWindowRemaining, 1000);
    return () => clearInterval(interval);
  }, [sessionData?.windowEndsAt]);

  // Smooth client-side countdown timer synchronized with clock
  const [countdown, setCountdown] = useState<number>(5);
  const stepSeconds = codeData?.stepSeconds || 5;

  useEffect(() => {
    if (!isSessionActive) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const currentSec = Math.floor(now / 1000);
      const remaining = stepSeconds - (currentSec % stepSeconds);
      setCountdown(remaining);

      // When the countdown reaches rollover, refetch code
      if (remaining === stepSeconds) {
        refetchCode();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isSessionActive, stepSeconds, refetchCode]);

  const handleOpenWindow = async () => {
    if (!activeSessionId) return;
    try {
      await openWindowMutation.mutateAsync({
        sessionId: activeSessionId,
        seconds: Number(windowSecondsInput) || 90,
      });
      await refetchDetails();
    } catch (err: any) {
      console.error('Failed to open marking window', err);
    }
  };

  const handleReviewRecord = async (recordId: string, status: 'PRESENT' | 'ABSENT') => {
    try {
      await reviewRecordMutation.mutateAsync({ recordId, status });
    } catch (err: any) {
      console.error('Failed to review record', err);
    }
  };


  // Handle Start New Session
  const handleStartNewSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedCourseId) {
      setFormError('Please select a course for this session');
      return;
    }

    try {
      const newSession = await createSessionMutation.mutateAsync({
        courseId: selectedCourseId,
        title: sessionTitle || 'Lecture Attendance Verification',
      });

      setActiveSessionId(newSession.id);
      navigate(`/teacher/live-attendance/${newSession.id}`, { replace: true });
    } catch (err: any) {
      setFormError(err?.response?.data?.error || 'Failed to start attendance session');
    }
  };

  // Handle Close / End Session
  const handleEndSession = async () => {
    if (!activeSessionId) return;
    try {
      await closeSessionMutation.mutateAsync(activeSessionId);
      await refetchDetails();
    } catch (err: any) {
      console.error('Failed to close session', err);
    }
  };

  // Handle Re-open / Resume Session
  const handleResumeSession = async () => {
    if (!activeSessionId) return;
    try {
      await startSessionMutation.mutateAsync(activeSessionId);
      await refetchDetails();
      await refetchCode();
    } catch (err: any) {
      console.error('Failed to restart session', err);
    }
  };

  // Copy code helper
  const handleCopyCode = () => {
    if (!codeData?.code) return;
    navigator.clipboard.writeText(codeData.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filter attendance records
  const filteredRecords = records?.filter((rec) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const fullName = `${rec.user?.firstName || ''} ${rec.user?.lastName || ''}`.toLowerCase();
    const email = (rec.user?.email || '').toLowerCase();
    return fullName.includes(query) || email.includes(query);
  });

  // Calculate SVG countdown ring properties
  const radius = 46;
  const circumference = 2 * Math.PI * radius; // ~289.02
  const progressPercent = Math.max(0, Math.min(1, countdown / stepSeconds));
  const strokeDashoffset = circumference - progressPercent * circumference;

  const currentCourse = courses?.find(
    (c) => c.id === selectedCourseId || c.id === sessionData?.courseId
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/teacher')}
            className="text-xs text-slate-400 hover:text-slate-200 gap-1.5 mb-2 -ml-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Faculty Portal
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-100 tracking-tight">
              Live Attendance Session
            </h1>
            {isSessionActive ? (
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs font-mono flex items-center gap-1.5 px-2.5 py-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                LIVE BROADCAST
              </Badge>
            ) : activeSessionId ? (
              <Badge variant="outline" className="text-xs font-mono border-slate-700 text-slate-400">
                SESSION CLOSED
              </Badge>
            ) : null}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Dynamic rotating HMAC code updates every {stepSeconds} seconds to prevent unauthorized
            attendance proxying.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          {activeSessionId && isSessionActive && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleEndSession}
              disabled={closeSessionMutation.isPending}
              className="text-xs gap-1.5 shadow-md shadow-rose-900/20"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              End Attendance Session
            </Button>
          )}

          {activeSessionId && isSessionActive && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsClassPhotoOpen(true)}
              className="text-xs gap-1.5 bg-purple-950/40 border-purple-700/60 text-purple-300 hover:bg-purple-900/60"
            >
              <Camera className="w-3.5 h-3.5 text-purple-400" />
              Capture Class Photo
            </Button>
          )}

          {activeSessionId && !isSessionActive && (
            <Button
              variant="default"
              size="sm"
              onClick={handleResumeSession}
              disabled={startSessionMutation.isPending}
              className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Re-Open Session
            </Button>
          )}

          {activeSessionId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setActiveSessionId(null);
                navigate('/teacher/live-attendance', { replace: true });
              }}
              className="text-xs text-slate-300 border-slate-700 hover:bg-slate-800"
            >
              New Session
            </Button>
          )}
        </div>
      </div>

      {/* START SESSION VIEW (When no active session is selected) */}
      {!activeSessionId && (
        <Card className="max-w-2xl mx-auto border-border bg-card shadow-xl">
          <CardHeader>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-2">
              <QrCode className="w-5 h-5" />
            </div>
            <CardTitle className="text-xl">Launch Live Attendance Broadcast</CardTitle>
            <CardDescription className="text-xs">
              Select an active course and lecture topic to broadcast a high-security rotating code
              with real-time roster updates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStartNewSession} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-slate-300 mb-1.5 block">
                  Target Course
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full h-10 rounded-md border border-border bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                >
                  <option value="">-- Select academic course --</option>
                  {courses?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 mb-1.5 block">
                  Session Topic / Lecture Name
                </label>
                <Input
                  placeholder="e.g. Distributed Consensus & Raft Protocol"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  required
                />
              </div>

              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-lg text-xs text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  Security Specifications:
                </p>
                <p>• Cryptographic HMAC-SHA256 rotating 6-digit passcode.</p>
                <p>• Auto-regenerated every {stepSeconds} seconds with countdown ring display.</p>
                <p>• Real-time roster table polling student check-ins every 3 seconds.</p>
              </div>

              <Button
                type="submit"
                disabled={createSessionMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-500 font-semibold gap-2"
                size="lg"
              >
                <Play className="w-4 h-4 fill-current" />
                {createSessionMutation.isPending
                  ? 'Initializing Session...'
                  : 'Start Live Attendance Session'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ACTIVE LIVE ATTENDANCE VIEW */}
      {activeSessionId && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: ROTATING HMAC CODE & COUNTDOWN RING */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="border-border bg-card shadow-2xl overflow-hidden relative">
              {/* Top Session Banner */}
              <div className="p-4 bg-gradient-to-r from-blue-950/60 to-slate-900 border-b border-border/80 flex items-center justify-between">
                <div>
                  <Badge variant="default" className="text-[10px] font-mono mb-1">
                    {sessionData?.course.code || currentCourse?.code || 'COURSE'}
                  </Badge>
                  <h3 className="font-bold text-slate-100 text-sm truncate max-w-[220px]">
                    {sessionData?.title || 'Lecture Session'}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-md">
                  <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                  <span>{isSessionActive ? 'ACTIVE' : 'CLOSED'}</span>
                </div>
              </div>

              <CardContent className="flex flex-col items-center pt-6 pb-6 space-y-6">
                {/* LARGE ROTATING CODE DISPLAY */}
                <div className="text-center w-full">
                  <p className="text-xs uppercase font-mono tracking-wider text-slate-400 mb-2">
                    Current Attendance Code
                  </p>

                  <div className="relative group inline-block">
                    <div className="px-6 py-3.5 rounded-2xl bg-slate-950 border-2 border-blue-500/40 shadow-inner flex items-center justify-center gap-3">
                      <span className="text-5xl md:text-6xl font-black font-mono tracking-widest text-slate-100 select-all">
                        {isSessionActive && codeData?.code
                          ? `${codeData.code.slice(0, 3)} ${codeData.code.slice(3)}`
                          : '------'}
                      </span>
                      {isSessionActive && (
                        <button
                          onClick={handleCopyCode}
                          title="Copy Code"
                          className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                        >
                          {copied ? (
                            <Check className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <Copy className="w-5 h-5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* COUNTDOWN TO windowEndsAt NEXT TO / BELOW ROTATING CODE */}
                  <div className="mt-3 flex items-center justify-center">
                    {windowRemaining !== null && windowRemaining > 0 ? (
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-mono shadow-md animate-pulse">
                        <Hourglass className="w-4 h-4 text-amber-400 animate-spin" />
                        <span className="font-semibold">
                          Marking Window: {Math.floor(windowRemaining / 60)}:{(windowRemaining % 60).toString().padStart(2, '0')} remaining
                        </span>
                      </div>
                    ) : sessionData?.windowEndsAt ? (
                      <Badge variant="outline" className="border-slate-700 text-slate-500 font-mono text-xs px-3 py-1">
                        <Clock className="w-3.5 h-3.5 mr-1 text-slate-500" />
                        Self-Marking Window Expired
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-slate-800 text-slate-500 font-mono text-xs px-3 py-1">
                        Self-Marking Window Closed
                      </Badge>
                    )}
                  </div>
                </div>

                {/* OPEN MARKING WINDOW CONTROLS */}
                {isSessionActive && (
                  <div className="w-full p-4 rounded-xl bg-slate-900/80 border border-blue-500/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        Self-Marking Window
                      </span>
                      {windowRemaining !== null && windowRemaining > 0 ? (
                        <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono">
                          ACTIVE ({windowRemaining}s)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-mono border-slate-700 text-slate-400">
                          READY TO OPEN
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative w-28">
                        <Input
                          type="number"
                          min={10}
                          max={600}
                          value={windowSecondsInput}
                          onChange={(e) =>
                            setWindowSecondsInput(
                              Math.max(10, Math.min(600, parseInt(e.target.value, 10) || 10))
                            )
                          }
                          className="h-9 text-xs bg-slate-950 font-mono pr-8 text-center"
                          placeholder="90"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-mono">
                          s
                        </span>
                      </div>
                      <Button
                        onClick={handleOpenWindow}
                        disabled={openWindowMutation.isPending}
                        size="sm"
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-xs font-semibold gap-1.5 h-9"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        {openWindowMutation.isPending ? 'Opening...' : 'Open Marking Window'}
                      </Button>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      Enables student self-marking with blink liveness & face match for {windowSecondsInput} seconds.
                    </p>
                  </div>
                )}

                {/* MODE A: CLASS PHOTO ATTENDANCE */}
                {isSessionActive && (
                  <div className="w-full p-4 rounded-xl bg-slate-900/80 border border-purple-500/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-purple-400" />
                        Mode A: Class Photo
                      </span>
                      <Badge variant="outline" className="text-[10px] font-mono border-purple-800 text-purple-300">
                        BROWSER FACIAL AI
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      Take or upload classroom photos. Faces are detected locally and matched against course enrollments.
                    </p>
                    <Button
                      onClick={() => setIsClassPhotoOpen(true)}
                      size="sm"
                      className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold gap-1.5 h-9"
                    >
                      <ScanFace className="w-4 h-4" />
                      Capture Class Photo
                    </Button>
                  </div>
                )}

                {/* COUNTDOWN RING & TIMER */}
                {isSessionActive ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                      {/* SVG Circular Progress Ring */}
                      <svg className="w-full h-full transform -rotate-90">
                        {/* Background track circle */}
                        <circle
                          cx="64"
                          cy="64"
                          r={radius}
                          stroke="currentColor"
                          strokeWidth="8"
                          className="text-slate-800"
                          fill="transparent"
                        />
                        {/* Animated progress circle */}
                        <circle
                          cx="64"
                          cy="64"
                          r={radius}
                          stroke="currentColor"
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          className={`transition-all duration-1000 ease-linear ${
                            countdown <= 1
                              ? 'text-rose-500'
                              : countdown <= 2
                              ? 'text-amber-400'
                              : 'text-blue-500'
                          }`}
                          fill="transparent"
                        />
                      </svg>

                      {/* Center Countdown Value */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span
                          className={`text-2xl font-black font-mono leading-none ${
                            countdown <= 1
                              ? 'text-rose-400'
                              : countdown <= 2
                              ? 'text-amber-400'
                              : 'text-slate-100'
                          }`}
                        >
                          {countdown}s
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase">
                          Refreshes
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 font-mono text-center">
                      Rotating HMAC code valid for this {stepSeconds}s window
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 text-center text-xs text-slate-400">
                    <Clock className="w-6 h-6 mx-auto mb-1 text-slate-500" />
                    Session is closed. Click &quot;Re-Open Session&quot; to resume rotating codes.
                  </div>
                )}

                {/* QR CODE DISPLAY */}
                {isSessionActive && codeData && (
                  <div className="flex flex-col items-center gap-2 pt-2 border-t border-border/60 w-full">
                    <div className="p-3 bg-white rounded-xl shadow-md border border-slate-200">
                      <QRCodeSVG
                        value={JSON.stringify({
                          sessionId: activeSessionId,
                          qrCodeToken: codeData.code,
                          token: codeData.token,
                        })}
                        size={160}
                        level="H"
                        includeMargin={false}
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Students can scan QR or type the 6-digit code
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Session Info Card */}
            <Card className="border-border bg-slate-900/40">
              <CardContent className="p-4 text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Session ID:</span>
                  <span className="font-mono text-slate-300 text-[11px] select-all">
                    {activeSessionId}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Course:</span>
                  <span className="font-medium text-slate-200">
                    {sessionData?.course.title || 'Course'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Security Algorithm:</span>
                  <span className="font-mono text-blue-400">HMAC-SHA256 (TOTP-Style)</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: LIVE TABLE OF MARKED STUDENTS & REVIEW QUEUE (POLLING EVERY 3 SECONDS) */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="border-border bg-card shadow-xl overflow-hidden">
              <Tabs defaultValue="roster" className="w-full">
                <CardHeader className="pb-3 border-b border-border/80">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <TabsList className="bg-slate-900 border border-slate-800">
                        <TabsTrigger value="roster" className="gap-1.5 text-xs">
                          <Users className="w-3.5 h-3.5 text-blue-400" />
                          <span>Verified Present</span>
                          <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                            {records?.filter((r) => r.status === 'PRESENT').length || 0}
                          </span>
                        </TabsTrigger>
                        <TabsTrigger value="review" className="gap-1.5 text-xs relative">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          <span>Needs Review</span>
                          {records && records.filter((r) => r.status === 'FLAGGED').length > 0 ? (
                            <Badge className="ml-1 bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] px-1.5 py-0 font-mono animate-pulse">
                              {records.filter((r) => r.status === 'FLAGGED').length}
                            </Badge>
                          ) : (
                            <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-500">
                              0
                            </span>
                          )}
                        </TabsTrigger>
                      </TabsList>

                      <Badge
                        variant="outline"
                        className="hidden md:inline-flex text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-2 py-0.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1"></span>
                        POLLING (3s)
                      </Badge>
                    </div>

                    {/* Search Filter */}
                    <div className="relative w-full sm:w-52">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        placeholder="Search student..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-8 text-xs bg-slate-900 border-slate-800"
                      />
                    </div>
                  </div>
                </CardHeader>

                {/* TAB 1: VERIFIED PRESENT ROSTER */}
                <TabsContent value="roster" className="p-0 m-0">
                  <CardContent className="p-0">
                    {recordsLoading && !records ? (
                      <div className="p-8 text-center text-xs text-slate-400 font-mono animate-pulse">
                        Loading live attendance records...
                      </div>
                    ) : filteredRecords &&
                      filteredRecords.filter((r) => r.status === 'PRESENT').length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-border bg-slate-900/60 text-slate-400 font-mono text-[11px] uppercase">
                              <th className="py-2.5 px-4 font-medium">Student Name</th>
                              <th className="py-2.5 px-4 font-medium">Email</th>
                              <th className="py-2.5 px-4 font-medium">Verification Method</th>
                              <th className="py-2.5 px-4 font-medium">Time Logged</th>
                              <th className="py-2.5 px-4 font-medium text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60">
                            {filteredRecords
                              .filter((r) => r.status === 'PRESENT')
                              .map((record) => {
                                const isFace = record.verifiedBy === 'FACE';
                                const checkinTime = new Date(record.timestamp).toLocaleTimeString();

                                return (
                                  <tr
                                    key={record.id}
                                    className="hover:bg-slate-900/40 transition-colors group"
                                  >
                                    <td className="py-3 px-4">
                                      <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[11px] border border-blue-500/30">
                                          {record.user?.firstName?.[0] || 'S'}
                                          {record.user?.lastName?.[0] || ''}
                                        </div>
                                        <span className="font-medium text-slate-200">
                                          {record.user?.firstName} {record.user?.lastName}
                                        </span>
                                      </div>
                                    </td>

                                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                                      {record.user?.email}
                                    </td>

                                    <td className="py-3 px-4">
                                      {isFace ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                          <ScanFace className="w-3 h-3" />
                                          {record.method === 'SELF' ? 'Self Biometric' : 'Face Biometric'}
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                          <QrCode className="w-3 h-3" />
                                          Rotating Code
                                        </span>
                                      )}
                                    </td>

                                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                                      {checkinTime}
                                    </td>

                                    <td className="py-3 px-4 text-right">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                        <CheckCircle2 className="w-3 h-3" />
                                        PRESENT
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-12 text-center text-slate-400 space-y-2">
                        <div className="w-12 h-12 mx-auto rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-3">
                          <Clock className="w-6 h-6 animate-pulse" />
                        </div>
                        <p className="text-sm font-semibold text-slate-300">
                          Waiting for Student Check-Ins
                        </p>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                          Display the rotating passcode or open the marking window. Present records will
                          appear here automatically.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </TabsContent>

                {/* TAB 2: NEEDS REVIEW (FLAGGED RECORDS) */}
                <TabsContent value="review" className="p-0 m-0">
                  <CardContent className="p-0">
                    {filteredRecords &&
                    filteredRecords.filter((r) => r.status === 'FLAGGED').length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-b border-border bg-amber-500/5 text-amber-300 font-mono text-[11px] uppercase">
                              <TableHead className="py-2.5 px-4 font-medium">Student</TableHead>
                              <TableHead className="py-2.5 px-4 font-medium">Distance</TableHead>
                              <TableHead className="py-2.5 px-4 font-medium">Liveness</TableHead>
                              <TableHead className="py-2.5 px-4 font-medium">Network</TableHead>
                              <TableHead className="py-2.5 px-4 font-medium">Integrity</TableHead>
                              <TableHead className="py-2.5 px-4 font-medium text-right">
                                Teacher Review
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="divide-y divide-border/60">
                            {filteredRecords
                              .filter((r) => r.status === 'FLAGGED')
                              .map((record) => {
                                const dist =
                                  record.faceDistance !== null && record.faceDistance !== undefined
                                    ? record.faceDistance.toFixed(3)
                                    : '—';
                                const integrityPct =
                                  record.integrityScore !== null && record.integrityScore !== undefined
                                    ? `${Math.round(record.integrityScore * 100)}%`
                                    : '—';

                                return (
                                  <TableRow
                                    key={record.id}
                                    className="hover:bg-amber-500/5 transition-colors group"
                                  >
                                    {/* Student Column */}
                                    <TableCell className="py-3 px-4">
                                      <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[11px] border border-amber-500/30">
                                          {record.user?.firstName?.[0] || 'S'}
                                          {record.user?.lastName?.[0] || ''}
                                        </div>
                                        <div>
                                          <p className="font-medium text-slate-200">
                                            {record.user?.firstName} {record.user?.lastName}
                                          </p>
                                          <p className="text-[11px] text-slate-400 font-mono">
                                            {record.user?.email}
                                          </p>
                                        </div>
                                      </div>
                                    </TableCell>

                                    {/* Distance Column */}
                                    <TableCell className="py-3 px-4 font-mono text-xs text-slate-300">
                                      {dist}
                                    </TableCell>

                                    {/* Liveness Column */}
                                    <TableCell className="py-3 px-4">
                                      {record.livenessPassed ? (
                                        <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono flex items-center gap-1 w-fit">
                                          <Eye className="w-3 h-3" />
                                          Passed
                                        </Badge>
                                      ) : (
                                        <Badge className="bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10px] font-mono flex items-center gap-1 w-fit">
                                          <EyeOff className="w-3 h-3" />
                                          Failed
                                        </Badge>
                                      )}
                                    </TableCell>

                                    {/* Network Column */}
                                    <TableCell className="py-3 px-4">
                                      {record.networkOk ? (
                                        <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono flex items-center gap-1 w-fit">
                                          <Wifi className="w-3 h-3" />
                                          On-Campus
                                        </Badge>
                                      ) : (
                                        <Badge className="bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10px] font-mono flex items-center gap-1 w-fit">
                                          <WifiOff className="w-3 h-3" />
                                          Off-Campus
                                        </Badge>
                                      )}
                                    </TableCell>

                                    {/* Integrity Score Column */}
                                    <TableCell className="py-3 px-4 font-mono text-xs font-semibold text-amber-400">
                                      {integrityPct}
                                    </TableCell>

                                    {/* Review Actions: Approve (PRESENT) / Reject (ABSENT) */}
                                    <TableCell className="py-3 px-4 text-right">
                                      <div className="flex items-center justify-end gap-1.5">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          disabled={reviewRecordMutation.isPending}
                                          onClick={() => handleReviewRecord(record.id, 'PRESENT')}
                                          className="h-7 px-2.5 text-[11px] font-medium border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 gap-1"
                                          title="Approve as PRESENT"
                                        >
                                          <Check className="w-3 h-3" />
                                          Approve
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          disabled={reviewRecordMutation.isPending}
                                          onClick={() => handleReviewRecord(record.id, 'ABSENT')}
                                          className="h-7 px-2.5 text-[11px] font-medium border-rose-500/40 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 gap-1"
                                          title="Reject as ABSENT"
                                        >
                                          <XCircle className="w-3 h-3" />
                                          Reject
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="p-12 text-center text-slate-400 space-y-2">
                        <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-semibold text-slate-300">
                          No Records Pending Teacher Review
                        </p>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                          Records flagged by integrity anomalies (such as missing blinks or off-network
                          submissions) will appear here for one-click approval or rejection.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </TabsContent>
              </Tabs>
            </Card>

            {/* Quick Summary Pill Stats */}
            {records && records.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-card border border-border rounded-lg text-center">
                  <p className="text-[10px] uppercase font-mono text-slate-400">Total Check-Ins</p>
                  <p className="text-xl font-bold text-slate-100 mt-0.5">{records.length}</p>
                </div>
                <div className="p-3 bg-card border border-border rounded-lg text-center">
                  <p className="text-[10px] uppercase font-mono text-slate-400">Via Rotating Code</p>
                  <p className="text-xl font-bold text-blue-400 mt-0.5">
                    {records.filter((r) => r.verifiedBy === 'QR').length}
                  </p>
                </div>
                <div className="p-3 bg-card border border-border rounded-lg text-center">
                  <p className="text-[10px] uppercase font-mono text-slate-400">Via Facial Match</p>
                  <p className="text-xl font-bold text-purple-400 mt-0.5">
                    {records.filter((r) => r.verifiedBy === 'FACE').length}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSessionId && (
        <ClassPhotoDialog
          sessionId={activeSessionId}
          isOpen={isClassPhotoOpen}
          onClose={() => setIsClassPhotoOpen(false)}
          onAttendanceUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ['sessionRecords', activeSessionId] });
            queryClient.invalidateQueries({ queryKey: ['sessionRecords'] });
            refetchDetails();
          }}
        />
      )}
    </div>
  );
};
