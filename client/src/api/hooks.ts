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
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'FLAGGED';
  verifiedBy: 'QR' | 'FACE' | 'MANUAL';
  timestamp: string;
  faceDistance?: number | null;
  livenessPassed?: boolean | null;
  codeValid?: boolean;
  networkOk?: boolean;
  integrityScore?: number | null;
  method?: string;
  reviewedBy?: string | null;
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

export function useCourseEnrollments(courseId?: string) {
  return useQuery<
    Array<{
      id: string;
      userId: string;
      user: { id: string; firstName: string; lastName: string; email: string };
    }>
  >({
    queryKey: ['courseEnrollments', courseId],
    queryFn: async () => {
      const res = await api.get(`/courses/${courseId}/enrollments`);
      return res.data;
    },
    enabled: Boolean(courseId),
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
  windowEndsAt?: string | null;
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

// Mode B Attendance Hooks
export function useOpenAttendanceWindow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, seconds }: { sessionId: string; seconds: number }) => {
      const res = await api.post(`/attendance/sessions/${sessionId}/open-window`, { seconds });
      return res.data as { windowEndsAt: string };
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ['sessionDetails', sessionId] });
    },
  });
}

export function useCheckAttendanceCode() {
  return useMutation({
    mutationFn: async ({ sessionId, code }: { sessionId: string; code: string }) => {
      const res = await api.post(`/attendance/sessions/${sessionId}/check-code`, { code });
      return res.data as { ok: boolean; secondsLeft: number };
    },
  });
}

export function useMarkSelfAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sessionId,
      code,
      descriptor,
      livenessPassed,
    }: {
      sessionId: string;
      code: string;
      descriptor: number[];
      livenessPassed: boolean;
    }) => {
      const res = await api.post(`/attendance/sessions/${sessionId}/mark`, {
        code,
        descriptor,
        livenessPassed,
      });
      return res.data as {
        status: 'PRESENT' | 'FLAGGED';
        integrityScore: number;
        message: string;
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myAttendance'] });
      queryClient.invalidateQueries({ queryKey: ['sessionRecords'] });
    },
  });
}

export function useReviewAttendanceRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      recordId,
      status,
    }: {
      recordId: string;
      status: 'PRESENT' | 'ABSENT';
    }) => {
      const res = await api.patch(`/attendance/records/${recordId}/review`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessionRecords'] });
    },
  });
}

// Mode A Class-Photo Attendance Types & Hooks
export interface ClassPhotoMatchedStudent {
  recordId: string;
  studentId: string;
  name: string;
  distance: number;
  status: 'PRESENT' | 'FLAGGED';
  integrityScore: number;
}

export interface ClassPhotoNotFoundStudent {
  studentId: string;
  name: string;
  hasFaceEnrolled: boolean;
}

export interface ClassPhotoSkippedStudent {
  studentId: string;
  name: string;
  reason: string;
}

export interface ClassPhotoResult {
  matched: ClassPhotoMatchedStudent[];
  flagged: ClassPhotoMatchedStudent[];
  notFound: ClassPhotoNotFoundStudent[];
  unknownFaces: number;
  skipped: ClassPhotoSkippedStudent[];
}

export function useClassPhotoAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sessionId,
      photos,
    }: {
      sessionId: string;
      photos: number[][][];
    }) => {
      const res = await api.post(`/attendance/sessions/${sessionId}/class-photo`, { photos });
      return res.data as ClassPhotoResult;
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ['sessionRecords', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['sessionRecords'] });
      queryClient.invalidateQueries({ queryKey: ['sessionDetails', sessionId] });
    },
  });
}

export function useManualAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sessionId,
      studentId,
      status,
    }: {
      sessionId: string;
      studentId: string;
      status: 'PRESENT' | 'ABSENT';
    }) => {
      const res = await api.post(`/attendance/sessions/${sessionId}/manual`, {
        studentId,
        status,
      });
      return res.data;
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ['sessionRecords', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['sessionRecords'] });
      queryClient.invalidateQueries({ queryKey: ['sessionDetails', sessionId] });
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

// Day 6 Assessment & Question Interfaces
export interface RubricCriterion {
  id?: string;
  description: string;
  marks?: number;
}

export interface Question {
  id: string;
  assessmentId: string;
  conceptId: string;
  type: 'MCQ' | 'SHORT' | 'HANDWRITTEN';
  prompt: string;
  maxMarks: number;
  options: string[];
  correctIndex?: number;
  modelAnswer?: string;
  rubrics?: RubricCriterion[];
  rubricCriteria?: RubricCriterion[];
}

