import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from './axios';

// Interfaces
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  hasFaceEnrolled?: boolean;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  description?: string;
  teacher?: { id: string; firstName: string; lastName: string; email: string };
  _count?: { enrollments: number; sessions: number; assessments: number };
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  userId: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  verifiedBy: 'QR' | 'FACE' | 'MANUAL';
  timestamp: string;
  session?: {
    title: string;
    course: { code: string; title: string };
  };
}

export interface Assessment {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  maxScore: number;
  dueDate?: string;
  _count?: { submissions: number };
}

export interface MasteryScore {
  id: string;
  userId: string;
  topic: string;
  level: number;
}

export interface AnalyticsOverview {
  totalUsers: number;
  totalCourses: number;
  totalSubmissions: number;
  totalAttendances: number;
  usersByRole: { role: string; _count: { _all: number } }[];
}

export interface StudentAnalytics {
  attendanceRate: number;
  totalSubmissions: number;
  averageGrade: number;
  masteryBreakdown: MasteryScore[];
}

// Auth Hooks
export function useCurrentUser() {
  return useQuery<User>({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data;
    },
    retry: false,
  });
}

// Courses Hooks
export function useCourses() {
  return useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: async () => {
      const res = await api.get('/courses');
      return res.data;
    },
  });
}

export function useCourse(id: string) {
  return useQuery<Course>({
    queryKey: ['courses', id],
    queryFn: async () => {
      const res = await api.get(`/courses/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { code: string; title: string; description?: string }) => {
      const res = await api.post('/courses', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}

export function useEnrollCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (courseId: string) => {
      const res = await api.post(`/courses/${courseId}/enroll`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}

// Attendance Hooks
export function useCreateAttendanceSession() {
  return useMutation({
    mutationFn: async (data: { courseId: string; title: string }) => {
      const res = await api.post('/attendance/session', data);
      return res.data;
    },
  });
}

export function useScanQRAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { sessionId: string; qrCodeToken: string }) => {
      const res = await api.post('/attendance/check-in/qr', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myAttendance'] });
    },
  });
}

export function useFaceAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { sessionId: string; descriptor: number[] }) => {
      const res = await api.post('/attendance/check-in/face', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myAttendance'] });
    },
  });
}

export function useMyAttendance() {
  return useQuery<AttendanceRecord[]>({
    queryKey: ['myAttendance'],
    queryFn: async () => {
      const res = await api.get('/attendance/my-history');
      return res.data;
    },
  });
}

// Assessments Hooks
export function useCourseAssessments(courseId: string) {
  return useQuery<Assessment[]>({
    queryKey: ['assessments', courseId],
    queryFn: async () => {
      const res = await api.get(`/assessments/course/${courseId}`);
      return res.data;
    },
    enabled: Boolean(courseId),
  });
}

// Analytics Hooks
export function useSystemOverview() {
  return useQuery<AnalyticsOverview>({
    queryKey: ['systemOverview'],
    queryFn: async () => {
      const res = await api.get('/analytics/overview');
      return res.data;
    },
  });
}

export function useStudentAnalytics(studentId?: string) {
  return useQuery<StudentAnalytics>({
    queryKey: ['studentAnalytics', studentId],
    queryFn: async () => {
      const path = studentId ? `/analytics/student/${studentId}` : '/analytics/student';
      const res = await api.get(path);
      return res.data;
    },
  });
}
