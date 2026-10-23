import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { gradingController } from '../controllers/grading.controller';

export const gradingRoutes = Router();

// Grading Schemes CRUD
gradingRoutes.get('/grading-schemes', requireAuth, (req, res) => gradingController.listGradingSchemes(req, res));
gradingRoutes.post('/grading-schemes', requireAuth, (req, res) => gradingController.createGradingScheme(req, res));
gradingRoutes.get('/grading-schemes/:schemeId', requireAuth, (req, res) => gradingController.getGradingScheme(req, res));
gradingRoutes.patch('/grading-schemes/:schemeId', requireAuth, (req, res) => gradingController.updateGradingScheme(req, res));
gradingRoutes.delete('/grading-schemes/:schemeId', requireAuth, (req, res) => gradingController.deleteGradingScheme(req, res));

// Computed Grades & GPA
gradingRoutes.get('/subjects/:subjectId/grade', requireAuth, (req, res) => gradingController.getSubjectGrade(req, res));
gradingRoutes.get('/periods/:periodId/gpa', requireAuth, (req, res) => gradingController.getPeriodGpa(req, res));