export interface AssessmentDetail {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  published: boolean;
  submitted?: boolean;
  questions: Question[];
  course?: { id: string; code: string; title: string; teacherId?: string };
}

export interface AssessmentListItem {
  id: string;
  courseId?: string;
  title: string;
  published?: boolean;
  questionCount: number;
  totalMarks?: number;
  submissionCount?: number;
  submitted?: boolean;
  createdAt?: string;
}

export interface AssessmentSummary {
  totalAwarded: number;
  totalMax: number;
  gradedCount: number;
  pendingCount: number;
  percentage: number | null;
}

export interface AssessmentConceptResult {
  conceptId: string;
  name: string;
  awarded: number;
  max: number;
  masteryBefore: number;
  masteryAfter: number;
}

export interface AssessmentQuestionResultItem {
  questionId: string;
  conceptId: string;
  conceptName: string;
  prompt: string;
  type: 'MCQ' | 'SHORT' | 'HANDWRITTEN';
  maxMarks: number;
  options?: string[];
  studentAnswer: number | string | null;
  correctIndex?: number | null;
  explanation?: string | null;
  marksObtained: number | null;
  status: 'GRADED' | 'PENDING';
  submissionId?: string | null;
  scanPath?: string | null;
  ocrStatus?: 'OK' | 'PARTIAL' | 'UNREADABLE' | 'FAILED' | null;
  ocrOriginal?: string | null;
  grade?: {
    marks: number;
    confidence: number;
    summary: string | null;
  } | null;
  rubrics?: RubricCriterion[];
}

export interface AssessmentMyResultResponse {
  summary: AssessmentSummary;
  concepts: AssessmentConceptResult[];
  questions: AssessmentQuestionResultItem[];
}

// Backward compatibility alias
export type AssessmentResultItem = AssessmentQuestionResultItem;

export interface SubmitAssessmentResult {
  submissionCount: number;
  autoGraded: number;
  pendingGrading: number;
  mcqScore: number;
  mcqMax: number;
  handwrittenReceived?: number;
  handwrittenNeedReview?: number;
}

export interface ConceptMasteryItem {
  conceptId: string;
  name: string;
  score: number;
  attempts: number;
  prerequisiteId: string | null;
  prerequisiteName: string | null;
  lastUpdated: string | null;
}

export interface StudentCourseAttendanceHistoryItem {
  sessionId: string;
  date: string;
  status: 'PRESENT' | 'FLAGGED' | 'ABSENT';
}

export interface StudentCourseAttendance {
  totalSessions: number;
  present: number;
  flagged: number;
  absent: number;
  rate: number | null;
  history: StudentCourseAttendanceHistoryItem[];
}

// Day 6 Assessments Hooks
export function useCourseAssessments(courseId: string) {
  return useQuery<AssessmentListItem[]>({
    queryKey: ['assessments', courseId],
    queryFn: async () => {
      const res = await api.get(`/courses/${courseId}/assessments`);
      return res.data;
    },
    enabled: Boolean(courseId),
  });
}

export function useCreateAssessment(defaultCourseId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { courseId?: string; title: string }) => {
      const cid = vars.courseId || defaultCourseId;
      const res = await api.post(`/courses/${cid}/assessments`, { title: vars.title });
      return res.data;
    },
    onSuccess: (_, vars) => {
      const cid = vars.courseId || defaultCourseId;
      if (cid) {
        queryClient.invalidateQueries({ queryKey: ['assessments', cid] });
      }
    },
  });
}

