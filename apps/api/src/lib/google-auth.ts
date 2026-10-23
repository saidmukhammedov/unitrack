import { OAuth2Client } from 'google-auth-library';
import { env } from '../env';

export interface GoogleUserPayload {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  emailVerified: boolean;
}

const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);

let mockVerifyHandler: ((token: string) => Promise<GoogleUserPayload | null>) | null = null;

export function setMockGoogleVerify(handler: ((token: string) => Promise<GoogleUserPayload | null>) | null) {
  mockVerifyHandler = handler;
}

/**
 * Verify Google ID Token against Google Public Keys or Mock Handler
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleUserPayload> {
  if (mockVerifyHandler) {
    const mockUser = await mockVerifyHandler(idToken);
    if (!mockUser) {
      throw new Error('Invalid Google token');
    }
    return mockUser;
  }

  if (!env.GOOGLE_CLIENT_ID) {
    throw new Error('GOOGLE_CLIENT_ID is not configured');
  }

  const ticket = await client.verifyIdToken({
    idToken,
    audience: env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email) {
    throw new Error('Invalid token payload from Google');
  }

  return {
    sub: payload.sub,
    email: payload.email.toLowerCase(),
    name: payload.name || payload.email.split('@')[0],
    picture: payload.picture,
    emailVerified: payload.email_verified ?? false,
  };
}
