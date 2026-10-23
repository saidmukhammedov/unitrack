import { Request, Response } from 'express';
import { academicService } from '../services/academic.service';
import { AuthError } from '../services/auth.service';
import {
  CreateAcademicPeriodInputSchema,
  UpdateAcademicPeriodInputSchema,
  CreateSubjectInputSchema,
  UpdateSubjectInputSchema,
  CreateClassSessionInputSchema,
  UpdateClassSessionInputSchema,
  CreateTaskInputSchema,
  UpdateTaskInputSchema,
  CreateAssessmentInputSchema,
  UpdateAssessmentInputSchema,
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
  console.error('Unhandled academic controller error:', error);
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

export const academicController = {
  // Periods
  async getPeriods(req: Request, res: Response) {
    try {
      const archived = req.query.archived as string | undefined;
      const result = await academicService.getPeriods(req.user!.id, archived);
      return res.status(200).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async createPeriod(req: Request, res: Response) {
    const parse = CreateAcademicPeriodInputSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid academic period input',
          details: parse.error.format(),
        },
      });
    }

    try {
      const result = await academicService.createPeriod(req.user!.id, parse.data);
      return res.status(201).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async getPeriodById(req: Request, res: Response) {
    try {
      const result = await academicService.getPeriodById(req.user!.id, getParam(req.params.periodId));
      return res.status(200).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async updatePeriod(req: Request, res: Response) {
    const parse = UpdateAcademicPeriodInputSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid academic period update payload',
          details: parse.error.format(),
        },
      });
    }

    try {
      const result = await academicService.updatePeriod(
        req.user!.id,
        getParam(req.params.periodId),
        parse.data
      );
      return res.status(200).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async deletePeriod(req: Request, res: Response) {
    try {
      await academicService.deletePeriod(req.user!.id, getParam(req.params.periodId));
      return res.status(204).send();
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  // Subjects
  async getSubjectsByPeriod(req: Request, res: Response) {
    try {
      const archived = req.query.archived as string | undefined;
      const result = await academicService.getSubjectsByPeriod(
        req.user!.id,
        getParam(req.params.periodId),
        archived
      );
      return res.status(200).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async createSubject(req: Request, res: Response) {
    const parse = CreateSubjectInputSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid subject input',
          details: parse.error.format(),
        },
      });
    }

    try {
      const result = await academicService.createSubject(
        req.user!.id,
        getParam(req.params.periodId),
        parse.data
      );
      return res.status(201).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async getSubjectById(req: Request, res: Response) {
    try {
      const result = await academicService.getSubjectById(req.user!.id, getParam(req.params.subjectId));
      return res.status(200).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async updateSubject(req: Request, res: Response) {
    const parse = UpdateSubjectInputSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid subject update payload',
          details: parse.error.format(),
        },
      });
    }

    try {
      const result = await academicService.updateSubject(
        req.user!.id,
        getParam(req.params.subjectId),
        parse.data
      );
      return res.status(200).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async deleteSubject(req: Request, res: Response) {
    try {
      await academicService.deleteSubject(req.user!.id, getParam(req.params.subjectId));
      return res.status(204).send();
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  // Timetable
  async getTimetable(req: Request, res: Response) {
    try {
      const weekdayParam = req.query.weekday ? parseInt(req.query.weekday as string, 10) : undefined;
      const result = await academicService.getTimetable(req.user!.id, {
        periodId: req.query.periodId as string | undefined,
        subjectId: req.query.subjectId as string | undefined,
        weekday: isNaN(weekdayParam as any) ? undefined : weekdayParam,
      });
      return res.status(200).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async createClassSession(req: Request, res: Response) {
    const parse = CreateClassSessionInputSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid class session input',
          details: parse.error.format(),
        },
      });
    }

    try {
      const result = await academicService.createClassSession(req.user!.id, parse.data);
      return res.status(201).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async updateClassSession(req: Request, res: Response) {
    if ('periodId' in req.body) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'periodId is immutable on timetable class sessions.',
        },
      });
    }

    const parse = UpdateClassSessionInputSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid class session update payload',
          details: parse.error.format(),
        },
      });
    }

    try {
      const result = await academicService.updateClassSession(
        req.user!.id,
        getParam(req.params.sessionId),
        parse.data
      );
      return res.status(200).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async deleteClassSession(req: Request, res: Response) {
    try {
      await academicService.deleteClassSession(req.user!.id, getParam(req.params.sessionId));
      return res.status(204).send();
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  // Tasks
  async getTasks(req: Request, res: Response) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const result = await academicService.getTasks(req.user!.id, {
        periodId: req.query.periodId as string | undefined,
        subjectId: req.query.subjectId as string | undefined,
        completed: req.query.completed as string | undefined,
        dueBefore: req.query.dueBefore as string | undefined,
        limit: isNaN(limit as any) ? undefined : limit,
        cursor: req.query.cursor as string | undefined,
      });
      return res.status(200).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async createTask(req: Request, res: Response) {
    const parse = CreateTaskInputSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid task input',
          details: parse.error.format(),
        },
      });
    }

    try {
      const result = await academicService.createTask(req.user!.id, parse.data);
      return res.status(201).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async getTaskById(req: Request, res: Response) {
    try {
      const result = await academicService.getTaskById(req.user!.id, getParam(req.params.taskId));
      return res.status(200).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async updateTask(req: Request, res: Response) {
    const parse = UpdateTaskInputSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid task update payload',
          details: parse.error.format(),
        },
      });
    }

    try {
      const result = await academicService.updateTask(
        req.user!.id,
        getParam(req.params.taskId),
        parse.data
      );
      return res.status(200).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async deleteTask(req: Request, res: Response) {
    try {
      await academicService.deleteTask(req.user!.id, getParam(req.params.taskId));
      return res.status(204).send();
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  // Assessments
  async getAssessments(req: Request, res: Response) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const result = await academicService.getAssessments(req.user!.id, {
        periodId: req.query.periodId as string | undefined,
        subjectId: req.query.subjectId as string | undefined,
        status: req.query.status as string | undefined,
        scheduledAfter: req.query.scheduledAfter as string | undefined,
        scheduledBefore: req.query.scheduledBefore as string | undefined,
        limit: isNaN(limit as any) ? undefined : limit,
        cursor: req.query.cursor as string | undefined,
      });
      return res.status(200).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async createAssessment(req: Request, res: Response) {
    const parse = CreateAssessmentInputSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid assessment input',
          details: parse.error.format(),
        },
      });
    }

    try {
      const result = await academicService.createAssessment(req.user!.id, parse.data);
      return res.status(201).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async getAssessmentById(req: Request, res: Response) {
    try {
      const result = await academicService.getAssessmentById(
        req.user!.id,
        getParam(req.params.assessmentId)
      );
      return res.status(200).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async updateAssessment(req: Request, res: Response) {
    if ('periodId' in req.body) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'periodId is immutable on assessments.',
        },
      });
    }

    const parse = UpdateAssessmentInputSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid assessment update payload',
          details: parse.error.format(),
        },
      });
    }

    try {
      const result = await academicService.updateAssessment(
        req.user!.id,
        getParam(req.params.assessmentId),
        parse.data
      );
      return res.status(200).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  async deleteAssessment(req: Request, res: Response) {
    try {
      await academicService.deleteAssessment(req.user!.id, getParam(req.params.assessmentId));
      return res.status(204).send();
    } catch (err) {
      return handleControllerError(res, err);
    }
  },

  // Dashboard
  async getDashboard(req: Request, res: Response) {
    try {
      const targetDate = req.query.date as string | undefined;
      const result = await academicService.getDashboard(req.user!.id, targetDate);
      return res.status(200).json(result);
    } catch (err) {
      return handleControllerError(res, err);
    }
  },
};