export function useAssessment(id: string) {
  return useQuery<AssessmentDetail>({
    queryKey: ['assessment', id],
    queryFn: async () => {
      const res = await api.get(`/assessments/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useAddQuestion(assessmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post(`/assessments/${assessmentId}/questions`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment', assessmentId] });
    },
  });
}

export function useUpdateQuestion(assessmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ questionId, data }: { questionId: string; data: any }) => {
      const res = await api.patch(`/questions/${questionId}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment', assessmentId] });
    },
  });
}

export function useDeleteQuestion(assessmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (questionId: string) => {
      const res = await api.delete(`/questions/${questionId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment', assessmentId] });
    },
  });
}

export function usePublishAssessment(assessmentId: string, courseId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.patch(`/assessments/${assessmentId}/publish`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment', assessmentId] });
      if (courseId) {
        queryClient.invalidateQueries({ queryKey: ['assessments', courseId] });
      }
    },
  });
}

export function useSubmitAssessment(assessmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: FormData | { answers: { questionId: string; selectedIndex?: number; answerText?: string }[] }
    ) => {
      const res = await api.post(`/assessments/${assessmentId}/submit`, payload, {
        timeout: 90000,
        headers: payload instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
      });
      return res.data as SubmitAssessmentResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment', assessmentId] });
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      queryClient.invalidateQueries({ queryKey: ['myResult', assessmentId] });
      queryClient.invalidateQueries({ queryKey: ['studentMastery'] });
    },
  });
}

export function useMyAssessmentResult(assessmentId: string) {
  return useQuery<AssessmentMyResultResponse>({
    queryKey: ['myResult', assessmentId],
    queryFn: async () => {
      const res = await api.get(`/assessments/${assessmentId}/my-result`);
      return res.data;
    },
    enabled: Boolean(assessmentId),
  });
}

export function useStudentCourseAttendance(courseId: string) {
  return useQuery<StudentCourseAttendance>({
    queryKey: ['studentAttendance', courseId],
    queryFn: async () => {
      const res = await api.get(`/attendance/me?courseId=${courseId}`);
      return res.data;
    },
    enabled: Boolean(courseId),
  });
}

export function useStudentCourseMastery(studentId: string, courseId: string) {
  return useQuery<ConceptMasteryItem[]>({
    queryKey: ['studentMastery', studentId, courseId],
    queryFn: async () => {
      const res = await api.get(`/students/${studentId}/mastery?courseId=${courseId}`);
      return res.data;
    },
    enabled: Boolean(studentId) && Boolean(courseId),
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

// Day 9 Teacher Grading Hooks & Types
export interface TeacherSubmissionListItem {
  id: string;
  assessmentId: string;
  questionId: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  question: {
    id: string;
    prompt: string;
    maxMarks: number;
    type?: string;
  };
  answerText?: string | null;
  marks: number | null;
  autoMarks: number | null;
  finalMarks: number | null;
  confidence: number | null;
  needsReview: boolean;
  overridden: boolean;
  submittedAt: string;
  gradedAt?: string | null;
}

export interface TeacherSubmissionDetail {
  id: string;
  assessmentId: string;
  courseId?: string;
  course?: { id: string; code: string; title: string };
  questionId: string;
  userId: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  question: {
    id: string;
    prompt: string;
    maxMarks: number;
    type: string;
    modelAnswer?: string | null;
    rubrics?: Array<{ id: string; description: string; marks: number }>;
  };
  answerText?: string | null;
  scanAvailable?: boolean;
  scanPath?: string | null;
  ocrStatus?: string | null;
  ocrOriginal?: string | null;
  ocrEdited?: boolean;
  ocrEditedAt?: string | null;
  ocrEditedBy?: string | null;
  gradeStale?: boolean;
  queue?: {
    prevId: string | null;
    nextId: string | null;
    current: number;
    total: number;
  };
  grade: {
    autoMarks: number;
    totalMarks: number;
    finalMarks: number;
    confidence: number;
    confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
    modelVersion: string | null;
    needsReview: boolean;
    overriddenBy: string | null;
    overridden: boolean;
    overriderName?: string | null;
    overriddenAt?: string | null;
    overrideNote?: string | null;
    reviewedBy?: string | null;
    reviewerName?: string | null;
    reviewedAt?: string | null;
    provisional: boolean;
    summary: string | null;
    missingPoints: string[];
    criteria: Array<{
      criterionId?: string;
      description: string;
      maxMarks: number;
      awarded: number;
      justification?: string;
      evidenceSpan?: string | null;
    }>;
    notes?: string | null;
  } | null;
  submittedAt: string;
  gradedAt?: string | null;
}

// Day 10b Review Queue, Audit & Teacher Actions Types & Hooks
export interface ReviewQueueItem {
  submissionId: string;
  studentName: string;
  assessmentTitle: string;
  questionPrompt: string;
  type: string;
  maxMarks: number;
  marks: number | null;
  confidence: number | null;
  reasons: string[];
  submittedAt: string;
}

export interface ReviewQueueResponse {
  items: ReviewQueueItem[];
  total: number;
}

export interface AuditLogItem {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  before: any;
  after: any;
  createdAt: string;
}

export function useReviewQueue(
  params: {
    courseId?: string;
    assessmentId?: string;
    status?: 'pending' | 'done';
    limit?: number;
    offset?: number;
  },
  enabled: boolean = true
) {
  return useQuery<ReviewQueueResponse>({
    queryKey: ['reviewQueue', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.courseId) searchParams.set('courseId', params.courseId);
      if (params.assessmentId) searchParams.set('assessmentId', params.assessmentId);
      if (params.status) searchParams.set('status', params.status);
      if (params.limit !== undefined) searchParams.set('limit', String(params.limit));
      if (params.offset !== undefined) searchParams.set('offset', String(params.offset));

      const res = await api.get(`/grading/review-queue?${searchParams.toString()}`);
      return res.data;
    },
    enabled,
  });
}

export function useAuditLogs(entityType: string, entityId: string) {
  return useQuery<AuditLogItem[]>({
    queryKey: ['auditLogs', entityType, entityId],
    queryFn: async () => {
      const res = await api.get(`/grading/audit?entityType=${entityType}&entityId=${entityId}`);
      return res.data;
    },
    enabled: Boolean(entityType && entityId),
  });
}

export function useUpdateOcr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ submissionId, text }: { submissionId: string; text: string }) => {
      const res = await api.patch(`/grading/submissions/${submissionId}/ocr`, { text });
      return res.data;
    },
    onSuccess: (_, { submissionId }) => {
      queryClient.invalidateQueries({ queryKey: ['submissionDetail', submissionId] });
      queryClient.invalidateQueries({ queryKey: ['reviewQueue'] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs', 'Submission', submissionId] });
    },
  });
}

export function useRegradeSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ submissionId, force }: { submissionId: string; force?: boolean }) => {
      const res = await api.post(`/grading/submissions/${submissionId}/regrade`, { force });
      return res.data;
    },
    onSuccess: (_, { submissionId }) => {
      queryClient.invalidateQueries({ queryKey: ['submissionDetail', submissionId] });
      queryClient.invalidateQueries({ queryKey: ['reviewQueue'] });
      queryClient.invalidateQueries({ queryKey: ['studentMastery'] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs', 'Submission', submissionId] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs', 'Grade'] });
    },
  });
}

export function useApproveGrade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (submissionId: string) => {
      const res = await api.post(`/grading/submissions/${submissionId}/approve`);
      return res.data;
    },
    onSuccess: (_, submissionId) => {
      queryClient.invalidateQueries({ queryKey: ['submissionDetail', submissionId] });
      queryClient.invalidateQueries({ queryKey: ['reviewQueue'] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs', 'Submission', submissionId] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs', 'Grade'] });
    },
  });
}

export function useOverrideGrade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      submissionId,
      finalMarks,
      note,
    }: {
      submissionId: string;
      finalMarks: number;
      note: string;
    }) => {
      const res = await api.post(`/grading/submissions/${submissionId}/override`, {
        finalMarks,
        note,
      });
      return res.data;
    },
    onSuccess: (_, { submissionId }) => {
      queryClient.invalidateQueries({ queryKey: ['submissionDetail', submissionId] });
      queryClient.invalidateQueries({ queryKey: ['reviewQueue'] });
      queryClient.invalidateQueries({ queryKey: ['studentMastery'] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs', 'Submission', submissionId] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs', 'Grade'] });
    },
  });
}

export function useAssessmentSubmissions(assessmentId: string) {
  return useQuery<TeacherSubmissionListItem[]>({
    queryKey: ['assessmentSubmissions', assessmentId],
    queryFn: async () => {
      const res = await api.get(`/grading/assessments/${assessmentId}/submissions`);
      return res.data;
    },
    enabled: Boolean(assessmentId),
  });
}

export function useSubmissionDetail(submissionId: string | null) {
  return useQuery<TeacherSubmissionDetail>({
    queryKey: ['submissionDetail', submissionId],
    queryFn: async () => {
      const res = await api.get(`/grading/submissions/${submissionId}`);
      return res.data;
    },
    enabled: Boolean(submissionId),
  });
}

export type RiskLevel = 'OK' | 'WATCH' | 'AT_RISK' | 'INSUFFICIENT_DATA';
export type RiskFactor = 'LOW_ATTENDANCE' | 'LOW_MASTERY';

export interface RiskInfo {
  level: RiskLevel;
  factors: RiskFactor[];
  score?: number; // teacher only
  usedWeights?: { attendance: number; mastery: number }; // teacher only
}

export interface RecommendationResource {
  id: string;
  conceptId: string;
  title: string;
  type: string;
  difficulty: 1 | 2 | 3;
  url: string;
}

export interface RecommendationItem {
  conceptId: string;
  conceptName: string;
  mastery: number;
  reasonCode: 'WEAK_CONCEPT' | 'WEAK_PREREQUISITE';
  reason: string;
  dependents: { id: string; name: string; mastery: number }[];
  resources: RecommendationResource[];
}

export interface StudentProfileResponse {
  student: { id: string; name: string; email: string };
  course: { id: string; code: string; title: string };
  risk: RiskInfo;
  attendance: { attended: number; total: number; rate: number };
  mastery: {
    average: number;
    concepts: {
      id: string;
      name: string;
      score: number;
      attempts: number;
      prerequisiteId: string | null;
    }[];
  };
  recommendations: RecommendationItem[];
  notAssessed: { id: string; name: string }[];
  assessmentHistory: {
    assessmentId: string;
    title: string;
    date: string;
    score: number;
    max: number;
    percentage: number;
  }[];
  assessmentAvg: number | null;
}

export interface StudentRecommendationsResponse {
  recommendations: RecommendationItem[];
  notAssessed: { id: string; name: string }[];
}

export function useStudentProfile(
  studentId: string | null | undefined,
  courseId: string | null | undefined
) {
  return useQuery<StudentProfileResponse>({
    queryKey: ['studentProfile', studentId, courseId],
    queryFn: async () => {
      const res = await api.get(`/students/${studentId}/profile`, {
        params: { courseId },
      });
      return res.data;
    },
    enabled: Boolean(studentId && courseId),
  });
}

export function useStudentRecommendations(
  studentId: string | null | undefined,
  courseId: string | null | undefined
) {
  return useQuery<StudentRecommendationsResponse>({
    queryKey: ['studentRecommendations', studentId, courseId],
    queryFn: async () => {
      const res = await api.get(`/students/${studentId}/recommendations`, {
        params: { courseId },
      });
      return res.data;
    },
    enabled: Boolean(studentId && courseId),
  });
}

export interface AnalyticsCell {
  conceptId: string;
  score: number | null;
  attempts: number;
  band: 'weak' | 'developing' | 'strong' | 'unassessed';
}

export interface AnalyticsRow {
  studentId: string;
  name: string;
  cells: AnalyticsCell[];
  avgMastery: number | null;
  attendanceRate: number | null;
  risk: RiskInfo;
}

export interface CourseAnalyticsResponse {
  concepts: { id: string; name: string; prerequisiteName: string | null }[];
  rows: AnalyticsRow[];
  classStats: {
    conceptId: string;
    name: string;
    average: number | null;
    assessedCount: number;
    weakCount: number;
    strongCount: number;
    unassessedCount: number;
  }[];
  weakestConcepts: {
    conceptId: string;
    name: string;
    average: number;
    assessedCount: number;
  }[];
  atRisk: {
    studentId: string;
    name: string;
    level: 'AT_RISK' | 'WATCH';
    score: number;
    factors: RiskFactor[];
    weakestConcepts: string[];
  }[];
  coverage: {
    studentsTotal: number;
    studentsWithAnyAssessment: number;
    conceptsWithNoData: string[];
  };
  sessions: {
    id: string;
    date: string;
    present: number;
    flagged: number;
    absent: number;
  }[];
  generatedAt: string;
}

export function useCourseAnalytics(courseId: string | undefined | null) {
  return useQuery<CourseAnalyticsResponse>({
    queryKey: ['courseAnalytics', courseId],
    queryFn: async () => {
      const res = await api.get(`/courses/${courseId}/analytics`);
      return res.data;
    },
    enabled: Boolean(courseId),
  });
}

export async function downloadCourseAnalyticsCsv(courseId: string): Promise<void> {
  const res = await api.get(`/courses/${courseId}/analytics/export.csv`, {
    responseType: 'blob',
  });
  const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `analytics-${courseId}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// User Account Profile Hooks (GET /api/profile & PATCH /api/profile)
export interface UserAccountProfile {
  id: string;
  email: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  firstName: string;
  lastName: string;
  createdAt: string;
  hasFaceEnrolled: boolean;
}

export function useUserProfile() {
  return useQuery<UserAccountProfile>({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const res = await api.get('/profile');
      return res.data;
    },
  });
}

export function useUpdateUserProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { firstName?: string; lastName?: string }) => {
      const res = await api.patch('/profile', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      queryClient.invalidateQueries({ queryKey: ['studentProfile'] });
    },
  });
}



