import { StudentGradeView, TeacherGradeView } from './GradeCard';

export interface FixtureItem {
  id: string;
  title: string;
  description: string;
  question: { prompt: string; maxMarks: number };
  answer: string;
  studentGrade: StudentGradeView;
  teacherGrade: TeacherGradeView;
}

const acidQuestion = {
  prompt: 'Explain the ACID properties of database transactions.',
  maxMarks: 10,
};

// 1. Full Marks
export const fullMarksFixture: FixtureItem = {
  id: 'full-marks',
  title: '1. Full Marks (10 / 10)',
  description: 'Student provided a thorough, correct answer satisfying all rubric criteria.',
  question: acidQuestion,
  answer:
    'ACID transactions guarantee reliable database operations. Atomicity ensures all operations in a transaction succeed or all fail together. Consistency guarantees that a transaction leaves the database in a valid state adhering to all constraints. Isolation ensures concurrent transactions do not interfere with one another. Durability guarantees committed changes survive system crashes.',
  studentGrade: {
    autoMarks: 10,
    finalMarks: 10,
    confidenceLevel: 'HIGH',
    provisional: false,
    overridden: false,
    summary:
      'Complete and comprehensive explanation covering all four ACID properties with appropriate justifications.',
    missingPoints: [],
    criteria: [
      {
        criterionId: 'crit-a',
        description: 'Defines Atomicity (all-or-nothing execution)',
        maxMarks: 2.5,
        awarded: 2.5,
        justification: 'Explicitly explains all operations succeed or all fail together.',
        evidenceSpan: 'Atomicity ensures all operations in a transaction succeed or all fail together.',
      },
      {
        criterionId: 'crit-c',
        description: 'Defines Consistency (preserves database invariants and constraints)',
        maxMarks: 2.5,
        awarded: 2.5,
        justification: 'Identified valid state transitions and constraint adherence.',
        evidenceSpan:
          'Consistency guarantees that a transaction leaves the database in a valid state adhering to all constraints.',
      },
      {
        criterionId: 'crit-i',
        description: 'Defines Isolation (concurrency control and non-interference)',
        maxMarks: 2.5,
        awarded: 2.5,
        justification: 'Accurately explains non-interference between concurrent transactions.',
        evidenceSpan: 'Isolation ensures concurrent transactions do not interfere with one another.',
      },
      {
        criterionId: 'crit-d',
        description: 'Defines Durability (persistence of committed data through crashes)',
        maxMarks: 2.5,
        awarded: 2.5,
        justification: 'Notes survival of committed changes through system crashes.',
        evidenceSpan: 'Durability guarantees committed changes survive system crashes.',
      },
    ],
  },
  teacherGrade: {
    autoMarks: 10,
    finalMarks: 10,
    confidence: 0.95,
    confidenceLevel: 'HIGH',
    modelVersion: 'claude-3-5-sonnet-20241022',
    needsReview: false,
    overriddenBy: null,
    overridden: false,
    notes: 'Exemplary textbook answer. High semantic alignment with model answer.',
    summary:
      'Complete and comprehensive explanation covering all four ACID properties with appropriate justifications.',
    missingPoints: [],
    criteria: [
      {
        criterionId: 'crit-a',
        description: 'Defines Atomicity (all-or-nothing execution)',
        maxMarks: 2.5,
        awarded: 2.5,
        justification: 'Explicitly explains all operations succeed or all fail together.',
        evidenceSpan: 'Atomicity ensures all operations in a transaction succeed or all fail together.',
      },
      {
        criterionId: 'crit-c',
        description: 'Defines Consistency (preserves database invariants and constraints)',
        maxMarks: 2.5,
        awarded: 2.5,
        justification: 'Identified valid state transitions and constraint adherence.',
        evidenceSpan:
          'Consistency guarantees that a transaction leaves the database in a valid state adhering to all constraints.',
      },
      {
        criterionId: 'crit-i',
        description: 'Defines Isolation (concurrency control and non-interference)',
        maxMarks: 2.5,
        awarded: 2.5,
        justification: 'Accurately explains non-interference between concurrent transactions.',
        evidenceSpan: 'Isolation ensures concurrent transactions do not interfere with one another.',
      },
      {
        criterionId: 'crit-d',
        description: 'Defines Durability (persistence of committed data through crashes)',
        maxMarks: 2.5,
        awarded: 2.5,
        justification: 'Notes survival of committed changes through system crashes.',
        evidenceSpan: 'Durability guarantees committed changes survive system crashes.',
      },
    ],
  },
};

