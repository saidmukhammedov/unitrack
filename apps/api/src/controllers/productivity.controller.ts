import { Request, Response } from 'express';
import { contextService } from '../services/context.service';
import { commitmentService } from '../services/commitment.service';
import { habitService } from '../services/habit.service';
import { todayService } from '../services/today.service';
import { goalsService } from '../services/goals.service';
import { reviewsService } from '../services/reviews.service';
import { syncService } from '../services/sync.service';
import { AuthError } from '../services/auth.service';
import {
  CreateContextInputSchema,
  UpdateContextInputSchema,
  CreateScheduleCommitmentInputSchema,
  UpdateScheduleCommitmentInputSchema,
  LogCommitmentOccurrenceInputSchema,
  CreateHabitInputSchema,
  UpdateHabitInputSchema,
  LogHabitOccurrenceInputSchema,
  CreateGoalInputSchema,
  UpdateGoalInputSchema,
  CreateMilestoneInputSchema,
  UpdateMilestoneInputSchema,
  SaveWeeklyReviewInputSchema,
  BatchSyncRequestSchema,
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
  console.error('Unhandled productivity controller error:', error);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred.',
    },
  });
}

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0];
  return param || '';
}

export const productivityController = {
  // ---------------------------------------------------------------------------
  // Contexts
  // ---------------------------------------------------------------------------
  async getContexts(req: Request, res: Response) {
    try {
      const result = await contextService.getContexts(req.user!.id);
      return res.status(200).json({ data: result });
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async createContext(req: Request, res: Response) {
    const parse = CreateContextInputSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid context data.',
          details: parse.error.format(),
        },
      });
    }

    try {
      const result = await contextService.createContext(req.user!.id, parse.data);
      return res.status(201).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async updateContext(req: Request, res: Response) {
    const contextId = getParam(req.params.id);
    const parse = UpdateContextInputSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid update data.',
          details: parse.error.format(),
        },
      });
    }

    try {
      const result = await contextService.updateContext(req.user!.id, contextId, parse.data);
      return res.status(200).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async deleteContext(req: Request, res: Response) {
    const contextId = getParam(req.params.id);
    try {
      await contextService.deleteContext(req.user!.id, contextId);
      return res.status(204).send();
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  // ---------------------------------------------------------------------------
  // Commitments
  // ---------------------------------------------------------------------------
  async getCommitments(req: Request, res: Response) {
    try {
      const result = await commitmentService.getCommitments(req.user!.id);
      return res.status(200).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async createCommitment(req: Request, res: Response) {
    const parse = CreateScheduleCommitmentInputSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid commitment data.',
          details: parse.error.format(),
        },
      });
    }

    try {
      const result = await commitmentService.createCommitment(req.user!.id, parse.data);
      return res.status(201).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async updateCommitment(req: Request, res: Response) {
    const commitmentId = getParam(req.params.id);
    const parse = UpdateScheduleCommitmentInputSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid update data.',
          details: parse.error.format(),
        },
      });
    }

    try {
      const result = await commitmentService.updateCommitment(
        req.user!.id,
        commitmentId,
        parse.data
      );
      return res.status(200).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async deleteCommitment(req: Request, res: Response) {
    const commitmentId = getParam(req.params.id);
    try {
      await commitmentService.deleteCommitment(req.user!.id, commitmentId);
      return res.status(204).send();
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async logCommitmentOccurrence(req: Request, res: Response) {
    const commitmentId = getParam(req.params.id);
    const dateStr = getParam(req.params.date);
    const parse = LogCommitmentOccurrenceInputSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid occurrence data.',
          details: parse.error.format(),
        },
      });
    }

    try {
      const result = await commitmentService.logOccurrence(
        req.user!.id,
        commitmentId,
        dateStr,
        parse.data
      );
      return res.status(200).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  // ---------------------------------------------------------------------------
  // Habits
  // ---------------------------------------------------------------------------
  async getHabits(req: Request, res: Response) {
    try {
      const result = await habitService.getHabits(req.user!.id);
      return res.status(200).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async createHabit(req: Request, res: Response) {
    const parse = CreateHabitInputSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid habit data.',
          details: parse.error.format(),
        },
      });
    }

    try {
      const result = await habitService.createHabit(req.user!.id, parse.data);
      return res.status(201).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async updateHabit(req: Request, res: Response) {
    const habitId = getParam(req.params.id);
    const parse = UpdateHabitInputSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid update data.',
          details: parse.error.format(),
        },
      });
    }

    try {
      const result = await habitService.updateHabit(req.user!.id, habitId, parse.data);
      return res.status(200).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async deleteHabit(req: Request, res: Response) {
    const habitId = getParam(req.params.id);
    try {
      await habitService.deleteHabit(req.user!.id, habitId);
      return res.status(204).send();
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async logHabitOccurrence(req: Request, res: Response) {
    const habitId = getParam(req.params.id);
    const parse = LogHabitOccurrenceInputSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid habit log data.',
          details: parse.error.format(),
        },
      });
    }

    try {
      const result = await habitService.logHabitOccurrence(
        req.user!.id,
        habitId,
        parse.data
      );
      return res.status(200).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  // ---------------------------------------------------------------------------
  // Today Stream (The Chronicle Core)
  // ---------------------------------------------------------------------------
  async getToday(req: Request, res: Response) {
    try {
      const dateStr = req.query.date as string | undefined;
      const timezone = (req.query.timezone as string) || 'UTC';
      const result = await todayService.getTodayView(req.user!.id, dateStr, timezone);
      return res.status(200).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  // ---------------------------------------------------------------------------
  // Goals & Milestones
  // ---------------------------------------------------------------------------
  async getGoals(req: Request, res: Response) {
    try {
      const result = await goalsService.getGoals(req.user!.id);
      return res.status(200).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async getGoalById(req: Request, res: Response) {
    const goalId = getParam(req.params.id);
    try {
      const result = await goalsService.getGoalById(req.user!.id, goalId);
      return res.status(200).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async createGoal(req: Request, res: Response) {
    const parse = CreateGoalInputSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid goal data.',
          details: parse.error.format(),
        },
      });
    }

    try {
      const result = await goalsService.createGoal(req.user!.id, parse.data);
      return res.status(201).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async updateGoal(req: Request, res: Response) {
    const goalId = getParam(req.params.id);
    const parse = UpdateGoalInputSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid update data.',
          details: parse.error.format(),
        },
      });
    }

    try {
      const result = await goalsService.updateGoal(req.user!.id, goalId, parse.data);
      return res.status(200).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async deleteGoal(req: Request, res: Response) {
    const goalId = getParam(req.params.id);
    try {
      await goalsService.deleteGoal(req.user!.id, goalId);
      return res.status(204).send();
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async createMilestone(req: Request, res: Response) {
    const goalId = getParam(req.params.id);
    const parse = CreateMilestoneInputSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid milestone data.',
          details: parse.error.format(),
        },
      });
    }

    try {
      const result = await goalsService.createMilestone(req.user!.id, goalId, parse.data);
      return res.status(201).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async updateMilestone(req: Request, res: Response) {
    const goalId = getParam(req.params.id);
    const milestoneId = getParam(req.params.milestoneId);
    const parse = UpdateMilestoneInputSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid update data.',
          details: parse.error.format(),
        },
      });
    }

    try {
      const result = await goalsService.updateMilestone(
        req.user!.id,
        goalId,
        milestoneId,
        parse.data
      );
      return res.status(200).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async deleteMilestone(req: Request, res: Response) {
    const goalId = getParam(req.params.id);
    const milestoneId = getParam(req.params.milestoneId);
    try {
      await goalsService.deleteMilestone(req.user!.id, goalId, milestoneId);
      return res.status(204).send();
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  // ---------------------------------------------------------------------------
  // Weekly Planning & Reviews
  // ---------------------------------------------------------------------------
  async getWeeklyReviews(req: Request, res: Response) {
    try {
      const result = await reviewsService.getWeeklyReviews(req.user!.id);
      return res.status(200).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async getReviewForWeek(req: Request, res: Response) {
    const weekStart = getParam(req.params.weekStart);
    try {
      const result = await reviewsService.getReviewForWeek(req.user!.id, weekStart);
      return res.status(200).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async saveWeeklyReview(req: Request, res: Response) {
    const parse = SaveWeeklyReviewInputSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid weekly review data.',
          details: parse.error.format(),
        },
      });
    }

    try {
      const result = await reviewsService.saveWeeklyReview(req.user!.id, parse.data);
      return res.status(200).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  // ---------------------------------------------------------------------------
  // Offline Sync
  // ---------------------------------------------------------------------------
  async batchSync(req: Request, res: Response) {
    const parse = BatchSyncRequestSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid sync payload.',
          details: parse.error.format(),
        },
      });
    }

    try {
      const result = await syncService.processBatchSync(req.user!.id, parse.data);
      return res.status(200).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },
};
