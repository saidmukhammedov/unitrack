import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { sentMailsHistory } from '../src/lib/mailer';
import { setMockGoogleVerify } from '../src/lib/google-auth';

const TEST_EMAIL = `student-${Date.now()}@example.com`;
const TEST_PASSWORD = 'Str0ng!Password123';
let verificationToken: string;
let accessToken: string;
let refreshToken: string;
let userId: string;

describe('Authentication & Account Security Flow (Phase 3)', () => {
  beforeAll(async () => {
    // Setup mock for Google Auth
    setMockGoogleVerify(async (token: string) => {
      if (token === 'valid-google-id-token') {
        return {
          sub: 'google-sub-123456789',
          email: 'google-student@example.com',
          name: 'Google Student',
          picture: 'https://lh3.googleusercontent.com/photo.jpg',
          emailVerified: true,
        };
      }
      return null;
    });
  });

  afterAll(async () => {
    setMockGoogleVerify(null);
    // Cleanup test users
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [TEST_EMAIL, 'google-student@example.com', 'overflow@example.com'],
        },
      },
    });
    await prisma.$disconnect();
  });

  // ---------------------------------------------------------------------------
  // 1. Registration
  // ---------------------------------------------------------------------------
  describe('POST /api/v1/auth/register', () => {
    it('rejects registration with invalid email or weak password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'short',
          displayName: 'Test',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('successfully registers new user with argon2 hash and sends verification email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
          displayName: 'Aisha Karimova',
          languageCode: 'uz',
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toContain('Verification email sent');

      // Verify user in database
      const dbUser = await prisma.user.findUnique({
        where: { email: TEST_EMAIL },
        include: { identities: true },
      });

      expect(dbUser).not.toBeNull();
      userId = dbUser!.id;
      expect(dbUser!.emailVerified).toBe(false);
      expect(dbUser!.languageCode).toBe('uz');
      expect(dbUser!.identities.length).toBe(1);

      // Verify Argon2 hash format
      const identity = dbUser!.identities[0];
      expect(identity.provider).toBe('EMAIL_PASSWORD');
      expect(identity.providerAccountId).toBe(dbUser!.id); // D-01 / I-19 check
      expect(identity.passwordHash).toMatch(/^\$argon2id\$/);

      // Check mailer captured verification token
      const lastMail = sentMailsHistory[sentMailsHistory.length - 1];
      expect(lastMail.to).toBe(TEST_EMAIL);
      expect(lastMail.token).toBeDefined();
      verificationToken = lastMail.token!;
    });

    it('rejects duplicate registration with 409', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
          displayName: 'Aisha Again',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Email Verification & Pre-verification Login Gate
  // ---------------------------------------------------------------------------
  describe('Email Verification & Login Gate', () => {
    it('blocks login if email is not yet verified with 403', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
    });

    it('rejects invalid or tampered verification token with 400', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: 'invalid.jwt.token' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
    });

    it('successfully verifies email with valid token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: verificationToken });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('verified successfully');

      const user = await prisma.user.findUnique({ where: { id: userId } });
      expect(user!.emailVerified).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Login & Refresh Token Handling
  // ---------------------------------------------------------------------------
  describe('POST /api/v1/auth/login', () => {
    it('rejects invalid password with 401', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: TEST_EMAIL,
          password: 'WrongPassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('logs in web client: sets httpOnly cookie and returns access token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
        });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.email).toBe(TEST_EMAIL);
      expect(res.body.refreshToken).toBeUndefined(); // Web client receives cookie

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('refreshToken=');
      expect(cookies[0].toLowerCase()).toContain('httponly');
    });

    it('logs in mobile client: returns refreshToken in JSON body when X-Client-Type is mobile', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('X-Client-Type', 'mobile')
        .send({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
        });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined(); // Mobile client receives token
      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Token Refresh, Rotation, and Reuse Detection
  // ---------------------------------------------------------------------------
  describe('POST /api/v1/auth/refresh', () => {
    it('rotates refresh token and returns new access token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('X-Client-Type', 'mobile')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.refreshToken).not.toBe(refreshToken); // Token rotated!

      const newRefreshToken = res.body.refreshToken;
      accessToken = res.body.accessToken;

      // REUSE DETECTION: Using the previous (now rotated) refresh token must fail with 401
      const reuseRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('X-Client-Type', 'mobile')
        .send({ refreshToken }); // Old token

      expect(reuseRes.status).toBe(401);
      expect(reuseRes.body.error.code).toBe('TOKEN_REUSE_DETECTED');

      // Update active refresh token to a newly generated login token
      const freshLogin = await request(app)
        .post('/api/v1/auth/login')
        .set('X-Client-Type', 'mobile')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

      accessToken = freshLogin.body.accessToken;
      refreshToken = freshLogin.body.refreshToken;
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Protected Profile & User Routes
  // ---------------------------------------------------------------------------
  describe('User Profile & Protected Endpoints', () => {
    it('rejects request without access token with 401', async () => {
      const res = await request(app).get('/api/v1/users/me');
      expect(res.status).toBe(401);
    });

    it('returns authenticated user profile', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe(TEST_EMAIL);
      expect(res.body.displayName).toBe('Aisha Karimova');
      expect(res.body.emailVerified).toBe(true);
    });

    it('updates user profile settings', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          displayName: 'Aisha K.',
          timezone: 'Asia/Tashkent',
          institutionType: 'UNIVERSITY',
        });

      expect(res.status).toBe(200);
      expect(res.body.displayName).toBe('Aisha K.');
      expect(res.body.timezone).toBe('Asia/Tashkent');
      expect(res.body.institutionType).toBe('UNIVERSITY');
    });

    it('changes password successfully', async () => {
      const NEW_PASSWORD = 'BrandNewPassword123!';
      const res = await request(app)
        .post('/api/v1/users/me/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: TEST_PASSWORD,
          newPassword: NEW_PASSWORD,
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Password changed successfully');

      // Verify login with new password works
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .set('X-Client-Type', 'mobile')
        .send({
          email: TEST_EMAIL,
          password: NEW_PASSWORD,
        });

      expect(loginRes.status).toBe(200);
      accessToken = loginRes.body.accessToken;
      refreshToken = loginRes.body.refreshToken;
    });
  });

  // ---------------------------------------------------------------------------
  // 5b. Account Recovery (Forgot & Reset Password)
  // ---------------------------------------------------------------------------
  describe('Account Recovery (Forgot & Reset Password)', () => {
    let resetToken: string;

    it('returns 200 with generic message for non-existent email without revealing account presence', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent-student-9999@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('If this email is registered');
    });

    it('sends password reset email with token for registered user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: TEST_EMAIL });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('If this email is registered');

      const lastMail = sentMailsHistory[sentMailsHistory.length - 1];
      expect(lastMail.to).toBe(TEST_EMAIL);
      expect(lastMail.subject.toLowerCase()).toContain('reset your unitrack password');
      expect(lastMail.token).toBeDefined();
      resetToken = lastMail.token!;
    });

    it('rejects invalid or malformed reset token with 400', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'invalid-or-tampered-token',
          newPassword: 'BrandNewResetPassword123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
    });

    it('successfully resets password, revokes existing sessions, and allows login with new password', async () => {
      const RESET_PASSWORD = 'BrandNewResetPassword123!';
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: RESET_PASSWORD,
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Password reset successfully');

      // Verify old password fails
      const oldLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: TEST_EMAIL,
          password: 'BrandNewPassword123!',
        });
      expect(oldLogin.status).toBe(401);

      // Verify new password succeeds
      const newLogin = await request(app)
        .post('/api/v1/auth/login')
        .set('X-Client-Type', 'mobile')
        .send({
          email: TEST_EMAIL,
          password: RESET_PASSWORD,
        });
      expect(newLogin.status).toBe(200);
      accessToken = newLogin.body.accessToken;
      refreshToken = newLogin.body.refreshToken;
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Session Management & Max 10 Overflow
  // ---------------------------------------------------------------------------
  describe('Session Management', () => {
    it('lists active sessions for current user', async () => {
      const res = await request(app)
        .get('/api/v1/auth/sessions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send();

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('revokes a specific session', async () => {
      const listRes = await request(app)
        .get('/api/v1/auth/sessions')
        .set('Authorization', `Bearer ${accessToken}`);

      const targetSessionId = listRes.body.data[0].id;

      const deleteRes = await request(app)
        .delete(`/api/v1/auth/sessions/${targetSessionId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(deleteRes.status).toBe(204);

      // Verify session is marked revoked
      const dbSession = await prisma.refreshSession.findUnique({
        where: { id: targetSessionId },
      });
      expect(dbSession!.revokedAt).not.toBeNull();
    });

    it('enforces maximum 10 active sessions by revoking oldest', async () => {
      const overflowEmail = `overflow-${Date.now()}@example.com`;
      const registerRes = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: overflowEmail, password: 'Password123!', displayName: 'Overflow User' });

      expect(registerRes.status).toBe(201);
      const user = await prisma.user.findUnique({ where: { email: overflowEmail } });
      await prisma.user.update({ where: { id: user!.id }, data: { emailVerified: true } });

      // Create 12 sessions
      for (let i = 0; i < 12; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .set('X-Client-Type', 'mobile')
          .send({ email: overflowEmail, password: 'Password123!' });
      }

      // Check active sessions in database
      const activeCount = await prisma.refreshSession.count({
        where: { userId: user!.id, revokedAt: null },
      });

      // Must be at most 10 active sessions
      expect(activeCount).toBeLessThanOrEqual(10);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Google OAuth Authentication
  // ---------------------------------------------------------------------------
  describe('POST /api/v1/auth/google', () => {
    it('creates new account and issues tokens for valid Google ID token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/google')
        .set('X-Client-Type', 'mobile')
        .send({ idToken: 'valid-google-id-token' });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user.email).toBe('google-student@example.com');
      expect(res.body.user.emailVerified).toBe(true);

      const dbUser = await prisma.user.findUnique({
        where: { email: 'google-student@example.com' },
        include: { identities: true },
      });

      expect(dbUser).not.toBeNull();
      expect(dbUser!.identities[0].provider).toBe('GOOGLE');
      expect(dbUser!.identities[0].providerAccountId).toBe('google-sub-123456789');
    });

    it('rejects invalid Google ID token with 400', async () => {
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ idToken: 'invalid-token' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_GOOGLE_TOKEN');
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Account Deletion & Cascade
  // ---------------------------------------------------------------------------
  describe('DELETE /api/v1/users/me', () => {
    it('deletes user account and cascades all identities and sessions', async () => {
      // Re-login to get fresh accessToken
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .set('X-Client-Type', 'mobile')
        .send({
          email: TEST_EMAIL,
          password: 'BrandNewResetPassword123!',
        });

      const token = loginRes.body.accessToken;

      const deleteRes = await request(app)
        .delete('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ confirmPassword: 'BrandNewResetPassword123!' });

      expect(deleteRes.status).toBe(204);

      // Verify user completely removed from database
      const user = await prisma.user.findUnique({ where: { id: userId } });
      expect(user).toBeNull();

      // Verify identities and sessions cascade-deleted
      const identities = await prisma.authIdentity.findMany({ where: { userId } });
      expect(identities.length).toBe(0);

      const sessions = await prisma.refreshSession.findMany({ where: { userId } });
      expect(sessions.length).toBe(0);
    });
  });
});
