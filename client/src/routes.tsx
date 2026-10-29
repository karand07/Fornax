import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/auth-context';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { StudentDashboard } from '@/pages/student/StudentDashboard';
import { EnrollFacePage } from '@/pages/student/EnrollFacePage';
import { MarkAttendancePage } from '@/pages/student/MarkAttendancePage';
import { TakeAssessmentPage } from '@/pages/student/TakeAssessmentPage';
import { AssessmentResultPage } from '@/pages/student/AssessmentResultPage';
import { TeacherDashboard } from '@/pages/teacher/TeacherDashboard';
import { LiveAttendancePage } from '@/pages/teacher/LiveAttendancePage';
import { TeacherAssessmentsPage } from '@/pages/teacher/TeacherAssessmentsPage';
import { AssessmentBuilderPage } from '@/pages/teacher/AssessmentBuilderPage';
import { TeacherSubmissionsPage } from '@/pages/teacher/TeacherSubmissionsPage';
import { DevGradeCardPage } from '@/pages/dev/DevGradeCardPage';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { RoleLayout } from '@/components/layout/RoleLayout';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('STUDENT' | 'TEACHER' | 'ADMIN')[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-slate-400">
        <div className="flex items-center gap-2 text-sm font-mono animate-pulse">
          Loading Fornax Academic Hub...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If unauthorized, redirect to their role home portal
    if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
    if (user.role === 'TEACHER') return <Navigate to="/teacher" replace />;
    return <Navigate to="/student" replace />;
  }

  return <RoleLayout>{children}</RoleLayout>;
};

export const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/"
        element={
          user ? (
            user.role === 'ADMIN' ? (
              <Navigate to="/admin" replace />
            ) : user.role === 'TEACHER' ? (
              <Navigate to="/teacher" replace />
            ) : (
              <Navigate to="/student" replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Student Portal */}
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={['STUDENT', 'TEACHER', 'ADMIN']}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/enroll-face"
        element={
          <ProtectedRoute allowedRoles={['STUDENT', 'TEACHER', 'ADMIN']}>
            <EnrollFacePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/face-enroll"
        element={<Navigate to="/student/enroll-face" replace />}
      />
      <Route
        path="/student/mark-attendance"
        element={
          <ProtectedRoute allowedRoles={['STUDENT', 'TEACHER', 'ADMIN']}>
            <MarkAttendancePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/mark-attendance/:sessionId"
        element={
          <ProtectedRoute allowedRoles={['STUDENT', 'TEACHER', 'ADMIN']}>
            <MarkAttendancePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/assessments/:assessmentId"
        element={
          <ProtectedRoute allowedRoles={['STUDENT', 'TEACHER', 'ADMIN']}>
            <TakeAssessmentPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/assessments/:assessmentId/result"
        element={
          <ProtectedRoute allowedRoles={['STUDENT', 'TEACHER', 'ADMIN']}>
            <AssessmentResultPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/assessments/:id/result"
        element={
          <ProtectedRoute allowedRoles={['STUDENT', 'TEACHER', 'ADMIN']}>
            <AssessmentResultPage />
          </ProtectedRoute>
        }
      />

      {/* Teacher Portal */}
      <Route
        path="/teacher"
        element={
          <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}>
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/live-attendance"
        element={
          <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}>
            <LiveAttendancePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/live-attendance/:sessionId"
        element={
          <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}>
            <LiveAttendancePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/courses/:courseId/assessments"
        element={
          <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}>
            <TeacherAssessmentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/assessments/:assessmentId"
        element={
          <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}>
            <AssessmentBuilderPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/assessments/:id/submissions"
        element={
          <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}>
            <TeacherSubmissionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/assessments/:assessmentId/submissions"
        element={
          <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}>
            <TeacherSubmissionsPage />
          </ProtectedRoute>
        }
      />

      {/* Dev Fixtures Showcase (Dev only) */}
      {import.meta.env.DEV && (
        <Route path="/dev/gradecard" element={<DevGradeCardPage />} />
      )}

      {/* Admin Portal */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* 404 fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
