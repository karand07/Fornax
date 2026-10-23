import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { Role } from '@prisma/client';

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
}

export const ROTATING_CODE_STEP_SECONDS = 5;

export interface RotatingCodeData {
  code: string;
  token: string;
  remainingSeconds: number;
  stepSeconds: number;
  timestamp: number;
}

/**
 * Computes a time-windowed HMAC-SHA256 rotating code.
 */
export function generateRotatingHMAC(
  sessionId: string,
  timestamp: number = Date.now(),
  stepSeconds: number = ROTATING_CODE_STEP_SECONDS
): RotatingCodeData {
  const counter = Math.floor(timestamp / 1000 / stepSeconds);
  const hmac = crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(`${sessionId}:${counter}`)
    .digest('hex');

  // Derive a user-friendly 6-digit numeric code from HMAC
  const offset = parseInt(hmac.substring(hmac.length - 1), 16) & 0x7;
  const sub = parseInt(hmac.substring(offset, offset + 8), 16);
  const code = (sub % 1000000).toString().padStart(6, '0');
  const token = hmac.substring(0, 16);

  const currentSec = Math.floor(timestamp / 1000);
  const remainingSeconds = stepSeconds - (currentSec % stepSeconds);

  return {
    code,
    token,
    remainingSeconds,
    stepSeconds,
    timestamp,
  };
}

/**
 * Verifies a rotating code or token against current and adjacent time steps.
 */
export function verifyRotatingCode(
  sessionId: string,
  inputCodeOrToken: string,
  stepSeconds: number = ROTATING_CODE_STEP_SECONDS,
  toleranceSteps: number = 1
): boolean {
  if (!sessionId || !inputCodeOrToken) return false;

  const normalizedInput = inputCodeOrToken.replace(/\s+/g, '').toLowerCase();
  const now = Date.now();
  const currentStep = Math.floor(now / 1000 / stepSeconds);

  for (let offset = -toleranceSteps; offset <= toleranceSteps; offset++) {
    const step = currentStep + offset;
    const hmac = crypto
      .createHmac('sha256', env.JWT_SECRET)
      .update(`${sessionId}:${step}`)
      .digest('hex');

    const off = parseInt(hmac.substring(hmac.length - 1), 16) & 0x7;
    const sub = parseInt(hmac.substring(off, off + 8), 16);
    const code = (sub % 1000000).toString().padStart(6, '0');
    const token = hmac.substring(0, 16).toLowerCase();

    if (
      normalizedInput === code ||
      normalizedInput === token ||
      normalizedInput === hmac.toLowerCase()
    ) {
      return true;
    }
  }

  return false;
}
