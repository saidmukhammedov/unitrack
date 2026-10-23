import { Request, Response } from 'express';
import { gradingService, GradingServiceError } from '../services/grading.service';
import {
  CreateGradingSchemeInputSchema,
  UpdateGradingSchemeInputSchema,
} from '@unitrack/contracts';

export class GradingController {
  async listGradingSchemes(req: Request, res: Response) {
    try {
      const schemes = await gradingService.listGradingSchemes(req.user!.id);
      res.json({ data: schemes });
    } catch (err: any) {
      this.handleError(res, err);
    }
  }

  async getGradingScheme(req: Request, res: Response) {
    try {
      const schemeId = Array.isArray(req.params.schemeId) ? req.params.schemeId[0] : req.params.schemeId;
      const scheme = await gradingService.getGradingScheme(req.user!.id, schemeId);
      res.json(scheme);
    } catch (err: any) {
      this.handleError(res, err);
    }
  }

  async createGradingScheme(req: Request, res: Response) {
    try {
      const parsed = CreateGradingSchemeInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: parsed.error.issues[0]?.message || 'Invalid grading scheme payload',
            details: parsed.error.format(),
          },
        });
      }

      const scheme = await gradingService.createGradingScheme(req.user!.id, parsed.data);
      res.status(201).json(scheme);
    } catch (err: any) {
      this.handleError(res, err);
    }
  }

  async updateGradingScheme(req: Request, res: Response) {
    try {
      const schemeId = Array.isArray(req.params.schemeId) ? req.params.schemeId[0] : req.params.schemeId;
      const parsed = UpdateGradingSchemeInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: parsed.error.issues[0]?.message || 'Invalid update payload',
            details: parsed.error.format(),
          },
        });
      }

      const scheme = await gradingService.updateGradingScheme(req.user!.id, schemeId, parsed.data);
      res.json(scheme);
    } catch (err: any) {
      this.handleError(res, err);
    }
  }

  async deleteGradingScheme(req: Request, res: Response) {
    try {
      const schemeId = Array.isArray(req.params.schemeId) ? req.params.schemeId[0] : req.params.schemeId;
      await gradingService.deleteGradingScheme(req.user!.id, schemeId);
      res.status(204).send();
    } catch (err: any) {
      this.handleError(res, err);
    }
  }

  async getSubjectGrade(req: Request, res: Response) {
    try {
      const subjectId = Array.isArray(req.params.subjectId) ? req.params.subjectId[0] : req.params.subjectId;
      const grade = await gradingService.computeSubjectGrade(req.user!.id, subjectId);
      res.json(grade);
    } catch (err: any) {
      this.handleError(res, err);
    }
  }

  async getPeriodGpa(req: Request, res: Response) {
    try {
      const periodId = Array.isArray(req.params.periodId) ? req.params.periodId[0] : req.params.periodId;
      const gpa = await gradingService.computePeriodGpa(req.user!.id, periodId);
      res.json(gpa);
    } catch (err: any) {
      this.handleError(res, err);
    }
  }

  private handleError(res: Response, err: any) {
    if (err instanceof GradingServiceError) {
      return res.status(err.statusCode).json({
        error: { code: err.code, message: err.message },
      });
    }
    console.error('GradingController error:', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected grading error occurred' },
    });
  }
}

export const gradingController = new GradingController();