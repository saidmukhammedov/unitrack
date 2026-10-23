import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  // If response headers have already been transmitted, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // Handle AuthError if thrown from auth service
  if (err.statusCode && err.code) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // Handle Prisma unique constraint violation (P2002)
  if (err.code === 'P2002') {
    res.status(409).json({
      error: {
        code: 'CONFLICT',
        message: 'A resource with these unique attributes already exists',
        details: { target: err.meta?.target },
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request payload validation failed',
        details: { issues: err.issues },
      },
    });
    return;
  }

  const statusCode = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  if (statusCode >= 500) {
    console.error('Internal server error:', err);
  }

  res.status(statusCode).json({
    error: {
      code: err.code || (statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'ERROR'),
      message:
        statusCode >= 500 && isProd
          ? 'An internal server error occurred.'
          : err.message || 'An unexpected error occurred',
    },
  });
}
