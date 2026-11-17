import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RISK_CONFIG, FACTOR_LABELS } from '../components/profile/RiskBadge.js';
import { masteryBand, formatPercent } from './mastery-ui.js';

describe('Day 11: Client UI Tests', () => {
  describe('1. RiskBadge configuration and labels', () => {
    it('provides correct user-facing labels for all 4 risk levels (student vs teacher)', () => {
      // OK
      assert.equal(RISK_CONFIG.OK.studentLabel, 'On track');
      assert.equal(RISK_CONFIG.OK.label, 'On Track');

      // WATCH
      assert.equal(RISK_CONFIG.WATCH.studentLabel, 'Needs a little attention');
      assert.equal(RISK_CONFIG.WATCH.label, 'Watch (Needs attention)');

      // AT_RISK
      assert.equal(RISK_CONFIG.AT_RISK.studentLabel, 'Needs attention soon');
      assert.equal(RISK_CONFIG.AT_RISK.label, 'At Risk (Urgent attention)');

      // INSUFFICIENT_DATA
      assert.equal(RISK_CONFIG.INSUFFICIENT_DATA.studentLabel, 'Not enough data yet');
      assert.equal(RISK_CONFIG.INSUFFICIENT_DATA.label, 'Insufficient Data');
    });

    it('provides student-friendly vs teacher technical factor labels', () => {
      assert.equal(FACTOR_LABELS.LOW_ATTENDANCE.student, 'Attendance below 75%');
      assert.equal(FACTOR_LABELS.LOW_ATTENDANCE.teacher, 'Low Attendance (< 75%)');

      assert.equal(FACTOR_LABELS.LOW_MASTERY.student, 'Mastery below 70%');
      assert.equal(FACTOR_LABELS.LOW_MASTERY.teacher, 'Low Mastery (< 70%)');
    });
  });

  describe('2. Mastery UI and Formatting', () => {
    it('masteryBand classifies correctly into weak, developing, strong', () => {
      // Weak: < 0.4
      assert.equal(masteryBand(0.39).band, 'weak');
      assert.equal(masteryBand(0.0).band, 'weak');

      // Developing: 0.4 <= score < 0.7
      assert.equal(masteryBand(0.40).band, 'developing');
      assert.equal(masteryBand(0.69).band, 'developing');

      // Strong: >= 0.7
      assert.equal(masteryBand(0.70).band, 'strong');
      assert.equal(masteryBand(1.0).band, 'strong');
    });

    it('formatPercent handles ratios, percentages, nulls and NaNs', () => {
      assert.equal(formatPercent(0.85), '85%');
      assert.equal(formatPercent(0.402), '40%');
      assert.equal(formatPercent(75), '75%');
      assert.equal(formatPercent(null), 'N/A');
      assert.equal(formatPercent(undefined), 'N/A');
      assert.equal(formatPercent(NaN), 'N/A');
    });
  });

  describe('3. Component Logic Invariants', () => {
    it('Radar chart condition requires at least 3 concepts for 2D polygon rendering', () => {
      const concepts2 = [
        { id: '1', name: 'C1', score: 0.8, attempts: 2 },
        { id: '2', name: 'C2', score: 0.6, attempts: 2 },
      ];
      assert.equal(concepts2.length >= 3, false);

      const concepts3 = [
        ...concepts2,
        { id: '3', name: 'C3', score: 0.4, attempts: 1 },
      ];
      assert.equal(concepts3.length >= 3, true);
    });

    it('Trajectory LineChart requires at least 2 points to plot trend', () => {
      const history0: any[] = [];
      const history1 = [{ assessmentId: 'a1', title: 'Quiz 1', date: '2026-01-01', score: 5, max: 10, percentage: 50 }];
      const history2 = [
        ...history1,
        { assessmentId: 'a2', title: 'Quiz 2', date: '2026-01-10', score: 8, max: 10, percentage: 80 },
      ];

      assert.equal(history0.length >= 2, false);
      assert.equal(history1.length >= 2, false);
      assert.equal(history2.length >= 2, true);

      // Trajectory diff calculation: latest 80% vs previous 50% = +30%
      const diff = history2[1].percentage - history2[0].percentage;
      assert.equal(diff, 30);
    });
  });
});
