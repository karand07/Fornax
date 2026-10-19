import React, { useState } from 'react';
import { useAuth } from '@/auth-context';
import { useCourses, useCreateCourse, useCreateAttendanceSession } from '@/api/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AttendanceCode } from '@/components/AttendanceCode';
import {
  Users,
  QrCode,
  PlusCircle,
  BookOpen,
  CheckCircle,
} from 'lucide-react';

export const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const { data: courses } = useCourses();
  const createCourseMutation = useCreateCourse();
  const createSessionMutation = useCreateAttendanceSession();

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

    const course = courses?.find((c) => c.id === selectedCourseId);
    const session = await createSessionMutation.mutateAsync({
      courseId: selectedCourseId,
      title: sessionTitle || 'Lecture Attendance',
    });

    setActiveSession({
      id: session.id,
      title: session.title,
      courseCode: course?.code || 'CS',
      qrCodeToken: session.qrCodeToken,
    });
  };

  return (
    <div className="space-y-6">
      {/* Teacher Banner */}
      <div className="rounded-lg bg-card border border-border p-6 md:p-7">
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
                  placeholder="e.g. Week 4: Dynamic Programming & Graphs"
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
                    placeholder="e.g. CS202"
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
              <CardContent className="pt-2 flex justify-between items-center text-xs text-slate-400 border-t border-border mt-2">
                <span>{c._count?.assessments || 0} Assessments</span>
                <span className="text-slate-300 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Automated Evaluation
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
