import { Router } from 'express';
import { productivityController } from '../controllers/productivity.controller';
import { requireAuth } from '../middleware/auth';
import { idempotencyMiddleware } from '../middleware/idempotency';

// 1. Contexts Router
export const contextsRouter = Router();
contextsRouter.use(requireAuth);
contextsRouter.get('/', productivityController.getContexts);
contextsRouter.post('/', idempotencyMiddleware, productivityController.createContext);
contextsRouter.patch('/:id', productivityController.updateContext);
contextsRouter.delete('/:id', productivityController.deleteContext);

// 2. Commitments Router
export const commitmentsRouter = Router();
commitmentsRouter.use(requireAuth);
commitmentsRouter.get('/', productivityController.getCommitments);
commitmentsRouter.post('/', idempotencyMiddleware, productivityController.createCommitment);
commitmentsRouter.patch('/:id', productivityController.updateCommitment);
commitmentsRouter.delete('/:id', productivityController.deleteCommitment);
commitmentsRouter.post('/:id/occurrences/:date', productivityController.logCommitmentOccurrence);

// 3. Habits Router
export const habitsRouter = Router();
habitsRouter.use(requireAuth);
habitsRouter.get('/', productivityController.getHabits);
habitsRouter.post('/', idempotencyMiddleware, productivityController.createHabit);
habitsRouter.patch('/:id', productivityController.updateHabit);
habitsRouter.delete('/:id', productivityController.deleteHabit);
habitsRouter.post('/:id/logs', productivityController.logHabitOccurrence);

// 4. Today Stream Router (The Chronicle Core)
export const todayRouter = Router();
todayRouter.use(requireAuth);
todayRouter.get('/', productivityController.getToday);

// 5. Goals & Milestones Router
export const goalsRouter = Router();
goalsRouter.use(requireAuth);
goalsRouter.get('/', productivityController.getGoals);
goalsRouter.post('/', idempotencyMiddleware, productivityController.createGoal);
goalsRouter.get('/:id', productivityController.getGoalById);
goalsRouter.patch('/:id', productivityController.updateGoal);
goalsRouter.delete('/:id', productivityController.deleteGoal);
goalsRouter.post('/:id/milestones', productivityController.createMilestone);
goalsRouter.patch('/:id/milestones/:milestoneId', productivityController.updateMilestone);
goalsRouter.delete('/:id/milestones/:milestoneId', productivityController.deleteMilestone);

// 6. Weekly Planning & Reviews Router
export const reviewsRouter = Router();
reviewsRouter.use(requireAuth);
reviewsRouter.get('/', productivityController.getWeeklyReviews);
reviewsRouter.get('/:weekStart', productivityController.getReviewForWeek);
reviewsRouter.post('/', idempotencyMiddleware, productivityController.saveWeeklyReview);

// 7. Offline Sync Router
export const syncRouter = Router();
syncRouter.use(requireAuth);
syncRouter.post('/', productivityController.batchSync);