// 2. Partial with Missing Points
export const partialWithMissingPointsFixture: FixtureItem = {
  id: 'partial-missing',
  title: '2. Partial Marks with Missing Points (5 / 10)',
  description: 'Student covered Atomicity and Durability but missed Consistency and Isolation.',
  question: acidQuestion,
  answer:
    'Atomicity ensures all operations in a transaction succeed or all fail together. Durability guarantees that committed data survives crashes.',
  studentGrade: {
    autoMarks: 5,
    finalMarks: 5,
    confidenceLevel: 'HIGH',
    provisional: false,
    overridden: false,
    summary:
      'Partially correct. Defined Atomicity and Durability accurately, but omitted Consistency and Isolation.',
    missingPoints: [
      'Did not define Consistency or database constraint invariants',
      'Did not explain Isolation or concurrent transaction handling',
    ],
    criteria: [
      {
        criterionId: 'crit-a',
        description: 'Defines Atomicity (all-or-nothing execution)',
        maxMarks: 2.5,
        awarded: 2.5,
        justification: 'Clear statement of all-or-nothing semantics.',
        evidenceSpan: 'Atomicity ensures all operations in a transaction succeed or all fail together.',
      },
      {
        criterionId: 'crit-c',
        description: 'Defines Consistency (preserves database invariants and constraints)',
        maxMarks: 2.5,
        awarded: 0,
        justification: 'Consistency was not addressed in the response.',
        evidenceSpan: null,
      },
      {
        criterionId: 'crit-i',
        description: 'Defines Isolation (concurrency control and non-interference)',
        maxMarks: 2.5,
        awarded: 0,
        justification: 'Isolation was not mentioned.',
        evidenceSpan: null,
      },
      {
        criterionId: 'crit-d',
        description: 'Defines Durability (persistence of committed data through crashes)',
        maxMarks: 2.5,
        awarded: 2.5,
        justification: 'Correctly noted that committed data survives crashes.',
        evidenceSpan: 'Durability guarantees that committed data survives crashes.',
      },
    ],
  },
  teacherGrade: {
    autoMarks: 5,
    finalMarks: 5,
    confidence: 0.88,
    confidenceLevel: 'HIGH',
    modelVersion: 'claude-3-5-sonnet-20241022',
    needsReview: false,
    overriddenBy: null,
    overridden: false,
    summary:
      'Partially correct. Defined Atomicity and Durability accurately, but omitted Consistency and Isolation.',
    missingPoints: [
      'Did not define Consistency or database constraint invariants',
      'Did not explain Isolation or concurrent transaction handling',
    ],
    criteria: [
      {
        criterionId: 'crit-a',
        description: 'Defines Atomicity (all-or-nothing execution)',
        maxMarks: 2.5,
        awarded: 2.5,
        justification: 'Clear statement of all-or-nothing semantics.',
        evidenceSpan: 'Atomicity ensures all operations in a transaction succeed or all fail together.',
      },
      {
        criterionId: 'crit-c',
        description: 'Defines Consistency (preserves database invariants and constraints)',
        maxMarks: 2.5,
        awarded: 0,
        justification: 'Consistency was not addressed in the response.',
        evidenceSpan: null,
      },
      {
        criterionId: 'crit-i',
        description: 'Defines Isolation (concurrency control and non-interference)',
        maxMarks: 2.5,
        awarded: 0,
        justification: 'Isolation was not mentioned.',
        evidenceSpan: null,
      },
      {
        criterionId: 'crit-d',
        description: 'Defines Durability (persistence of committed data through crashes)',
        maxMarks: 2.5,
        awarded: 2.5,
        justification: 'Correctly noted that committed data survives crashes.',
        evidenceSpan: 'Durability guarantees that committed data survives crashes.',
      },
    ],
  },
};

