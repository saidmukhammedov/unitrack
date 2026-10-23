import { prisma } from '../lib/prisma';
import { hashPassword, verifyPassword } from '../lib/password';
import {
  generateAccessToken,
  generateEmailVerificationToken,
  verifyEmailVerificationToken,
  generatePasswordResetToken,
  verifyPasswordResetToken,
} from '../lib/jwt';
import { generateOpaqueToken, hashToken, getRefreshTokenExpiry } from '../lib/tokens';
import { sendVerificationEmail, sendPasswordResetEmail } from '../lib/mailer';
import { verifyGoogleIdToken } from '../lib/google-auth';
import type {
  RegisterInput,
  LoginInput,
  UserProfile,
  SessionItem,
} from '@unitrack/contracts';

export class AuthError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Format user model to public UserProfile contract
 */
export function formatUserProfile(user: {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  languageCode: string;
  timezone: string;
  institutionType: string;
  createdAt: Date;
}): UserProfile {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    emailVerified: user.emailVerified,
    languageCode: user.languageCode as any,
    timezone: user.timezone,
    institutionType: user.institutionType as any,
    createdAt: user.createdAt.toISOString(),
  };
}

/**
 * Enforce maximum 10 active sessions per user
 */
async function enforceMaxSessions(userId: string): Promise<void> {
  const activeSessions = await prisma.refreshSession.findMany({
    where: {
      userId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (activeSessions.length >= 10) {
    const sessionsToRevoke = activeSessions.slice(0, activeSessions.length - 9);
    const idsToRevoke = sessionsToRevoke.map((s) => s.id);
    await prisma.refreshSession.updateMany({
      where: { id: { in: idsToRevoke } },
      data: { revokedAt: new Date() },
    });
  }
}

/**
 * Create a new refresh session and return opaque token
 */
async function createSession(
  userId: string,
  deviceInfo?: string,
  ipAddress?: string
): Promise<string> {
  await enforceMaxSessions(userId);

  const rawToken = generateOpaqueToken();
  const tokenHash = hashToken(rawToken);

  await prisma.refreshSession.create({
    data: {
      userId,
      tokenHash,
      deviceInfo: deviceInfo || null,
      ipAddress: ipAddress || null,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  return rawToken;
}

export const authService = {
  /**
   * Register a new user with email and password
   */
  async register(input: RegisterInput): Promise<{ message: string }> {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new AuthError(409, 'EMAIL_ALREADY_EXISTS', 'Email is already registered.');
    }

    const hashedPassword = await hashPassword(input.password);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: input.email,
          displayName: input.displayName,
          languageCode: input.languageCode,
          emailVerified: true,
        },
      });

      // providerAccountId is the stable User.id UUID (D-01 / I-19)
      await tx.authIdentity.create({
        data: {
          userId: newUser.id,
          provider: 'EMAIL_PASSWORD',
          providerAccountId: newUser.id,
          passwordHash: hashedPassword,
        },
      });

      return newUser;
    });

    return {
      message: 'Account created successfully.',
    };
  },

  /**
   * Verify email using token sent via email
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    let payload;
    try {
      payload = verifyEmailVerificationToken(token);
    } catch {
      throw new AuthError(400, 'INVALID_OR_EXPIRED_TOKEN', 'Verification token is invalid or expired.');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new AuthError(400, 'USER_NOT_FOUND', 'User does not exist.');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });

    return {
      message: 'Email verified successfully.',
    };
  },

  /**
   * Login with email and password
   */
  async login(
    input: LoginInput,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<{ accessToken: string; refreshToken: string; user: UserProfile }> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: {
        identities: {
          where: { provider: 'EMAIL_PASSWORD' },
        },
      },
    });

    if (!user || user.identities.length === 0 || !user.identities[0].passwordHash) {
      throw new AuthError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    const passwordMatch = await verifyPassword(
      user.identities[0].passwordHash,
      input.password
    );

    if (!passwordMatch) {
      throw new AuthError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    if (!user.emailVerified) {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      });
      user.emailVerified = true;
    }

    const accessToken = generateAccessToken({
      sub: user.id,
      email: user.email,
    });

    const refreshToken = await createSession(user.id, deviceInfo, ipAddress);

    return {
      accessToken,
      refreshToken,
      user: formatUserProfile(user),
    };
  },

  /**
   * Google ID token authentication
   */
  async googleAuth(
    idToken: string,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<{ accessToken: string; refreshToken: string; user: UserProfile }> {
    let googleUser;
    try {
      googleUser = await verifyGoogleIdToken(idToken);
    } catch (err: any) {
      throw new AuthError(400, 'INVALID_GOOGLE_TOKEN', err.message || 'Google token validation failed.');
    }

    // Look up existing Google identity
    const existingIdentity = await prisma.authIdentity.findUnique({
      where: {
        provider_providerAccountId: {
          provider: 'GOOGLE',
          providerAccountId: googleUser.sub,
        },
      },
      include: { user: true },
    });

    let user;

    if (existingIdentity) {
      user = existingIdentity.user;
    } else {
      // Check if user with this email already exists with another provider
      const existingEmailUser = await prisma.user.findUnique({
        where: { email: googleUser.email },
      });

      if (existingEmailUser) {
        // Link Google identity to existing user account and verify email
        await prisma.authIdentity.upsert({
          where: {
            provider_providerAccountId: {
              provider: 'GOOGLE',
              providerAccountId: googleUser.sub,
            },
          },
          update: {},
          create: {
            userId: existingEmailUser.id,
            provider: 'GOOGLE',
            providerAccountId: googleUser.sub,
          },
        });
        if (!existingEmailUser.emailVerified) {
          await prisma.user.update({
            where: { id: existingEmailUser.id },
            data: { emailVerified: true },
          });
        }
        user = existingEmailUser;
      } else {

      // Create new user and Google identity
      user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email: googleUser.email,
            displayName: googleUser.name,
            avatarUrl: googleUser.picture || null,
            emailVerified: true, // Google accounts come pre-verified
          },
        });

        await tx.authIdentity.create({
          data: {
            userId: newUser.id,
            provider: 'GOOGLE',
            providerAccountId: googleUser.sub,
          },
        });

        return newUser;
      });
      }
    }

    const accessToken = generateAccessToken({
      sub: user.id,
      email: user.email,
    });

    const refreshToken = await createSession(user.id, deviceInfo, ipAddress);

    return {
      accessToken,
      refreshToken,
      user: formatUserProfile(user),
    };
  },

  /**
   * Refresh access token and rotate refresh token
   */
  async refresh(
    rawRefreshToken: string,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenHash = hashToken(rawRefreshToken);

    const session = await prisma.refreshSession.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session) {
      throw new AuthError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token not found.');
    }

    // Reuse detection: if a revoked token is used, compromise is suspected
    if (session.revokedAt !== null) {
      await prisma.refreshSession.updateMany({
        where: { userId: session.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new AuthError(
        401,
        'TOKEN_REUSE_DETECTED',
        'Refresh token has already been rotated. All sessions have been revoked.'
      );
    }

    if (session.expiresAt <= new Date()) {
      throw new AuthError(401, 'REFRESH_TOKEN_EXPIRED', 'Refresh token has expired.');
    }

    // Invalidate old session (rotation)
    await prisma.refreshSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    // Create new rotated session
    const newRefreshToken = await createSession(
      session.userId,
      deviceInfo || session.deviceInfo || undefined,
      ipAddress || session.ipAddress || undefined
    );

    const accessToken = generateAccessToken({
      sub: session.user.id,
      email: session.user.email,
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  },

  /**
   * Revoke refresh session on logout
   */
  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = hashToken(rawRefreshToken);
    await prisma.refreshSession.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  /**
   * Request password reset email
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      const resetToken = generatePasswordResetToken(user.id, user.email);
      await sendPasswordResetEmail(user.email, resetToken);
    }

    return {
      message: 'If this email is registered, a password reset link has been sent.',
    };
  },

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    let payload;
    try {
      payload = verifyPasswordResetToken(token);
    } catch {
      throw new AuthError(400, 'INVALID_OR_EXPIRED_TOKEN', 'Reset token is invalid or expired.');
    }

    const identity = await prisma.authIdentity.findFirst({
      where: {
        userId: payload.sub,
        provider: 'EMAIL_PASSWORD',
      },
    });

    if (!identity) {
      throw new AuthError(400, 'IDENTITY_NOT_FOUND', 'No password identity found for user.');
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.$transaction(async (tx) => {
      await tx.authIdentity.update({
        where: { id: identity.id },
        data: { passwordHash: hashedPassword },
      });

      // Revoke all existing active sessions
      await tx.refreshSession.updateMany({
        where: { userId: payload.sub, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    return {
      message: 'Password reset successfully. Please log in with your new password.',
    };
  },

  /**
   * List active sessions for user
   */
  async getSessions(userId: string, currentToken?: string): Promise<{ data: SessionItem[] }> {
    const currentHash = currentToken ? hashToken(currentToken) : null;

    const sessions = await prisma.refreshSession.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: sessions.map((s) => ({
        id: s.id,
        deviceInfo: s.deviceInfo,
        ipAddress: s.ipAddress,
        createdAt: s.createdAt.toISOString(),
        isCurrent: currentHash ? s.tokenHash === currentHash : false,
      })),
    };
  },

  /**
   * Revoke specific session by ID
   */
  async deleteSession(userId: string, sessionId: string): Promise<void> {
    const session = await prisma.refreshSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!session) {
      throw new AuthError(404, 'SESSION_NOT_FOUND', 'Session not found or not owned by user.');
    }

    await prisma.refreshSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
  },
};
