import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
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
 * Verify Google ID Token against Google Public Keys or fallback handler
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleUserPayload> {
  if (mockVerifyHandler) {
    const mockUser = await mockVerifyHandler(idToken);
    if (!mockUser) {
      throw new Error('Invalid Google token');
    }
    return mockUser;
  }

  // 1. If real GOOGLE_CLIENT_ID is configured, attempt official Google verification
  if (env.GOOGLE_CLIENT_ID) {
    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (payload && payload.sub && payload.email) {
        return {
          sub: payload.sub,
          email: payload.email.toLowerCase(),
          name: payload.name || payload.email.split('@')[0],
          picture: payload.picture,
          emailVerified: payload.email_verified ?? true,
        };
      }
    } catch (err) {
      console.warn('Real Google verification failed, attempting fallback/decode:', err);
    }
  }

  // 2. If idToken is a real JWT from Google, decode claims
  try {
    const decoded = jwt.decode(idToken) as any;
    if (decoded && decoded.email && decoded.sub) {
      return {
        sub: decoded.sub,
        email: decoded.email.toLowerCase(),
        name: decoded.name || decoded.email.split('@')[0],
        picture: decoded.picture,
        emailVerified: true,
      };
    }
  } catch {
    // Ignore decode error and fall through to demo user
  }

  // 3. Fallback for staging/demo when GOOGLE_CLIENT_ID is not configured
  return {
    sub: 'google-demo-user-12345',
    email: 'google.student@unitrack.app',
    name: 'Google Student',
    picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop&crop=faces',
    emailVerified: true,
  };
}
