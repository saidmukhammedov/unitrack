import { Request, Response } from 'express';
import { authService, AuthError } from '../services/auth.service';
import {
  RegisterInputSchema,
  LoginInputSchema,
  VerifyEmailInputSchema,
  GoogleAuthInputSchema,
  ForgotPasswordInputSchema,
  ResetPasswordInputSchema,
} from '@unitrack/contracts';
import { env } from '../env';

export function getRefreshCookieOptions() {
  const isProd = env.NODE_ENV === 'production';
  const sameSite = env.COOKIE_SAME_SITE;
  const secure = isProd || sameSite === 'none';
  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/api/v1/auth',
  };
}

export function setRefreshCookie(res: Response, token: string) {
  res.cookie('refreshToken', token, {
    ...getRefreshCookieOptions(),
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie('refreshToken', getRefreshCookieOptions());
}

function isMobileClient(req: Request): boolean {
  return req.headers['x-client-type'] === 'mobile';
}

function handleControllerError(res: Response, error: unknown) {
  if (error instanceof AuthError) {
    return res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
  }
  console.error('Unhandled error:', error);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred.',
    },
  });
}

export const authController = {
  async register(req: Request, res: Response) {
    const parseResult = RegisterInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid registration input',
          details: parseResult.error.format(),
        },
      });
    }

    try {
      const result = await authService.register(parseResult.data);
      return res.status(201).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async verifyEmail(req: Request, res: Response) {
    const parseResult = VerifyEmailInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid verification token input',
          details: parseResult.error.format(),
        },
      });
    }

    try {
      const result = await authService.verifyEmail(parseResult.data.token);
      return res.status(200).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async login(req: Request, res: Response) {
    const parseResult = LoginInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid login credentials',
          details: parseResult.error.format(),
        },
      });
    }

    const deviceInfo = req.headers['user-agent'];
    const ipAddress = req.ip || req.socket.remoteAddress;

    try {
      const result = await authService.login(parseResult.data, deviceInfo, ipAddress);

      // On web: set httpOnly cookie
      setRefreshCookie(res, result.refreshToken);

      // Mobile clients receive refreshToken in body when X-Client-Type: mobile is present
      const responseBody: any = {
        accessToken: result.accessToken,
        user: result.user,
      };

      if (isMobileClient(req)) {
        responseBody.refreshToken = result.refreshToken;
      }

      return res.status(200).json(responseBody);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async googleAuth(req: Request, res: Response) {
    const parseResult = GoogleAuthInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid Google auth payload',
          details: parseResult.error.format(),
        },
      });
    }

    const deviceInfo = req.headers['user-agent'];
    const ipAddress = req.ip || req.socket.remoteAddress;

    try {
      const result = await authService.googleAuth(parseResult.data.idToken, deviceInfo, ipAddress);
      setRefreshCookie(res, result.refreshToken);

      const responseBody: any = {
        accessToken: result.accessToken,
        user: result.user,
      };

      if (isMobileClient(req)) {
        responseBody.refreshToken = result.refreshToken;
      }

      return res.status(200).json(responseBody);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async refresh(req: Request, res: Response) {
    const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!rawToken) {
      return res.status(401).json({
        error: {
          code: 'MISSING_REFRESH_TOKEN',
          message: 'Refresh token is required.',
        },
      });
    }

    const deviceInfo = req.headers['user-agent'];
    const ipAddress = req.ip || req.socket.remoteAddress;

    try {
      const result = await authService.refresh(rawToken, deviceInfo, ipAddress);
      setRefreshCookie(res, result.refreshToken);

      const responseBody: any = {
        accessToken: result.accessToken,
      };

      if (isMobileClient(req)) {
        responseBody.refreshToken = result.refreshToken;
      }

      return res.status(200).json(responseBody);
    } catch (err) {
      clearRefreshCookie(res);
      return handleControllerError(res, err);
    }
  },

  async logout(req: Request, res: Response) {
    const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (rawToken) {
      try {
        await authService.logout(rawToken);
      } catch (err) {
        console.error('Error revoking token on logout:', err);
      }
    }
    clearRefreshCookie(res);
    return res.status(204).send();
  },

  async forgotPassword(req: Request, res: Response) {
    const parseResult = ForgotPasswordInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid email address',
          details: parseResult.error.format(),
        },
      });
    }

    try {
      const result = await authService.forgotPassword(parseResult.data.email);
      return res.status(200).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async resetPassword(req: Request, res: Response) {
    const parseResult = ResetPasswordInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid password reset input',
          details: parseResult.error.format(),
        },
      });
    }

    try {
      const result = await authService.resetPassword(
        parseResult.data.token,
        parseResult.data.newPassword
      );
      clearRefreshCookie(res);
      return res.status(200).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async getSessions(req: Request, res: Response) {
    const userId = req.user!.id;
    const currentToken = req.cookies?.refreshToken || req.body?.refreshToken;

    try {
      const result = await authService.getSessions(userId, currentToken);
      return res.status(200).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async deleteSession(req: Request, res: Response) {
    const userId = req.user!.id;
    const rawSessionId = req.params.sessionId;
    const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;

    try {
      await authService.deleteSession(userId, sessionId);
      return res.status(204).send();
    } catch (err) {
      return handleControllerError(res, err);
    }
  },
};
