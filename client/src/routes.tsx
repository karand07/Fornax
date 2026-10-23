import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/auth-context';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { StudentDashboard } from '@/pages/student/StudentDashboard';
import { EnrollFacePage } from '@/pages/student/EnrollFacePage';
import { TeacherDashboard } from '@/pages/teacher/TeacherDashboard';
import { LiveAttendancePage } from '@/pages/teacher/LiveAttendancePage';
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
