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

export type ResourceDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type ResourceType = 'DOCUMENT' | 'VIDEO' | 'ARTICLE' | 'EXERCISE';

export interface Resource {
  id: string;
  title: string;
  description?: string;
  url?: string;
  type: ResourceType;
  difficulty: ResourceDifficulty;
  conceptId: string;
  concept?: {
    id: string;
    title: string;
    order: number;
    courseId?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ConceptPrerequisite {
  id: string;
  conceptId: string;
  prerequisiteId: string;
  prerequisite?: {
    id: string;
    title: string;
    order: number;
  };
  concept?: {
    id: string;
    title: string;
    order: number;
  };
}

export interface Concept {
  id: string;
  title: string;
  description?: string;
  order: number;
  courseId: string;
  course?: { id: string; title: string; code: string };
  resources?: Resource[];
  prerequisites?: ConceptPrerequisite[];
  prerequisiteFor?: ConceptPrerequisite[];
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  description?: string;
  teacher?: { id: string; firstName: string; lastName: string; email: string };
  concepts?: Concept[];
  _count?: { enrollments: number; sessions: number; assessments: number; concepts?: number };
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  userId: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  verifiedBy: 'QR' | 'FACE' | 'MANUAL';
  timestamp: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
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

export function useMyEnrolledCourses() {
  return useQuery<Course[]>({
    queryKey: ['myEnrolledCourses'],
    queryFn: async () => {
      const res = await api.get('/courses/enrolled/me');
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
      queryClient.invalidateQueries({ queryKey: ['myEnrolledCourses'] });
    },
  });
}

export function useUnenrollCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (courseId: string) => {
      const res = await api.delete(`/courses/${courseId}/enroll`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['myEnrolledCourses'] });
    },
  });
}

// Concepts Hooks
export function useConcepts(courseId?: string) {
  return useQuery<Concept[]>({
    queryKey: ['concepts', courseId],
    queryFn: async () => {
      const res = await api.get('/concepts', { params: courseId ? { courseId } : {} });
      return res.data;
    },
  });
}

export function useConcept(id: string) {
  return useQuery<Concept>({
    queryKey: ['concepts', id],
    queryFn: async () => {
      const res = await api.get(`/concepts/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateConcept() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      order?: number;
      courseId: string;
      prerequisiteIds?: string[];
    }) => {
      const res = await api.post('/concepts', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concepts'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}

// Resources Hooks
export function useResources(filters?: { conceptId?: string; difficulty?: string; type?: string }) {
  return useQuery<Resource[]>({
    queryKey: ['resources', filters],
    queryFn: async () => {
      const res = await api.get('/resources', { params: filters });
      return res.data;
    },
  });
}

export function useCreateResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      url?: string;
      type?: ResourceType;
      difficulty?: ResourceDifficulty;
      conceptId: string;
    }) => {
      const res = await api.post('/resources', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['concepts'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}

// Attendance Hooks
export interface RotatingCodeResponse {
  sessionId: string;
  isActive: boolean;
  code: string;
  token: string;
  remainingSeconds: number;
  stepSeconds: number;
  timestamp: number;
}

export interface ClassSessionDetails {
  id: string;
  courseId: string;
  title: string;
  sessionDate: string;
  qrCodeToken: string | null;
  isActive: boolean;
  createdAt: string;
  course: {
    id: string;
    code: string;
    title: string;
  };
  _count?: {
    attendances: number;
  };
}

export function useCreateAttendanceSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { courseId: string; title: string }) => {
      const res = await api.post('/attendance/session', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

export function useStartAttendanceSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await api.post(`/attendance/session/${sessionId}/start`);
      return res.data;
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['sessionDetails', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['sessionCode', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['sessionRecords', sessionId] });
    },
  });
}

export function useCloseAttendanceSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await api.post(`/attendance/session/${sessionId}/close`);
      return res.data;
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['sessionDetails', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['sessionCode', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['sessionRecords', sessionId] });
    },
  });
}

export function useSessionDetails(sessionId: string) {
  return useQuery<ClassSessionDetails>({
    queryKey: ['sessionDetails', sessionId],
    queryFn: async () => {
      const res = await api.get(`/attendance/session/${sessionId}`);
      return res.data;
    },
    enabled: Boolean(sessionId),
  });
}

export function useSessionCode(sessionId: string, isLive: boolean = true) {
  return useQuery<RotatingCodeResponse>({
    queryKey: ['sessionCode', sessionId],
    queryFn: async () => {
      const res = await api.get(`/attendance/session/${sessionId}/code`);
      return res.data;
    },
    enabled: Boolean(sessionId) && isLive,
    refetchInterval: isLive ? 5000 : false,
    staleTime: 1000,
  });
}

export function useSessionRecords(sessionId: string, isLive: boolean = true) {
  return useQuery<AttendanceRecord[]>({
    queryKey: ['sessionRecords', sessionId],
    queryFn: async () => {
      const res = await api.get(`/attendance/session/${sessionId}/records`);
      return res.data;
    },
    enabled: Boolean(sessionId),
    refetchInterval: isLive ? 3000 : false, // Poll every 3 seconds as specified!
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

export function useEnrollFace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { descriptor: number[]; consent?: boolean }) => {
      const res = await api.post('/face/enroll', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faceStatus'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useFaceStatus() {
  return useQuery<{ enrolled: boolean }>({
    queryKey: ['faceStatus'],
    queryFn: async () => {
      const res = await api.get('/face/status');
      return res.data;
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