// 3. Low Confidence
export const lowConfidenceFixture: FixtureItem = {
  id: 'low-confidence',
  title: '3. Low Confidence (3 / 10)',
  description: 'Colloquial and fragmented phrasing flagged with low confidence and review required.',
  question: acidQuestion,
  answer:
    'ACID makes databases work good by not losing data when things crash and keeping stuff separate.',
  studentGrade: {
    autoMarks: 3,
    finalMarks: 3,
    confidenceLevel: 'LOW',
    provisional: true,
    overridden: false,
    summary:
      'The response is colloquial and ambiguous. Low model confidence in automated score extraction.',
    missingPoints: [
      'Lacks formal definitions of all four properties',
      'Did not explain Consistency invariants or schema validation',
    ],
    criteria: [
      {
        criterionId: 'crit-a',
        description: 'Defines Atomicity (all-or-nothing execution)',
        maxMarks: 2.5,
        awarded: 1.0,
        justification: 'Vaguely implied by not losing data.',
        evidenceSpan: 'not losing data',
      },
      {
        criterionId: 'crit-c',
        description: 'Defines Consistency (preserves database invariants and constraints)',
        maxMarks: 2.5,
        awarded: 0,
        justification: 'No reference to consistency or constraints.',
        evidenceSpan: null,
      },
      {
        criterionId: 'crit-i',
        description: 'Defines Isolation (concurrency control and non-interference)',
        maxMarks: 2.5,
        awarded: 1.0,
        justification: 'Colloquially mentions keeping stuff separate.',
        evidenceSpan: 'keeping stuff separate',
      },
      {
        criterionId: 'crit-d',
        description: 'Defines Durability (persistence of committed data through crashes)',
        maxMarks: 2.5,
        awarded: 1.0,
        justification: 'Mentioned not losing data when things crash.',
        evidenceSpan: 'when things crash',
      },
    ],
  },
  teacherGrade: {
    autoMarks: 3,
    finalMarks: 3,
    confidence: 0.45,
    confidenceLevel: 'LOW',
    modelVersion: 'claude-3-5-sonnet-20241022',
    needsReview: true,
    overriddenBy: null,
    overridden: false,
    notes: 'Low semantic alignment. Phrasing deviates significantly from standard terminology.',
    summary:
      'The response is colloquial and ambiguous. Low model confidence in automated score extraction.',
    missingPoints: [
      'Lacks formal definitions of all four properties',
      'Did not explain Consistency invariants or schema validation',
    ],
    criteria: [
      {
        criterionId: 'crit-a',
        description: 'Defines Atomicity (all-or-nothing execution)',
        maxMarks: 2.5,
        awarded: 1.0,
        justification: 'Vaguely implied by not losing data.',
        evidenceSpan: 'not losing data',
      },
      {
        criterionId: 'crit-c',
        description: 'Defines Consistency (preserves database invariants and constraints)',
        maxMarks: 2.5,
        awarded: 0,
        justification: 'No reference to consistency or constraints.',
        evidenceSpan: null,
      },
      {
        criterionId: 'crit-i',
        description: 'Defines Isolation (concurrency control and non-interference)',
        maxMarks: 2.5,
        awarded: 1.0,
        justification: 'Colloquially mentions keeping stuff separate.',
        evidenceSpan: 'keeping stuff separate',
      },
      {
        criterionId: 'crit-d',
        description: 'Defines Durability (persistence of committed data through crashes)',
        maxMarks: 2.5,
        awarded: 1.0,
        justification: 'Mentioned not losing data when things crash.',
        evidenceSpan: 'when things crash',
      },
    ],
  },
};

