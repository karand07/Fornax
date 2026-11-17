import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { recommend, ConceptInput, ResourceInput } from '../src/modules/profile/recommend.js';
import { computeRisk } from '../src/modules/profile/risk.js';
import { profileService } from '../src/modules/profile/profile.service.js';
import { prisma } from '../src/lib/prisma.js';
import { Role } from '@prisma/client';
import * as serverThresholds from '../src/lib/thresholds.js';
import * as clientThresholds from '../../client/src/lib/mastery-ui.js';

describe('Day 11: Recommendations, Unified Profile & Risk Flag Tests', () => {
  describe('1. Threshold Synchronization', () => {
    it('server/src/lib/thresholds.ts matches client/src/lib/mastery-ui.ts exactly', () => {
      assert.equal(serverThresholds.MASTERY_STRONG, clientThresholds.MASTERY_STRONG);
      assert.equal(serverThresholds.MASTERY_WEAK, clientThresholds.MASTERY_WEAK);
      assert.equal(serverThresholds.PREREQ_OK, clientThresholds.PREREQ_OK);
      assert.equal(serverThresholds.RISK_AT_RISK, clientThresholds.RISK_AT_RISK);
      assert.equal(serverThresholds.RISK_WATCH, clientThresholds.RISK_WATCH);
      assert.equal(serverThresholds.MAX_RECOMMENDATIONS, clientThresholds.MAX_RECOMMENDATIONS);
      assert.equal(serverThresholds.MAX_RESOURCES_PER_REC, clientThresholds.MAX_RESOURCES_PER_REC);
      assert.equal(serverThresholds.MIN_ASSESSED, clientThresholds.MIN_ASSESSED);
      assert.deepEqual(serverThresholds.RISK_WEIGHTS, clientThresholds.RISK_WEIGHTS);
    });
  });

  describe('2. Pure Recommend Logic (server/src/modules/profile/recommend.ts)', () => {
    const dummyResources: ResourceInput[] = [
      { id: 'r1', conceptId: 'c1', title: 'ER Basics', type: 'ARTICLE', difficulty: 1, url: 'http://r1' },
      { id: 'r2', conceptId: 'c1', title: 'ER Intermediate', type: 'VIDEO', difficulty: 2, url: 'http://r2' },
      { id: 'r3', conceptId: 'c1', title: 'ER Advanced', type: 'EXERCISE', difficulty: 3, url: 'http://r3' },
      { id: 'r4', conceptId: 'c2', title: 'Relational Algebra Primer', type: 'ARTICLE', difficulty: 1, url: 'http://r4' },
      { id: 'r5', conceptId: 'c2', title: 'Relational Operators Deep Dive', type: 'VIDEO', difficulty: 2, url: 'http://r5' },
    ];

    it('unassessed concepts (attempts === 0) are in notAssessed and never recommended', () => {
      const concepts: ConceptInput[] = [
        { id: 'c1', name: 'ER Modeling', score: 0.85, attempts: 2, prerequisiteId: null },
        { id: 'c2', name: 'Relational Algebra', score: 0.0, attempts: 0, prerequisiteId: 'c1' },
      ];

      const res = recommend(concepts, dummyResources);
      assert.equal(res.recommendations.length, 0);
      assert.equal(res.notAssessed.length, 1);
      assert.equal(res.notAssessed[0].id, 'c2');
      assert.equal(res.notAssessed[0].name, 'Relational Algebra');
    });

    it('concepts with score >= MASTERY_STRONG (0.7) are not recommended', () => {
      const concepts: ConceptInput[] = [
        { id: 'c1', name: 'ER Modeling', score: 0.70, attempts: 3, prerequisiteId: null },
        { id: 'c2', name: 'Relational Algebra', score: 0.95, attempts: 4, prerequisiteId: 'c1' },
      ];

      const res = recommend(concepts, dummyResources);
      assert.equal(res.recommendations.length, 0);
    });

    it('candidates sorted by score ascending, ties broken by name alphabetically', () => {
      const concepts: ConceptInput[] = [
        { id: 'c3', name: 'B Concept', score: 0.35, attempts: 2, prerequisiteId: null },
        { id: 'c2', name: 'A Concept', score: 0.35, attempts: 1, prerequisiteId: null },
        { id: 'c1', name: 'C Concept', score: 0.20, attempts: 2, prerequisiteId: null },
      ];

      const res = recommend(concepts, dummyResources);
      assert.equal(res.recommendations.length, 3);
      assert.equal(res.recommendations[0].conceptId, 'c1'); // score 0.20
      assert.equal(res.recommendations[1].conceptId, 'c2'); // score 0.35, 'A Concept'
      assert.equal(res.recommendations[2].conceptId, 'c3'); // score 0.35, 'B Concept'
    });

    it('redirects to prerequisite when prerequisite attempts > 0 and score < PREREQ_OK (0.6)', () => {
      const concepts: ConceptInput[] = [
        { id: 'c1', name: 'ER Modeling', score: 0.45, attempts: 2, prerequisiteId: null },
        { id: 'c2', name: 'Relational Algebra', score: 0.30, attempts: 2, prerequisiteId: 'c1' },
      ];

      const res = recommend(concepts, dummyResources);
      // Candidate c2 (score 0.30) has prereq c1 (score 0.45 < 0.6 and attempts 2 > 0)
      // c2 redirects to c1!
      assert.equal(res.recommendations.length, 1);
      assert.equal(res.recommendations[0].conceptId, 'c1');
      assert.equal(res.recommendations[0].reasonCode, 'WEAK_PREREQUISITE');
      assert.equal(res.recommendations[0].dependents.length, 1);
      assert.equal(res.recommendations[0].dependents[0].id, 'c2');
      assert.equal(
        res.recommendations[0].reason,
        'Your mastery in ER Modeling is 45%, and it is a prerequisite for Relational Algebra (30%). Strengthening it will help with both.'
      );
    });

    it('prerequisite boundary check: 0.59 redirects, 0.60 does NOT redirect', () => {
      const conceptsRedirect: ConceptInput[] = [
        { id: 'c1', name: 'ER Modeling', score: 0.59, attempts: 2, prerequisiteId: null },
        { id: 'c2', name: 'Relational Algebra', score: 0.30, attempts: 2, prerequisiteId: 'c1' },
      ];
      const res1 = recommend(conceptsRedirect, dummyResources);
      assert.equal(res1.recommendations[0].conceptId, 'c1');
      assert.equal(res1.recommendations[0].reasonCode, 'WEAK_PREREQUISITE');

      const conceptsNoRedirect: ConceptInput[] = [
        { id: 'c1', name: 'ER Modeling', score: 0.60, attempts: 2, prerequisiteId: null },
        { id: 'c2', name: 'Relational Algebra', score: 0.30, attempts: 2, prerequisiteId: 'c1' },
      ];
      const res2 = recommend(conceptsNoRedirect, dummyResources);
      // c2 does not redirect to c1 because c1 is >= 0.6
      assert.equal(res2.recommendations[0].conceptId, 'c2');
      assert.equal(res2.recommendations[0].reasonCode, 'WEAK_CONCEPT');
    });

    it('unassessed prerequisite (attempts === 0) does NOT redirect', () => {
      const concepts: ConceptInput[] = [
        { id: 'c1', name: 'ER Modeling', score: 0.0, attempts: 0, prerequisiteId: null },
        { id: 'c2', name: 'Relational Algebra', score: 0.35, attempts: 2, prerequisiteId: 'c1' },
      ];
      const res = recommend(concepts, dummyResources);
      // c1 has attempts 0, so c2 must not redirect to c1
      assert.equal(res.recommendations.length, 1);
      assert.equal(res.recommendations[0].conceptId, 'c2');
      assert.equal(res.recommendations[0].reasonCode, 'WEAK_CONCEPT');
      assert.equal(res.notAssessed[0].id, 'c1');
    });

    it('merges multiple dependents pointing to the same prerequisite and formats reason string', () => {
      const concepts: ConceptInput[] = [
        { id: 'c1', name: 'ER Modeling', score: 0.40, attempts: 2, prerequisiteId: null },
        { id: 'c2', name: 'Relational Algebra', score: 0.20, attempts: 2, prerequisiteId: 'c1' },
        { id: 'c3', name: 'Schema Design', score: 0.25, attempts: 2, prerequisiteId: 'c1' },
      ];

      const res = recommend(concepts, dummyResources);
      assert.equal(res.recommendations.length, 1);
      assert.equal(res.recommendations[0].conceptId, 'c1');
      assert.equal(res.recommendations[0].dependents.length, 2);
      assert.equal(
        res.recommendations[0].reason,
        'Your mastery in ER Modeling is 40%, and it is a prerequisite for Relational Algebra (20%) and Schema Design (25%). Strengthening it will help across all of them.'
      );
    });

    it('formats reason string correctly when 3 or more dependents exist', () => {
      const concepts: ConceptInput[] = [
        { id: 'c1', name: 'Foundations', score: 0.30, attempts: 2, prerequisiteId: null },
        { id: 'c2', name: 'Dep A', score: 0.10, attempts: 1, prerequisiteId: 'c1' },
        { id: 'c3', name: 'Dep B', score: 0.12, attempts: 1, prerequisiteId: 'c1' },
        { id: 'c4', name: 'Dep C', score: 0.15, attempts: 1, prerequisiteId: 'c1' },
      ];

      const res = recommend(concepts, dummyResources);
      assert.equal(res.recommendations.length, 1);
      assert.equal(res.recommendations[0].dependents.length, 3);
      assert.equal(
        res.recommendations[0].reason,
        'Your mastery in Foundations is 30%, and it is a prerequisite for 3 other concepts. Strengthening it will unblock your progress.'
      );
    });

    it('caps recommendations at MAX_RECOMMENDATIONS (3)', () => {
      const concepts: ConceptInput[] = [
        { id: 'c1', name: 'Concept 1', score: 0.1, attempts: 1, prerequisiteId: null },
        { id: 'c2', name: 'Concept 2', score: 0.2, attempts: 1, prerequisiteId: null },
        { id: 'c3', name: 'Concept 3', score: 0.3, attempts: 1, prerequisiteId: null },
        { id: 'c4', name: 'Concept 4', score: 0.4, attempts: 1, prerequisiteId: null },
        { id: 'c5', name: 'Concept 5', score: 0.5, attempts: 1, prerequisiteId: null },
      ];

      const res = recommend(concepts, []);
      assert.equal(res.recommendations.length, 3);
      assert.equal(res.recommendations[0].conceptId, 'c1');
      assert.equal(res.recommendations[1].conceptId, 'c2');
      assert.equal(res.recommendations[2].conceptId, 'c3');
    });

    it('selects resources based on score: level 1 if < 0.4, level 2 if >= 0.4', () => {
      const resForWeak: ResourceInput[] = [
        { id: 'r-adv', conceptId: 'c1', title: 'Adv Lab', type: 'EXERCISE', difficulty: 3, url: 'u3' },
        { id: 'r-easy', conceptId: 'c1', title: 'Easy Primer', type: 'ARTICLE', difficulty: 1, url: 'u1' },
        { id: 'r-med', conceptId: 'c1', title: 'Medium Guide', type: 'VIDEO', difficulty: 2, url: 'u2' },
      ];

      // score = 0.25 (< 0.4) -> target level 1
      const recWeak = recommend(
        [{ id: 'c1', name: 'ER', score: 0.25, attempts: 1, prerequisiteId: null }],
        resForWeak
      );
      assert.equal(recWeak.recommendations[0].resources[0].difficulty, 1);

      // score = 0.55 (>= 0.4) -> target level 2
      const recMed = recommend(
        [{ id: 'c1', name: 'ER', score: 0.55, attempts: 1, prerequisiteId: null }],
        resForWeak
      );
      assert.equal(recMed.recommendations[0].resources[0].difficulty, 2);
    });

    it('returns empty resources array for concept without resources', () => {
      const recEmpty = recommend(
        [{ id: 'c6', name: 'Indexing', score: 0.20, attempts: 1, prerequisiteId: null }],
        []
      );
      assert.equal(recEmpty.recommendations[0].resources.length, 0);
    });
  });

  describe('3. Pure Risk Logic (server/src/modules/profile/risk.ts)', () => {
    it('both attendance and mastery null returns INSUFFICIENT_DATA', () => {
      const risk = computeRisk(null, null);
      assert.equal(risk.level, 'INSUFFICIENT_DATA');
      assert.equal(risk.score, null);
      assert.deepEqual(risk.factors, []);
      assert.equal(risk.usedWeights, null);
    });

    it('attendance null, mastery present: renormalizes mastery weight to 1.0', () => {
      // mastery 0.85 -> risk = 0.15 -> OK
      const r1 = computeRisk(null, 0.85);
      assert.equal(r1.level, 'OK');
      assert.equal(r1.score, 0.15);
      assert.deepEqual(r1.factors, []);
      assert.deepEqual(r1.usedWeights, { attendance: 0, mastery: 1 });

      // mastery 0.60 -> risk = 0.40 -> WATCH with LOW_MASTERY
      const r2 = computeRisk(null, 0.60);
      assert.equal(r2.level, 'WATCH');
      assert.equal(r2.score, 0.4);
      assert.deepEqual(r2.factors, ['LOW_MASTERY']);

      // mastery 0.30 -> risk = 0.70 -> AT_RISK with LOW_MASTERY
      const r3 = computeRisk(null, 0.30);
      assert.equal(r3.level, 'AT_RISK');
      assert.equal(r3.score, 0.7);
      assert.deepEqual(r3.factors, ['LOW_MASTERY']);
    });

    it('mastery null, attendance present: renormalizes attendance weight to 1.0', () => {
      // attendance 0.90 -> risk = 0.10 -> OK
      const r1 = computeRisk(0.90, null);
      assert.equal(r1.level, 'OK');
      assert.equal(r1.score, 0.1);
      assert.deepEqual(r1.factors, []);
      assert.deepEqual(r1.usedWeights, { attendance: 1, mastery: 0 });

      // attendance 0.60 -> risk = 0.40 -> WATCH with LOW_ATTENDANCE
      const r2 = computeRisk(0.60, null);
      assert.equal(r2.level, 'WATCH');
      assert.equal(r2.score, 0.4);
      assert.deepEqual(r2.factors, ['LOW_ATTENDANCE']);

      // attendance 0.20 -> risk = 0.80 -> AT_RISK with LOW_ATTENDANCE
      const r3 = computeRisk(0.20, null);
      assert.equal(r3.level, 'AT_RISK');
      assert.equal(r3.score, 0.8);
      assert.deepEqual(r3.factors, ['LOW_ATTENDANCE']);
    });

    it('both present: formula 0.4 * (1 - att) + 0.6 * (1 - mastery)', () => {
      // Student 1: att = 1.0, mastery = 1.0 -> risk = 0.0 -> OK
      const s1 = computeRisk(1.0, 1.0);
      assert.equal(s1.level, 'OK');
      assert.equal(s1.score, 0.0);
      assert.deepEqual(s1.factors, []);

      // Student 2: att = 0.25, mastery = 0.05
      // risk = 0.4 * 0.75 + 0.6 * 0.95 = 0.30 + 0.57 = 0.87 -> AT_RISK
      const s2 = computeRisk(0.25, 0.05);
      assert.equal(s2.level, 'AT_RISK');
      assert.equal(s2.score, 0.87);
      assert.deepEqual(s2.factors, ['LOW_ATTENDANCE', 'LOW_MASTERY']);

      // Student 3: att = 0.50, mastery = 0.60
      // risk = 0.4 * 0.50 + 0.6 * 0.40 = 0.20 + 0.24 = 0.44 -> WATCH
      const s3 = computeRisk(0.50, 0.60);
      assert.equal(s3.level, 'WATCH');
      assert.equal(s3.score, 0.44);
      assert.deepEqual(s3.factors, ['LOW_ATTENDANCE', 'LOW_MASTERY']);
    });

    it('strict threshold checks: > 0.5 is AT_RISK, > 0.35 is WATCH, <= 0.35 is OK', () => {
      // Exactly 0.50 -> WATCH (because strictly greater than 0.5 is AT_RISK)
      const exactly50 = computeRisk(0.5, 0.5); // 0.4*0.5 + 0.6*0.5 = 0.50
      assert.equal(exactly50.level, 'WATCH');

      // 0.501 -> AT_RISK
      const justOver50 = computeRisk(0.498, 0.5); // 0.4*0.502 + 0.6*0.5 = 0.2008 + 0.3 = 0.5008
      assert.equal(justOver50.level, 'AT_RISK');

      // Exactly 0.35 -> OK (strictly greater than 0.35 is WATCH)
      const exactly35 = computeRisk(0.65, 0.65); // 0.4*0.35 + 0.6*0.35 = 0.35
      assert.equal(exactly35.level, 'OK');

      // 0.351 -> WATCH
      const justOver35 = computeRisk(0.64, 0.65); // 0.4*0.36 + 0.6*0.35 = 0.144 + 0.21 = 0.354
      assert.equal(justOver35.level, 'WATCH');
    });
  });

  describe('4. Profile Service & Access Control', () => {
    it('throws 404 when student is not enrolled in the course', async () => {
      const origEnrollment = prisma.enrollment.findUnique;
      (prisma.enrollment.findUnique as any) = async () => null;

      try {
        await assert.rejects(
          async () => {
            await profileService.getProfile('student-1', 'course-1', 'student-1', Role.STUDENT);
          },
          (err: any) => {
            assert.equal(err.statusCode, 404);
            assert.match(err.message, /not enrolled/i);
            return true;
          }
        );
      } finally {
        prisma.enrollment.findUnique = origEnrollment;
      }
    });

    it('throws 403 when a student requests another student profile', async () => {
      const origEnrollment = prisma.enrollment.findUnique;
      (prisma.enrollment.findUnique as any) = async () => ({
        userId: 'student-target',
        courseId: 'course-1',
      });

      try {
        await assert.rejects(
          async () => {
            await profileService.getProfile('student-target', 'course-1', 'student-other', Role.STUDENT);
          },
          (err: any) => {
            assert.equal(err.statusCode, 403);
            assert.match(err.message, /unauthorized/i);
            return true;
          }
        );
      } finally {
        prisma.enrollment.findUnique = origEnrollment;
      }
    });

    it('throws 403 when a teacher does not own the course', async () => {
      const origEnrollment = prisma.enrollment.findUnique;

      (prisma.enrollment.findUnique as any) = async () => ({
        userId: 'student-1',
        courseId: 'course-1',
        course: {
          id: 'course-1',
          code: 'CS301',
          title: 'Databases',
          teacherId: 'teacher-owner',
        },
      });

      try {
        await assert.rejects(
          async () => {
            await profileService.getProfile('student-1', 'course-1', 'teacher-intruder', Role.TEACHER);
          },
          (err: any) => {
            assert.equal(err.statusCode, 403);
            assert.match(err.message, /unauthorized/i);
            return true;
          }
        );
      } finally {
        prisma.enrollment.findUnique = origEnrollment;
      }
    });
  });
});
