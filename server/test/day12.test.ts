import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildAnalytics, AnalyticsInput } from '../src/modules/analytics/aggregate.js';
import { toCsv, sanitizeCell } from '../src/modules/analytics/csv.js';
import { analyticsService } from '../src/modules/analytics/analytics.service.js';
import { computeRisk } from '../src/modules/profile/risk.js';
import { prisma } from '../src/lib/prisma.js';
import { Role } from '@prisma/client';
import { MIN_ASSESSED } from '../src/lib/thresholds.js';

describe('Day 12: Teacher Analytics - Aggregation, Endpoints & CSV Tests', () => {
  describe('1. Pure Logic (aggregate.ts)', () => {
    it('concept display order puts prerequisite before dependent; cycle or missing prereq does not hang', () => {
      // Input: C3 depends on C2; C2 depends on C1; C4 has non-existent prereq; C5 & C6 are in a mutual cycle
      const concepts = [
        { id: 'c3', name: 'Z Normalization', prerequisiteId: 'c2' },
        { id: 'c2', name: 'Relational Algebra', prerequisiteId: 'c1' },
        { id: 'c1', name: 'ER Modeling', prerequisiteId: null },
        { id: 'c4', name: 'Missing Prereq Concept', prerequisiteId: 'non-existent-id' },
        { id: 'c5', name: 'Cycle A', prerequisiteId: 'c6' },
        { id: 'c6', name: 'Cycle B', prerequisiteId: 'c5' },
      ];

      const result = buildAnalytics({
        students: [{ id: 's1', name: 'Alice' }],
        concepts,
        mastery: [],
        attendance: [],
        sessions: [],
      });

      const order = result.concepts.map((c) => c.id);
      const c1Idx = order.indexOf('c1');
      const c2Idx = order.indexOf('c2');
      const c3Idx = order.indexOf('c3');

      // Prerequisite before dependent
      assert.ok(c1Idx < c2Idx, 'C1 (prereq) must precede C2');
      assert.ok(c2Idx < c3Idx, 'C2 (prereq) must precede C3');

      // Does not hang and contains all 6 concepts
      assert.equal(result.concepts.length, 6);

      // Cycle concepts and missing prereqs are resolved cleanly
      assert.ok(order.includes('c4'));
      assert.ok(order.includes('c5'));
      assert.ok(order.includes('c6'));
    });

    it('unassessed cell: no mastery row, and attempts = 0 with score 0.5 both give "unassessed" and null score', () => {
      const concepts = [
        { id: 'c1', name: 'ER', prerequisiteId: null },
        { id: 'c2', name: 'Relational', prerequisiteId: null },
      ];
      const students = [{ id: 's1', name: 'Bob' }];
      const mastery = [
        // s1 has attempts: 0 for c1
        { studentId: 's1', conceptId: 'c1', score: 0.5, attempts: 0 },
        // c2 has NO row for s1
      ];

      const result = buildAnalytics({
        students,
        concepts,
        mastery,
        attendance: [],
        sessions: [],
      });

      const row = result.rows[0];
      const cell1 = row.cells.find((c) => c.conceptId === 'c1')!;
      const cell2 = row.cells.find((c) => c.conceptId === 'c2')!;

      assert.equal(cell1.band, 'unassessed');
      assert.equal(cell1.score, null);
      assert.equal(cell2.band, 'unassessed');
      assert.equal(cell2.score, null);
    });

    it('band boundaries at 0.39 (weak), 0.40 (developing), 0.69 (developing), 0.70 (strong)', () => {
      const concepts = [
        { id: 'c1', name: 'C1', prerequisiteId: null },
        { id: 'c2', name: 'C2', prerequisiteId: null },
        { id: 'c3', name: 'C3', prerequisiteId: null },
        { id: 'c4', name: 'C4', prerequisiteId: null },
      ];
      const students = [{ id: 's1', name: 'Charlie' }];
      const mastery = [
        { studentId: 's1', conceptId: 'c1', score: 0.39, attempts: 1 },
        { studentId: 's1', conceptId: 'c2', score: 0.40, attempts: 1 },
        { studentId: 's1', conceptId: 'c3', score: 0.69, attempts: 1 },
        { studentId: 's1', conceptId: 'c4', score: 0.70, attempts: 1 },
      ];

      const result = buildAnalytics({
        students,
        concepts,
        mastery,
        attendance: [],
        sessions: [],
      });

      const row = result.rows[0];
      assert.equal(row.cells.find((c) => c.conceptId === 'c1')!.band, 'weak');
      assert.equal(row.cells.find((c) => c.conceptId === 'c2')!.band, 'developing');
      assert.equal(row.cells.find((c) => c.conceptId === 'c3')!.band, 'developing');
      assert.equal(row.cells.find((c) => c.conceptId === 'c4')!.band, 'strong');
    });

    it('avgMastery ignores unassessed; class average ignores unassessed students', () => {
      const concepts = [
        { id: 'c1', name: 'C1', prerequisiteId: null },
        { id: 'c2', name: 'C2', prerequisiteId: null },
      ];
      const students = [
        { id: 's1', name: 'Alice' },
        { id: 's2', name: 'Bob' },
      ];
      const mastery = [
        // Alice assessed in c1 (0.80) and c2 (0.60) -> avg 0.70
        { studentId: 's1', conceptId: 'c1', score: 0.80, attempts: 2 },
        { studentId: 's1', conceptId: 'c2', score: 0.60, attempts: 2 },
        // Bob assessed ONLY in c1 (0.40); c2 is unassessed
        { studentId: 's2', conceptId: 'c1', score: 0.40, attempts: 1 },
      ];

      const result = buildAnalytics({
        students,
        concepts,
        mastery,
        attendance: [],
        sessions: [],
      });

      const s1Row = result.rows.find((r) => r.studentId === 's1')!;
      const s2Row = result.rows.find((r) => r.studentId === 's2')!;

      assert.equal(s1Row.avgMastery, 0.70);
      assert.equal(s2Row.avgMastery, 0.40);

      // Class average for c1 = (0.80 + 0.40) / 2 = 0.60
      const c1Stat = result.classStats.find((cs) => cs.conceptId === 'c1')!;
      assert.equal(c1Stat.average, 0.60);
      assert.equal(c1Stat.assessedCount, 2);

      // Class average for c2 = only Alice assessed = 0.60 (ignores unassessed Bob)
      const c2Stat = result.classStats.find((cs) => cs.conceptId === 'c2')!;
      assert.equal(c2Stat.average, 0.60);
      assert.equal(c2Stat.assessedCount, 1);
    });

    it('weakestConcepts excludes concept with assessedCount < MIN_ASSESSED (2), caps at 3, deterministic tie-breaking', () => {
      const concepts = [
        { id: 'c1', name: 'C1 Weak Single Student', prerequisiteId: null }, // avg 0.10, count 1 -> excluded by MIN_ASSESSED
        { id: 'c2', name: 'C2 Tied Low Count', prerequisiteId: null },     // avg 0.30, count 2
        { id: 'c3', name: 'C3 Tied High Count', prerequisiteId: null },    // avg 0.30, count 5 -> higher count breaks tie
        { id: 'c4', name: 'C4 Lowest Valid', prerequisiteId: null },       // avg 0.20, count 3 -> lowest
        { id: 'c5', name: 'C5 Moderate', prerequisiteId: null },           // avg 0.50, count 4
        { id: 'c6', name: 'C6 High', prerequisiteId: null },               // avg 0.85, count 4
      ];

      const students = [
        { id: 's1', name: 'S1' },
        { id: 's2', name: 'S2' },
        { id: 's3', name: 'S3' },
        { id: 's4', name: 'S4' },
        { id: 's5', name: 'S5' },
      ];

      const mastery = [
        { studentId: 's1', conceptId: 'c1', score: 0.10, attempts: 1 }, // only 1 student

        { studentId: 's1', conceptId: 'c2', score: 0.30, attempts: 1 },
        { studentId: 's2', conceptId: 'c2', score: 0.30, attempts: 1 },

        { studentId: 's1', conceptId: 'c3', score: 0.30, attempts: 1 },
        { studentId: 's2', conceptId: 'c3', score: 0.30, attempts: 1 },
        { studentId: 's3', conceptId: 'c3', score: 0.30, attempts: 1 },
        { studentId: 's4', conceptId: 'c3', score: 0.30, attempts: 1 },
        { studentId: 's5', conceptId: 'c3', score: 0.30, attempts: 1 },

        { studentId: 's1', conceptId: 'c4', score: 0.20, attempts: 1 },
        { studentId: 's2', conceptId: 'c4', score: 0.20, attempts: 1 },
        { studentId: 's3', conceptId: 'c4', score: 0.20, attempts: 1 },

        { studentId: 's1', conceptId: 'c5', score: 0.50, attempts: 1 },
        { studentId: 's2', conceptId: 'c5', score: 0.50, attempts: 1 },

        { studentId: 's1', conceptId: 'c6', score: 0.85, attempts: 1 },
        { studentId: 's2', conceptId: 'c6', score: 0.85, attempts: 1 },
      ];

      const result = buildAnalytics({
        students,
        concepts,
        mastery,
        attendance: [],
        sessions: [],
      });

      // Must exclude c1 (count = 1 < MIN_ASSESSED = 2)
      assert.ok(!result.weakestConcepts.some((w) => w.conceptId === 'c1'));

      // Capped at 3
      assert.equal(result.weakestConcepts.length, 3);

      // Order: c4 (0.20), then tie between c3 and c2 (0.30): c3 wins tie because higher assessedCount (5 > 2)
      assert.equal(result.weakestConcepts[0].conceptId, 'c4');
      assert.equal(result.weakestConcepts[1].conceptId, 'c3');
      assert.equal(result.weakestConcepts[2].conceptId, 'c2');
    });

    it('atRisk sorting: AT_RISK first, then score descending, then name; INSUFFICIENT_DATA never listed', () => {
      const concepts = [{ id: 'c1', name: 'Concept A', prerequisiteId: null }];
      const students = [
        { id: 's1', name: 'Zoe Watch Lower' },
        { id: 's2', name: 'Alex AtRisk Lower' },
        { id: 's3', name: 'Brian AtRisk Higher' },
        { id: 's4', name: 'Diana Watch Higher' },
        { id: 's5', name: 'Evan Insufficient' },
        { id: 's6', name: 'Fiona Ok' },
      ];

      const attendance = [
        { studentId: 's1', rate: 0.60, present: 3, total: 5 }, // Watch
        { studentId: 's2', rate: 0.20, present: 1, total: 5 }, // AtRisk
        { studentId: 's3', rate: 0.00, present: 0, total: 5 }, // AtRisk (highest score)
        { studentId: 's4', rate: 0.50, present: 2, total: 5 }, // Watch
        { studentId: 's5', rate: null, present: 0, total: 0 }, // Insufficient
        { studentId: 's6', rate: 1.00, present: 5, total: 5 }, // OK
      ];

      const mastery = [
        { studentId: 's1', conceptId: 'c1', score: 0.60, attempts: 1 },
        { studentId: 's2', conceptId: 'c1', score: 0.30, attempts: 1 },
        { studentId: 's3', conceptId: 'c1', score: 0.10, attempts: 1 },
        { studentId: 's4', conceptId: 'c1', score: 0.50, attempts: 1 },
        // s5 has no mastery -> null + null -> INSUFFICIENT_DATA
        { studentId: 's6', conceptId: 'c1', score: 0.90, attempts: 1 },
      ];

      const result = buildAnalytics({
        students,
        concepts,
        mastery,
        attendance,
        sessions: [],
      });

      // s5 and s6 must NOT be in atRisk
      assert.ok(!result.atRisk.some((r) => r.studentId === 's5'));
      assert.ok(!result.atRisk.some((r) => r.studentId === 's6'));

      // In atRisk: s3 (AT_RISK higher score) -> s2 (AT_RISK lower score) -> s4 (WATCH higher) -> s1 (WATCH lower)
      assert.equal(result.atRisk[0].studentId, 's3');
      assert.equal(result.atRisk[0].level, 'AT_RISK');
      assert.equal(result.atRisk[1].studentId, 's2');
      assert.equal(result.atRisk[1].level, 'AT_RISK');
      assert.equal(result.atRisk[2].studentId, 's4');
      assert.equal(result.atRisk[2].level, 'WATCH');
      assert.equal(result.atRisk[3].studentId, 's1');
      assert.equal(result.atRisk[3].level, 'WATCH');
    });

    it('risk values match computeRisk called directly', () => {
      const concepts = [{ id: 'c1', name: 'Concept A', prerequisiteId: null }];
      const students = [{ id: 's1', name: 'Alice' }];
      const attendance = [{ studentId: 's1', rate: 0.65, present: 5, total: 8 }];
      const mastery = [{ studentId: 's1', conceptId: 'c1', score: 0.55, attempts: 2 }];

      const result = buildAnalytics({
        students,
        concepts,
        mastery,
        attendance,
        sessions: [],
      });

      const directRisk = computeRisk({ attendanceRate: 0.65, avgMastery: 0.55 });
      assert.deepEqual(result.rows[0].risk, directRisk);
    });

    it('empty course returns empty structures without throwing', () => {
      const empty1 = buildAnalytics({
        students: [],
        concepts: [],
        mastery: [],
        attendance: [],
        sessions: [],
      });
      assert.deepEqual(empty1.rows, []);
      assert.deepEqual(empty1.concepts, []);
      assert.deepEqual(empty1.classStats, []);
      assert.deepEqual(empty1.weakestConcepts, []);
      assert.deepEqual(empty1.atRisk, []);
      assert.equal(empty1.coverage.studentsTotal, 0);

      const emptyStudents = buildAnalytics({
        students: [],
        concepts: [{ id: 'c1', name: 'Concept 1', prerequisiteId: null }],
        mastery: [],
        attendance: [],
        sessions: [],
      });
      assert.deepEqual(emptyStudents.rows, []);
      assert.equal(emptyStudents.coverage.studentsTotal, 0);
    });
  });

  describe('2. CSV Export Pure Helper (csv.ts)', () => {
    it('neutralizes spreadsheet formula injection with single quote prefix', () => {
      assert.equal(sanitizeCell('=1+1'), "'=1+1");
      assert.equal(sanitizeCell('+SUM(A1:A10)'), "'+SUM(A1:A10)");
      assert.equal(sanitizeCell('-100'), "'-100");
      assert.equal(sanitizeCell('@mention'), "'@mention");
      assert.equal(sanitizeCell('\tindented'), "'\tindented");
      assert.equal(sanitizeCell('=HYPERLINK("http://evil.com")'), `"'=HYPERLINK(""http://evil.com"")"`);
    });

    it('escapes quotes, commas, and newlines per RFC 4180', () => {
      assert.equal(sanitizeCell('Hello, World'), '"Hello, World"');
      assert.equal(sanitizeCell('Said "Hello"'), '"Said ""Hello"""');
      assert.equal(sanitizeCell('Line 1\nLine 2'), '"Line 1\nLine 2"');
    });

    it('toCsv produces UTF-8 BOM, CRLF line endings, and empty cells for unassessed', () => {
      const rows = [
        ['Student', 'Attendance %', 'Avg mastery %', 'Risk level', 'Concept 1'],
        ['Alice', '100%', '85%', 'OK', '85%'],
        ['Bob', '50%', 'N/A', 'WATCH', ''],
      ];

      const csv = toCsv(rows);

      // Starts with UTF-8 BOM (\uFEFF)
      assert.ok(csv.startsWith('\uFEFF'));

      // Uses CRLF line endings (\r\n)
      assert.ok(csv.includes('\r\n'));
      assert.ok(!csv.includes('(?<!\r)\n'));

      // Empty cell for Bob's unassessed concept
      assert.ok(csv.includes('Bob,50%,N/A,WATCH,'));
    });
  });

  describe('3. Service & Access Control (analytics.service.ts)', () => {
    it('throws 403 when a teacher from another course requests analytics', async () => {
      const origCourse = prisma.course.findUnique;

      (prisma.course.findUnique as any) = async () => ({
        id: 'course-1',
        teacherId: 'teacher-owner',
        title: 'Database Systems',
        code: 'CS301',
      });

      try {
        await assert.rejects(
          async () => {
            await analyticsService.getCourseAnalytics('course-1', 'teacher-intruder', Role.TEACHER);
          },
          (err: any) => {
            assert.equal(err.statusCode, 403);
            assert.match(err.message, /unauthorized/i);
            return true;
          }
        );
      } finally {
        prisma.course.findUnique = origCourse;
      }
    });

    it('throws 403 when a student requests analytics', async () => {
      const origCourse = prisma.course.findUnique;

      (prisma.course.findUnique as any) = async () => ({
        id: 'course-1',
        teacherId: 'teacher-owner',
        title: 'Database Systems',
        code: 'CS301',
      });

      try {
        await assert.rejects(
          async () => {
            await analyticsService.getCourseAnalytics('course-1', 'student-1', Role.STUDENT);
          },
          (err: any) => {
            assert.equal(err.statusCode, 403);
            assert.match(err.message, /unauthorized/i);
            return true;
          }
        );
      } finally {
        prisma.course.findUnique = origCourse;
      }
    });

    it('query count stays constant regardless of whether 5 or 50 students are enrolled', async () => {
      const origCourse = prisma.course.findUnique;
      const origEnrollment = prisma.enrollment.findMany;
      const origConcept = prisma.concept.findMany;
      const origMastery = prisma.mastery.findMany;
      const origSession = prisma.classSession.findMany;

      let queryCount = 0;

      const setupMocks = (studentCount: number) => {
        queryCount = 0;

        (prisma.course.findUnique as any) = async () => {
          queryCount++;
          return { id: 'course-1', teacherId: 'teacher-1', title: 'DB', code: 'CS301' };
        };

        (prisma.enrollment.findMany as any) = async () => {
          queryCount++;
          return Array.from({ length: studentCount }, (_, i) => ({
            user: { id: `s-${i}`, firstName: `First${i}`, lastName: `Last${i}` },
          }));
        };

        (prisma.concept.findMany as any) = async () => {
          queryCount++;
          return [
            { id: 'c1', title: 'ER', order: 1, prerequisites: [] },
            { id: 'c2', title: 'Relational', order: 2, prerequisites: [{ prerequisiteId: 'c1' }] },
          ];
        };

        (prisma.mastery.findMany as any) = async () => {
          queryCount++;
          return [];
        };

        (prisma.classSession.findMany as any) = async () => {
          queryCount++;
          return [
            {
              id: 'sess-1',
              sessionDate: new Date(),
              attendances: [],
            },
          ];
        };
      };

      try {
        // Run with 5 students
        setupMocks(5);
        await analyticsService.getCourseAnalytics('course-1', 'teacher-1', Role.TEACHER);
        const countFor5 = queryCount;

        // Run with 50 students
        setupMocks(50);
        await analyticsService.getCourseAnalytics('course-1', 'teacher-1', Role.TEACHER);
        const countFor50 = queryCount;

        assert.equal(countFor5, countFor50, `Query count must remain constant (was ${countFor5} vs ${countFor50})`);
        assert.equal(countFor5, 5, 'Must perform exactly 5 queries');
      } finally {
        prisma.course.findUnique = origCourse;
        prisma.enrollment.findMany = origEnrollment;
        prisma.concept.findMany = origConcept;
        prisma.mastery.findMany = origMastery;
        prisma.classSession.findMany = origSession;
      }
    });

    it('response payload contains no faceDescriptor or email fields', async () => {
      const origCourse = prisma.course.findUnique;
      const origEnrollment = prisma.enrollment.findMany;
      const origConcept = prisma.concept.findMany;
      const origMastery = prisma.mastery.findMany;
      const origSession = prisma.classSession.findMany;

      (prisma.course.findUnique as any) = async () => ({
        id: 'c1',
        teacherId: 't1',
        title: 'DB',
        code: 'CS301',
      });
      (prisma.enrollment.findMany as any) = async () => [
        { user: { id: 's1', firstName: 'Alice', lastName: 'A' } },
      ];
      (prisma.concept.findMany as any) = async () => [
        { id: 'c1', title: 'ER', order: 1, prerequisites: [] },
      ];
      (prisma.mastery.findMany as any) = async () => [];
      (prisma.classSession.findMany as any) = async () => [];

      try {
        const result = await analyticsService.getCourseAnalytics('c1', 't1', Role.TEACHER);
        const json = JSON.stringify(result);

        assert.ok(!json.includes('faceDescriptor'));
        assert.ok(!json.includes('descriptor'));
        assert.ok(!json.includes('@fornax.edu'));
      } finally {
        prisma.course.findUnique = origCourse;
        prisma.enrollment.findMany = origEnrollment;
        prisma.concept.findMany = origConcept;
        prisma.mastery.findMany = origMastery;
        prisma.classSession.findMany = origSession;
      }
    });
  });
});