// 4. Provisional Grade
export const provisionalFixture: FixtureItem = {
  id: 'provisional',
  title: '4. Provisional Grade (7 / 10)',
  description: 'Grade marked as provisional pending teacher verification.',
  question: acidQuestion,
  answer:
    'Atomicity is all-or-nothing. Consistency maintains rules across tables. Isolation keeps transactions distinct. Durability writes to log.',
  studentGrade: {
    autoMarks: 7,
    finalMarks: 7,
    confidenceLevel: 'MEDIUM',
    provisional: true,
    overridden: false,
    summary:
      'Brief definitions provided for all four properties. Provisional grade assigned awaiting teacher sign-off.',
    missingPoints: ['Could elaborate more on isolation levels and crash recovery'],
    criteria: [
      {
        criterionId: 'crit-a',
        description: 'Defines Atomicity (all-or-nothing execution)',
        maxMarks: 2.5,
        awarded: 2.0,
        justification: 'Concise summary of all-or-nothing.',
        evidenceSpan: 'Atomicity is all-or-nothing.',
      },
      {
        criterionId: 'crit-c',
        description: 'Defines Consistency (preserves database invariants and constraints)',
        maxMarks: 2.5,
        awarded: 1.5,
        justification: 'Mentions maintaining rules across tables.',
        evidenceSpan: 'Consistency maintains rules across tables.',
      },
      {
        criterionId: 'crit-i',
        description: 'Defines Isolation (concurrency control and non-interference)',
        maxMarks: 2.5,
        awarded: 1.5,
        justification: 'Mentions keeping transactions distinct.',
        evidenceSpan: 'Isolation keeps transactions distinct.',
      },
      {
        criterionId: 'crit-d',
        description: 'Defines Durability (persistence of committed data through crashes)',
        maxMarks: 2.5,
        awarded: 2.0,
        justification: 'Mentions writing to transaction log.',
        evidenceSpan: 'Durability writes to log.',
      },
    ],
  },
  teacherGrade: {
    autoMarks: 7,
    finalMarks: 7,
    confidence: 0.68,
    confidenceLevel: 'MEDIUM',
    modelVersion: 'claude-3-5-sonnet-20241022',
    needsReview: true,
    overriddenBy: null,
    overridden: false,
    notes: 'Borderline brevity. Flagged for quick manual review.',
    summary:
      'Brief definitions provided for all four properties. Provisional grade assigned awaiting teacher sign-off.',
    missingPoints: ['Could elaborate more on isolation levels and crash recovery'],
    criteria: [
      {
        criterionId: 'crit-a',
        description: 'Defines Atomicity (all-or-nothing execution)',
        maxMarks: 2.5,
        awarded: 2.0,
        justification: 'Concise summary of all-or-nothing.',
        evidenceSpan: 'Atomicity is all-or-nothing.',
      },
      {
        criterionId: 'crit-c',
        description: 'Defines Consistency (preserves database invariants and constraints)',
        maxMarks: 2.5,
        awarded: 1.5,
        justification: 'Mentions maintaining rules across tables.',
        evidenceSpan: 'Consistency maintains rules across tables.',
      },
      {
        criterionId: 'crit-i',
        description: 'Defines Isolation (concurrency control and non-interference)',
        maxMarks: 2.5,
        awarded: 1.5,
        justification: 'Mentions keeping transactions distinct.',
        evidenceSpan: 'Isolation keeps transactions distinct.',
      },
      {
        criterionId: 'crit-d',
        description: 'Defines Durability (persistence of committed data through crashes)',
        maxMarks: 2.5,
        awarded: 2.0,
        justification: 'Mentions writing to transaction log.',
        evidenceSpan: 'Durability writes to log.',
      },
    ],
  },
};

