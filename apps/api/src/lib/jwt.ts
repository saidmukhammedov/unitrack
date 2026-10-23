import jwt from 'jsonwebtoken';
import { env } from '../env';

export interface AccessTokenPayload {
  sub: string; // userId
  email: string;
}

export interface VerificationTokenPayload {
  sub: string; // userId
  email: string;
  purpose: 'verify-email';
}

export interface ResetPasswordTokenPayload {
  sub: string; // userId
  email: string;
  purpose: 'reset-password';
}

/**
 * Generate 15-minute JWT Access Token
 */
export function generateAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: '15m',
  });
}

/**
 * Verify JWT Access Token
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

/**
 * Generate 24-hour Email Verification Token
 */
export function generateEmailVerificationToken(userId: string, email: string): string {
  const payload: VerificationTokenPayload = {
    sub: userId,
    email,
    purpose: 'verify-email',
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: '24h',
  });
}

/**
 * Verify Email Verification Token
 */
export function verifyEmailVerificationToken(token: string): VerificationTokenPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as VerificationTokenPayload;
  if (payload.purpose !== 'verify-email') {
    throw new Error('Invalid token purpose');
  }
  return payload;
}

/**
 * Generate 1-hour Password Reset Token
 */
export function generatePasswordResetToken(userId: string, email: string): string {
  const payload: ResetPasswordTokenPayload = {
    sub: userId,
    email,
    purpose: 'reset-password',
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: '1h',
  });
}

/**
 * Verify Password Reset Token
 */
export function verifyPasswordResetToken(token: string): ResetPasswordTokenPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as ResetPasswordTokenPayload;
  if (payload.purpose !== 'reset-password') {
    throw new Error('Invalid token purpose');
  }
  return payload;
}
