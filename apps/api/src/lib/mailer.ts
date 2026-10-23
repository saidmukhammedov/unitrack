import nodemailer from 'nodemailer';
import { env } from '../env';

// In-memory record for testing purposes
export interface SentMailRecord {
  to: string;
  subject: string;
  token?: string;
  html?: string;
  sentAt: Date;
}

export const sentMailsHistory: SentMailRecord[] = [];

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

/**
 * Send email verification link
 */
export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const verificationUrl = `${env.APP_BASE_URL}/verify-email?token=${encodeURIComponent(token)}`;
  const subject = 'Verify your UniTrack email';
  const html = `
    <h1>Welcome to UniTrack!</h1>
    <p>Please click the link below to verify your email address:</p>
    <p><a href="${verificationUrl}">${verificationUrl}</a></p>
    <p>This link is valid for 24 hours.</p>
  `;

  sentMailsHistory.push({
    to,
    subject,
    token,
    html,
    sentAt: new Date(),
  });

  if (env.NODE_ENV === 'test') {
    return;
  }

  const mailer = getTransporter();
  if (!mailer) {
    console.log(`[MAILER] SMTP credentials not set. Verification link for ${to}: ${verificationUrl}`);
    return;
  }

  try {
    await mailer.sendMail({
      from: env.SMTP_FROM,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error('Failed to send verification email via SMTP:', error);
    // Non-blocking in development
  }
}

/**
 * Send password reset link
 */
export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const resetUrl = `${env.APP_BASE_URL}/reset-password?token=${encodeURIComponent(token)}`;
  const subject = 'Reset your UniTrack password';
  const html = `
    <h1>Password Reset Request</h1>
    <p>We received a request to reset your password. Click the link below to choose a new password:</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p>This link is valid for 1 hour. If you did not request this, you can safely ignore this email.</p>
  `;

  sentMailsHistory.push({
    to,
    subject,
    token,
    html,
    sentAt: new Date(),
  });

  if (env.NODE_ENV === 'test') {
    return;
  }

  const mailer = getTransporter();
  if (!mailer) {
    console.log(`[MAILER] SMTP credentials not set. Password reset link for ${to}: ${resetUrl}`);
    return;
  }

  try {
    await mailer.sendMail({
      from: env.SMTP_FROM,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error('Failed to send password reset email via SMTP:', error);
  }
}