// 5. Overridden Grade
export const overriddenFixture: FixtureItem = {
  id: 'overridden',
  title: '5. Overridden Grade (AI suggested 6, Teacher set 9)',
  description: 'Teacher adjusted the score from AI suggestion to reward domain insight.',
  question: acidQuestion,
  answer:
    'Atomicity is all or nothing. Consistency enforces schema rules. Isolation ensures serialized execution. Durability uses WAL to persist state.',
  studentGrade: {
    autoMarks: 6,
    finalMarks: 9,
    confidenceLevel: 'HIGH',
    provisional: false,
    overridden: true,
    summary:
      'Instructor adjusted grade to 9/10: student correctly referenced write-ahead logging (WAL) which demonstrates advanced durability mastery.',
    missingPoints: [],
    criteria: [
      {
        criterionId: 'crit-a',
        description: 'Defines Atomicity (all-or-nothing execution)',
        maxMarks: 2.5,
        awarded: 1.5,
        justification: 'Original AI scored brief explanation as 1.5.',
        evidenceSpan: 'Atomicity is all or nothing.',
      },
      {
        criterionId: 'crit-c',
        description: 'Defines Consistency (preserves database invariants and constraints)',
        maxMarks: 2.5,
        awarded: 1.5,
        justification: 'Original AI scored schema rules as 1.5.',
        evidenceSpan: 'Consistency enforces schema rules.',
      },
      {
        criterionId: 'crit-i',
        description: 'Defines Isolation (concurrency control and non-interference)',
        maxMarks: 2.5,
        awarded: 1.5,
        justification: 'Original AI scored serialized execution as 1.5.',
        evidenceSpan: 'Isolation ensures serialized execution.',
      },
      {
        criterionId: 'crit-d',
        description: 'Defines Durability (persistence of committed data through crashes)',
        maxMarks: 2.5,
        awarded: 1.5,
        justification: 'Original AI scored WAL reference as 1.5.',
        evidenceSpan: 'Durability uses WAL to persist state.',
      },
    ],
  },
  teacherGrade: {
    autoMarks: 6,
    finalMarks: 9,
    confidence: 0.82,
    confidenceLevel: 'HIGH',
    modelVersion: 'claude-3-5-sonnet-20241022',
    needsReview: false,
    overriddenBy: 'prof-carol',
    overridden: true,
    notes: 'Teacher override: credited advanced technical mention of WAL.',
    summary:
      'Instructor adjusted grade to 9/10: student correctly referenced write-ahead logging (WAL) which demonstrates advanced durability mastery.',
    missingPoints: [],
    criteria: [
      {
        criterionId: 'crit-a',
        description: 'Defines Atomicity (all-or-nothing execution)',
        maxMarks: 2.5,
        awarded: 1.5,
        justification: 'Original AI scored brief explanation as 1.5.',
        evidenceSpan: 'Atomicity is all or nothing.',
      },
      {
        criterionId: 'crit-c',
        description: 'Defines Consistency (preserves database invariants and constraints)',
        maxMarks: 2.5,
        awarded: 1.5,
        justification: 'Original AI scored schema rules as 1.5.',
        evidenceSpan: 'Consistency enforces schema rules.',
      },
      {
        criterionId: 'crit-i',
        description: 'Defines Isolation (concurrency control and non-interference)',
        maxMarks: 2.5,
        awarded: 1.5,
        justification: 'Original AI scored serialized execution as 1.5.',
        evidenceSpan: 'Isolation ensures serialized execution.',
      },
      {
        criterionId: 'crit-d',
        description: 'Defines Durability (persistence of committed data through crashes)',
        maxMarks: 2.5,
        awarded: 1.5,
        justification: 'Original AI scored WAL reference as 1.5.',
        evidenceSpan: 'Durability uses WAL to persist state.',
      },
    ],
  },
};

// 6. Blank Answer
export const blankAnswerFixture: FixtureItem = {
  id: 'blank-answer',
  title: '6. Blank Answer (0 / 10)',
  description: 'Unanswered short question. Shows header and summary only without empty sections.',
  question: acidQuestion,
  answer: '',
  studentGrade: {
    autoMarks: 0,
    finalMarks: 0,
    confidenceLevel: 'HIGH',
    provisional: false,
    overridden: false,
    summary: 'No answer was submitted for this question. Zero marks awarded.',
    missingPoints: [],
    criteria: [],
  },
  teacherGrade: {
    autoMarks: 0,
    finalMarks: 0,
    confidence: 1.0,
    confidenceLevel: 'HIGH',
    modelVersion: 'rule-based-blank-check',
    needsReview: false,
    overriddenBy: null,
    overridden: false,
    summary: 'No answer was submitted for this question. Zero marks awarded.',
    missingPoints: [],
    criteria: [],
  },
};

export const sampleGradeFixtures: FixtureItem[] = [
  fullMarksFixture,
  partialWithMissingPointsFixture,
  lowConfidenceFixture,
  provisionalFixture,
  overriddenFixture,
  blankAnswerFixture,
];

