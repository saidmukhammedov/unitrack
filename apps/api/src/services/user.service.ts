import { prisma } from '../lib/prisma';
import { hashPassword, verifyPassword } from '../lib/password';
import { AuthError, formatUserProfile } from './auth.service';
import type { UserProfile, UpdateUserMeInput } from '@unitrack/contracts';

export const userService = {
  /**
   * Get user profile
   */
  async getMe(userId: string): Promise<UserProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AuthError(404, 'USER_NOT_FOUND', 'User not found.');
    }

    return formatUserProfile(user);
  },

  /**
   * Update user profile fields
   */
  async updateMe(userId: string, input: UpdateUserMeInput): Promise<UserProfile> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.displayName && { displayName: input.displayName }),
        ...(input.languageCode && { languageCode: input.languageCode }),
        ...(input.timezone && { timezone: input.timezone }),
        ...(input.institutionType && { institutionType: input.institutionType }),
      },
    });

    return formatUserProfile(user);
  },

  /**
   * Change password for email/password users
   */
  async changePassword(
    userId: string,
    currentPass: string,
    newPass: string
  ): Promise<{ message: string }> {
    const identity = await prisma.authIdentity.findFirst({
      where: {
        userId,
        provider: 'EMAIL_PASSWORD',
      },
    });

    if (!identity || !identity.passwordHash) {
      throw new AuthError(
        400,
        'NO_PASSWORD_IDENTITY',
        'This account does not have a password configured.'
      );
    }

    const valid = await verifyPassword(identity.passwordHash, currentPass);
    if (!valid) {
      throw new AuthError(400, 'INVALID_PASSWORD', 'Current password is incorrect.');
    }

    const newHash = await hashPassword(newPass);

    await prisma.$transaction(async (tx) => {
      await tx.authIdentity.update({
        where: { id: identity.id },
        data: { passwordHash: newHash },
      });

      // Revoke all refresh sessions on password change
      await tx.refreshSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    return { message: 'Password changed successfully.' };
  },

  /**
   * Delete user account and cascade delete all owned records
   */
  async deleteMe(userId: string, confirmPassword?: string): Promise<void> {
    const passwordIdentity = await prisma.authIdentity.findFirst({
      where: {
        userId,
        provider: 'EMAIL_PASSWORD',
      },
    });

    if (passwordIdentity && passwordIdentity.passwordHash) {
      if (!confirmPassword) {
        throw new AuthError(
          400,
          'PASSWORD_REQUIRED',
          'Password confirmation is required to delete account.'
        );
      }
      const valid = await verifyPassword(passwordIdentity.passwordHash, confirmPassword);
      if (!valid) {
        throw new AuthError(400, 'INVALID_PASSWORD', 'Password confirmation is incorrect.');
      }
    }

    // Delete user cascades to all related tables
    await prisma.user.delete({
      where: { id: userId },
    });
  },
};
