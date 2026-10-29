import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth-context';
import { useCourses, useCreateCourse, useCreateAttendanceSession } from '@/api/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AttendanceCode } from '@/components/AttendanceCode';
import { ConceptResourceViewer } from '@/components/ConceptResourceViewer';
import {
  Users,
  QrCode,
  PlusCircle,
  BookOpen,
  CheckCircle,
  Layers,
  LayoutDashboard,
  Radio,
  HelpCircle,
} from 'lucide-react';

export const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: courses } = useCourses();
  const createCourseMutation = useCreateCourse();
  const createSessionMutation = useCreateAttendanceSession();

  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab') as 'overview' | 'courses' | 'curriculum' | 'sessions' | 'grading' | null;
  const [activeTab, setActiveTab] = useState<'overview' | 'courses' | 'curriculum' | 'sessions' | 'grading'>(
    urlTab || 'overview'
  );

  useEffect(() => {
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  const handleTabChange = (tab: 'overview' | 'courses' | 'curriculum' | 'sessions' | 'grading') => {
    setActiveTab(tab);
    setSearchParams(tab === 'overview' ? {} : { tab });
  };

  // Create course form state
  const [courseCode, setCourseCode] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [activeSession, setActiveSession] = useState<{
    id: string;
    title: string;
    courseCode: string;
    qrCodeToken: string;
  } | null>(null);

  // Live session generation state
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [sessionTitle, setSessionTitle] = useState('');

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    await createCourseMutation.mutateAsync({
      code: courseCode,
      title: courseTitle,
      description: courseDesc,
    });
    setCourseCode('');
    setCourseTitle('');
    setCourseDesc('');
  };

  const handleLaunchSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) return;

    const session = await createSessionMutation.mutateAsync({
      courseId: selectedCourseId,
      title: sessionTitle || 'Lecture Attendance',
    });

    navigate(`/teacher/live-attendance/${session.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Teacher Banner */}
      <div className="rounded-lg bg-card border border-border p-6 md:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Badge variant="secondary" className="mb-2">
            Faculty Portal
          </Badge>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-100 tracking-tight">
            Instructor Dashboard — Professor {user?.lastName}
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Manage courses, generate dynamic attendance verification sessions, and oversee curriculum progress.
          </p>
        </div>
        <div className="flex-shrink-0">
          <Button
            variant="default"
            size="sm"
            onClick={() => navigate('/teacher/live-attendance')}
            className="text-xs font-mono bg-blue-600 hover:bg-blue-500 text-white gap-2 shadow-md shadow-blue-900/30"
          >
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            Launch Live Attendance Console →
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border gap-6 text-sm font-medium overflow-x-auto">
        <button
          onClick={() => handleTabChange('overview')}
          className={`pb-3 px-1 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'overview'
              ? 'border-b-2 border-blue-500 text-blue-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Faculty Overview</span>
        </button>
        <button
          onClick={() => handleTabChange('curriculum')}
          className={`pb-3 px-1 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'curriculum'
              ? 'border-b-2 border-blue-500 text-blue-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Concepts & Curriculum</span>
        </button>
        <button
          onClick={() => handleTabChange('sessions')}
          className={`pb-3 px-1 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'sessions'
              ? 'border-b-2 border-blue-500 text-blue-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Live QR Sessions</span>
        </button>
      </div>

      {/* CURRICULUM TAB */}
      {activeTab === 'curriculum' && <ConceptResourceViewer />}

      {/* OVERVIEW / SESSIONS TABS */}
      {activeTab !== 'curriculum' && (
        <>
          {/* Live Session QR Overlay if active */}
          {activeSession && (
            <div className="p-6 bg-card rounded-lg border border-blue-500/30 relative shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-semibold flex items-center gap-2 text-slate-200">
                  <QrCode className="w-4 h-4 text-blue-400" /> Active Attendance Session
                </h2>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveSession(null)}
                  className="text-xs"
                >
                  Minimize Session
                </Button>
              </div>
              <AttendanceCode
                sessionId={activeSession.id}
                sessionTitle={activeSession.title}
                courseCode={activeSession.courseCode}
                qrCodeToken={activeSession.qrCodeToken}
              />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Launch Attendance Session Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-blue-400" /> Start Live QR Attendance
                </CardTitle>
                <CardDescription>
                  Broadcast a dynamic QR code for students to verify in person
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLaunchSession} className="space-y-3.5">
                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1 block">Select Course</label>
                    <select
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                      className="w-full h-10 rounded-md border border-border bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    >
                      <option value="">-- Choose a course --</option>
                      {courses?.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} - {c.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1 block">Session Name / Topic</label>
                    <Input
                      placeholder="e.g. Transactions & ACID Properties"
                      value={sessionTitle}
                      onChange={(e) => setSessionTitle(e.target.value)}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="default"
                    className="w-full"
                    disabled={createSessionMutation.isPending}
                  >
                    Launch QR Session
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Create Course Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-sky-400" /> Create New Course
                </CardTitle>
                <CardDescription>Add a new syllabus to the department curriculum</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateCourse} className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-300 mb-1 block">Course Code</label>
                      <Input
                        placeholder="e.g. CS301"
                        value={courseCode}
                        onChange={(e) => setCourseCode(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 mb-1 block">Course Title</label>
                      <Input
                        placeholder="e.g. Database Systems"
                        value={courseTitle}
                        onChange={(e) => setCourseTitle(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1 block">Description</label>
                    <Input
                      placeholder="Overview of database schemas, SQL, and indexing..."
                      value={courseDesc}
                      onChange={(e) => setCourseDesc(e.target.value)}
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="outline"
                    className="w-full"
                    disabled={createCourseMutation.isPending}
                  >
                    Publish Course
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Courses Overview */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold flex items-center gap-2 text-slate-200">
              <BookOpen className="w-4 h-4 text-blue-400" /> Active Department Courses
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses?.map((c) => (
                <Card key={c.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <Badge variant="default">{c.code}</Badge>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> {c._count?.enrollments || 0} enrolled
                      </span>
                    </div>
                    <CardTitle className="text-base mt-2">{c.title}</CardTitle>
                    <CardDescription className="line-clamp-2 text-xs">
                      {c.description || 'No description provided'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2 space-y-2 border-t border-border mt-2">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>{c._count?.assessments || 0} Assessments</span>
                      <span className="text-slate-300 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Automated Evaluation
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs text-blue-400 hover:text-white hover:bg-blue-600 gap-1"
                        onClick={() => handleTabChange('curriculum')}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        Curriculum
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        className="w-full text-xs bg-indigo-600 hover:bg-indigo-500 text-white gap-1"
                        onClick={() => navigate(`/teacher/courses/${c.id}/assessments`)}
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        Assessments
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
