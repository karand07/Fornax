import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { eyeAspectRatio, BlinkDetector, Point2D } from './blink.js';

describe('Blink Detection & EAR Module (§5.4)', () => {
  describe('Eye Aspect Ratio (EAR) calculations', () => {
    it('computes correct EAR for a standard open eye geometry', () => {
      // Horizontal width: |p1 - p4| = 20
      // Vertical heights: |p2 - p6| = 6, |p3 - p5| = 6
      // EAR = (6 + 6) / (2 * 20) = 12 / 40 = 0.30
      const openEye: Point2D[] = [
        { x: 0, y: 10 },  // p1
        { x: 5, y: 7 },   // p2
        { x: 15, y: 7 },  // p3
        { x: 20, y: 10 }, // p4
        { x: 15, y: 13 }, // p5
        { x: 5, y: 13 },  // p6
      ];

      const ear = eyeAspectRatio(openEye);
      assert.equal(Math.round(ear * 100) / 100, 0.3);
    });

    it('computes low EAR (< 0.21) for a closed eye geometry', () => {
      // Horizontal width: |p1 - p4| = 20
      // Vertical heights: |p2 - p6| = 2, |p3 - p5| = 2
      // EAR = (2 + 2) / (2 * 20) = 4 / 40 = 0.10
      const closedEye: Point2D[] = [
        { x: 0, y: 10 },
        { x: 5, y: 9 },
        { x: 15, y: 9 },
        { x: 20, y: 10 },
        { x: 15, y: 11 },
        { x: 5, y: 11 },
      ];

      const ear = eyeAspectRatio(closedEye);
      assert.equal(Math.round(ear * 100) / 100, 0.1);
      assert.equal(ear < 0.21, true);
    });
  });

  describe('BlinkDetector Unit Tests (Synthetic EAR sequences)', () => {
    it('1. blink passes: EAR < 0.21 for 2+ consecutive frames followed by EAR >= 0.21', () => {
      const detector = new BlinkDetector();
      let t = 1000;

      // Start with open eyes
      detector.update(0.32, t);
      assert.equal(detector.passed, false);

      // Eye closes: frame 1 (t=1100ms)
      t += 100;
      detector.update(0.16, t);
      assert.equal(detector.passed, false);

      // Eye closes: frame 2 (t=1200ms) - 2 consecutive closed frames reached
      t += 100;
      detector.update(0.15, t);
      assert.equal(detector.passed, false);

      // Eye re-opens: frame 3 (t=1300ms) - Blink completed!
      t += 100;
      detector.update(0.30, t);
      assert.equal(detector.passed, true);
      assert.equal(detector.blinks, 1);
      assert.equal(detector.timedOut, false);
    });

    it('2. flat open eyes fails: eyes remain open throughout the 8s period', () => {
      const detector = new BlinkDetector();
      let t = 0;

      // 85 frames across 8.5 seconds with continuous open eyes (EAR >= 0.21)
      for (let i = 0; i < 85; i++) {
        detector.update(0.30, t);
        t += 100;
      }

      assert.equal(detector.passed, false);
      assert.equal(detector.blinks, 0);
      assert.equal(detector.timedOut, true);
    });

    it('3. eyes closed constantly fails: eyes remain closed without re-opening', () => {
      const detector = new BlinkDetector();
      let t = 0;

      // 85 frames across 8.5 seconds with continuous closed eyes (EAR < 0.21)
      for (let i = 0; i < 85; i++) {
        detector.update(0.12, t);
        t += 100;
      }

      assert.equal(detector.passed, false);
      assert.equal(detector.blinks, 0);
      assert.equal(detector.timedOut, true);
    });

    it('4. blink after the 8s limit fails: blink occurs only after timeLimit has elapsed', () => {
      const detector = new BlinkDetector();
      let t = 0;

      // Open eyes for 8.2 seconds (exceeding 8000ms limit)
      while (t <= 8200) {
        detector.update(0.30, t);
        t += 100;
      }
      assert.equal(detector.timedOut, true);
      assert.equal(detector.passed, false);

      // Now student blinks late at t=8300, 8400, 8500
      detector.update(0.14, 8300); // closed frame 1
      detector.update(0.13, 8400); // closed frame 2
      detector.update(0.30, 8500); // re-open

      // Blink happened after timeout -> passed MUST be false!
      assert.equal(detector.passed, false);
      assert.equal(detector.timedOut, true);
    });
  });
});
