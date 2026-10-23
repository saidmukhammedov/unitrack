import { Router } from 'express';
import { academicController } from '../controllers/academic.controller';
import { requireAuth } from '../middleware/auth';
import { idempotencyMiddleware } from '../middleware/idempotency';

const periodsRouter = Router();
periodsRouter.use(requireAuth);
periodsRouter.get('/', academicController.getPeriods);
periodsRouter.post('/', academicController.createPeriod);
periodsRouter.get('/:periodId', academicController.getPeriodById);
periodsRouter.patch('/:periodId', academicController.updatePeriod);
periodsRouter.delete('/:periodId', academicController.deletePeriod);

// Nested subjects under periods
periodsRouter.get('/:periodId/subjects', academicController.getSubjectsByPeriod);
periodsRouter.post('/:periodId/subjects', academicController.createSubject);

const subjectsRouter = Router();
subjectsRouter.use(requireAuth);
subjectsRouter.get('/:subjectId', academicController.getSubjectById);
subjectsRouter.patch('/:subjectId', academicController.updateSubject);
subjectsRouter.delete('/:subjectId', academicController.deleteSubject);

const timetableRouter = Router();
timetableRouter.use(requireAuth);
timetableRouter.get('/', academicController.getTimetable);
timetableRouter.post('/', academicController.createClassSession);
timetableRouter.patch('/:sessionId', academicController.updateClassSession);
timetableRouter.delete('/:sessionId', academicController.deleteClassSession);

const tasksRouter = Router();
tasksRouter.use(requireAuth);
tasksRouter.get('/', academicController.getTasks);
tasksRouter.post('/', idempotencyMiddleware, academicController.createTask);
tasksRouter.get('/:taskId', academicController.getTaskById);
tasksRouter.patch('/:taskId', academicController.updateTask);
tasksRouter.delete('/:taskId', academicController.deleteTask);

const assessmentsRouter = Router();
assessmentsRouter.use(requireAuth);
assessmentsRouter.get('/', academicController.getAssessments);
assessmentsRouter.post('/', idempotencyMiddleware, academicController.createAssessment);
assessmentsRouter.get('/:assessmentId', academicController.getAssessmentById);
assessmentsRouter.patch('/:assessmentId', academicController.updateAssessment);
assessmentsRouter.delete('/:assessmentId', academicController.deleteAssessment);

const dashboardRouter = Router();
dashboardRouter.use(requireAuth);
dashboardRouter.get('/', academicController.getDashboard);

export {
  periodsRouter,
  subjectsRouter,
  timetableRouter,
  tasksRouter,
  assessmentsRouter,
  dashboardRouter,
};
