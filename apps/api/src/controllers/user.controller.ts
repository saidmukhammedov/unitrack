import { Request, Response } from 'express';
import { userService } from '../services/user.service';
import { AuthError } from '../services/auth.service';
import { clearRefreshCookie } from './auth.controller';
import {
  UpdateUserMeInputSchema,
  ChangePasswordInputSchema,
  DeleteUserMeInputSchema,
} from '@unitrack/contracts';

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

export const userController = {
  async getMe(req: Request, res: Response) {
    try {
      const result = await userService.getMe(req.user!.id);
      return res.status(200).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async updateMe(req: Request, res: Response) {
    const parseResult = UpdateUserMeInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid user update payload',
          details: parseResult.error.format(),
        },
      });
    }

    try {
      const result = await userService.updateMe(req.user!.id, parseResult.data);
      return res.status(200).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async changePassword(req: Request, res: Response) {
    const parseResult = ChangePasswordInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid change password payload',
          details: parseResult.error.format(),
        },
      });
    }

    try {
      const result = await userService.changePassword(
        req.user!.id,
        parseResult.data.currentPassword,
        parseResult.data.newPassword
      );
      clearRefreshCookie(res);
      return res.status(200).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async deleteMe(req: Request, res: Response) {
    const parseResult = DeleteUserMeInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid delete user payload',
          details: parseResult.error.format(),
        },
      });
    }

    try {
      await userService.deleteMe(req.user!.id, parseResult.data.confirmPassword);
      clearRefreshCookie(res);
      return res.status(204).send();
    } catch (err) {
      return handleControllerError(res, err);
    }
  },
};
