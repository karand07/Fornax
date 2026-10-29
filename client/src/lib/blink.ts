export interface Point2D {
  x: number;
  y: number;
}

/**
 * Calculates Euclidean distance between two 2D landmark points.
 */
export function pointDistance(p1: Point2D, p2: Point2D): number {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

/**
 * Computes Eye Aspect Ratio (EAR) from 6 landmark points corresponding to an eye.
 * Points must be ordered: [p1, p2, p3, p4, p5, p6]
 * where p1 & p4 are corners, and p2/p6, p3/p5 are vertical eyelid pairs.
 *
 * Formula: EAR = (|p2 - p6| + |p3 - p5|) / (2 * |p1 - p4|)
 */
export function eyeAspectRatio(points: Point2D[]): number {
  if (!points || points.length < 6) return 0;

  const [p1, p2, p3, p4, p5, p6] = points;
  const horizontalDist = pointDistance(p1, p4);

  if (horizontalDist === 0) return 0;

  const vertical1 = pointDistance(p2, p6);
  const vertical2 = pointDistance(p3, p5);

  return (vertical1 + vertical2) / (2 * horizontalDist);
}

/**
 * Extracts left eye (landmarks 36..41) and right eye (landmarks 42..47)
 * from 68 facial landmarks and returns their averaged EAR.
 */
export function calculateAverageEAR(landmarks: Point2D[]): number {
  if (!landmarks || landmarks.length < 68) return 0;

  const leftEye = landmarks.slice(36, 42);
  const rightEye = landmarks.slice(42, 48);

  const leftEar = eyeAspectRatio(leftEye);
  const rightEar = eyeAspectRatio(rightEye);

  return (leftEar + rightEar) / 2;
}

export interface BlinkDetectorOptions {
  earThreshold?: number; // Default 0.21
  minConsecutiveClosedFrames?: number; // Default 2
  timeLimitMs?: number; // Default 8000 (8s)
}

export interface BlinkDetectorUpdateResult {
  passed: boolean;
  timedOut: boolean;
  blinkCount: number;
  consecutiveClosed: number;
  elapsedMs: number;
}

/**
 * BlinkDetector monitors Eye Aspect Ratio frame-by-frame:
 * - Blink = EAR < 0.21 for at least 2 consecutive frames, followed by EAR >= 0.21 again.
 * - Require at least 1 blink within an 8-second limit.
 * - If time runs out, set passed = false (caller can still proceed and server flags it).
 */
export class BlinkDetector {
  public readonly earThreshold: number;
  public readonly minConsecutiveClosedFrames: number;
  public readonly timeLimitMs: number;

  private startTime: number | null = null;
  private consecutiveClosedFrames: number = 0;
  private blinkCount: number = 0;
  private hasPassed: boolean = false;
  private isTimedOut: boolean = false;

  constructor(options?: BlinkDetectorOptions) {
    this.earThreshold = options?.earThreshold ?? 0.21;
    this.minConsecutiveClosedFrames = options?.minConsecutiveClosedFrames ?? 2;
    this.timeLimitMs = options?.timeLimitMs ?? 8000;
  }

  public update(ear: number, timestamp: number = Date.now()): BlinkDetectorUpdateResult {
    if (this.startTime === null) {
      this.startTime = timestamp;
    }

    const elapsedMs = timestamp - this.startTime;

    // Check 8-second time limit
    if (elapsedMs > this.timeLimitMs) {
      this.isTimedOut = true;
    }

    if (ear < this.earThreshold) {
      this.consecutiveClosedFrames++;
    } else {
      // Eye is open
      if (this.consecutiveClosedFrames >= this.minConsecutiveClosedFrames) {
        this.blinkCount++;
        // Blink must occur before the 8-second limit expires to pass liveness
        if (!this.isTimedOut) {
          this.hasPassed = true;
        }
      }
      this.consecutiveClosedFrames = 0;
    }

    return {
      passed: this.hasPassed,
      timedOut: this.isTimedOut,
      blinkCount: this.blinkCount,
      consecutiveClosed: this.consecutiveClosedFrames,
      elapsedMs,
    };
  }

  public get passed(): boolean {
    return this.hasPassed;
  }

  public get timedOut(): boolean {
    return this.isTimedOut;
  }

  public get blinks(): number {
    return this.blinkCount;
  }

  public reset(): void {
    this.startTime = null;
    this.consecutiveClosedFrames = 0;
    this.blinkCount = 0;
    this.hasPassed = false;
    this.isTimedOut = false;
  }
}
