import { prisma } from '../lib/prisma';
import type {
  BatchSyncRequest,
  BatchSyncResponse,
  SyncConflict,
  Task,
  ScheduleCommitment,
  Habit,
  Goal,
  WeeklyReview,
} from '@unitrack/contracts';
import { goalsService } from './goals.service';
import { habitService } from './habit.service';
import { commitmentService } from './commitment.service';
import { academicService } from './academic.service';
import { reviewsService } from './reviews.service';

export const syncService = {
  async processBatchSync(userId: string, request: BatchSyncRequest): Promise<BatchSyncResponse> {
    const serverTimestamp = new Date().toISOString();
    const processedMutationIds: string[] = [];
    const conflicts: SyncConflict[] = [];

    // 1. Process client mutations in order
    for (const mutation of request.mutations) {
      try {
        switch (mutation.entityType) {
          case 'TASK': {
            if (mutation.action === 'CREATE') {
              await academicService.createTask(userId, mutation.payload as any);
              processedMutationIds.push(mutation.clientMutationId);
            } else if (mutation.action === 'UPDATE') {
              await academicService.updateTask(userId, mutation.entityId, {
                ...mutation.payload,
                version: mutation.version,
              } as any);
              processedMutationIds.push(mutation.clientMutationId);
            } else if (mutation.action === 'DELETE') {
              await academicService.deleteTask(userId, mutation.entityId);
              processedMutationIds.push(mutation.clientMutationId);
            }
            break;
          }

          case 'COMMITMENT': {
            if (mutation.action === 'CREATE') {
              await commitmentService.createCommitment(userId, mutation.payload as any);
              processedMutationIds.push(mutation.clientMutationId);
            } else if (mutation.action === 'UPDATE') {
              await commitmentService.updateCommitment(userId, mutation.entityId, {
                ...mutation.payload,
                version: mutation.version,
              } as any);
              processedMutationIds.push(mutation.clientMutationId);
            } else if (mutation.action === 'DELETE') {
              await commitmentService.deleteCommitment(userId, mutation.entityId);
              processedMutationIds.push(mutation.clientMutationId);
            }
            break;
          }

          case 'HABIT': {
            if (mutation.action === 'CREATE') {
              await habitService.createHabit(userId, mutation.payload as any);
              processedMutationIds.push(mutation.clientMutationId);
            } else if (mutation.action === 'UPDATE') {
              await habitService.updateHabit(userId, mutation.entityId, {
                ...mutation.payload,
                version: mutation.version,
              } as any);
              processedMutationIds.push(mutation.clientMutationId);
            } else if (mutation.action === 'DELETE') {
              await habitService.deleteHabit(userId, mutation.entityId);
              processedMutationIds.push(mutation.clientMutationId);
            }
            break;
          }

          case 'HABIT_LOG': {
            if (mutation.action === 'CREATE' || mutation.action === 'UPDATE') {
              await habitService.logHabitOccurrence(userId, mutation.entityId, mutation.payload as any);
              processedMutationIds.push(mutation.clientMutationId);
            }
            break;
          }

          case 'GOAL': {
            if (mutation.action === 'CREATE') {
              await goalsService.createGoal(userId, mutation.payload as any);
              processedMutationIds.push(mutation.clientMutationId);
            } else if (mutation.action === 'UPDATE') {
              await goalsService.updateGoal(userId, mutation.entityId, {
                ...mutation.payload,
                version: mutation.version,
              } as any);
              processedMutationIds.push(mutation.clientMutationId);
            } else if (mutation.action === 'DELETE') {
              await goalsService.deleteGoal(userId, mutation.entityId);
              processedMutationIds.push(mutation.clientMutationId);
            }
            break;
          }

          case 'WEEKLY_REVIEW': {
            if (mutation.action === 'CREATE' || mutation.action === 'UPDATE') {
              await reviewsService.saveWeeklyReview(userId, mutation.payload as any);
              processedMutationIds.push(mutation.clientMutationId);
            }
            break;
          }

          default:
            processedMutationIds.push(mutation.clientMutationId);
        }
      } catch (err: any) {
        conflicts.push({
          clientMutationId: mutation.clientMutationId,
          entityType: mutation.entityType,
          entityId: mutation.entityId,
          error: err.message || 'Mutation failed',
        });
      }
    }

    // 2. Fetch server changes since lastSyncTimestamp (or all active if none provided)
    const [tasksRes, commitmentsRes, habitsRes, goalsRes, reviewsRes] = await Promise.all([
      academicService.getTasks(userId, { limit: 100 }),
      commitmentService.getCommitments(userId),
      habitService.getHabits(userId),
      goalsService.getGoals(userId),
      reviewsService.getWeeklyReviews(userId),
    ]);

    return {
      serverTimestamp,
      processedMutationIds,
      conflicts,
      changes: {
        tasks: tasksRes.data,
        commitments: commitmentsRes.data,
        habits: habitsRes.data,
        goals: goalsRes.data,
        weeklyReviews: reviewsRes.data,
      },
    };
  },
};
