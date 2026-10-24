import { prisma } from '../lib/prisma';
import { AuthError } from './auth.service';
import type {
  WeeklyReview,
  SaveWeeklyReviewInput,
  WeeklyReviewMetrics,
} from '@unitrack/contracts';

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function parseDateOnly(str: string): Date {
  return new Date(`${str}T00:00:00.000Z`);
}

function getWeekNumberAndYear(d: Date): { weekNumber: number; year: number } {
  const target = new Date(d.valueOf());
  const dayNr = (d.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return { weekNumber, year: target.getUTCFullYear() };
}

export const reviewsService = {
  async getWeeklyReviews(userId: string): Promise<{ data: WeeklyReview[] }> {
    const reviews = await prisma.weeklyReview.findMany({
      where: { userId },
      orderBy: { weekStart: 'desc' },
    });

    return {
      data: reviews.map((r) => ({
        id: r.id,
        weekStart: formatDate(r.weekStart),
        weekEnd: formatDate(r.weekEnd),
        weekNumber: r.weekNumber,
        year: r.year,
        reflections: {
          whatWentWell: r.whatWentWell,
          whatToImprove: r.whatToImprove,
          keyTakeaways: r.keyTakeaways,
        },
        intentions: r.intentions,
        metrics: {
          commitmentsAttended: r.commitmentsAttended,
          tasksCompleted: r.tasksCompleted,
          habitCompletions: r.habitCompletions,
        },
        version: r.version,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    };
  },

  async getReviewForWeek(userId: string, weekStartStr: string): Promise<WeeklyReview> {
    const weekStart = parseDateOnly(weekStartStr);
    const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
    const endOfWeekTime = new Date(weekEnd.getTime() + 24 * 60 * 60 * 1000 - 1);
    const { weekNumber, year } = getWeekNumberAndYear(weekStart);

    // Compute live metrics for this date range
    const [commitmentsAttended, tasksCompleted, habitCompletions] = await Promise.all([
      prisma.commitmentLog.count({
        where: {
          userId,
          status: 'ATTENDED',
          date: { gte: weekStart, lte: weekEnd },
        },
      }),
      prisma.task.count({
        where: {
          userId,
          status: 'COMPLETED',
          completedAt: { gte: weekStart, lte: endOfWeekTime },
        },
      }),
      prisma.habitLog.count({
        where: {
          userId,
          status: 'COMPLETED',
          date: { gte: weekStart, lte: weekEnd },
        },
      }),
    ]);

    const existing = await prisma.weeklyReview.findUnique({
      where: {
        userId_weekStart: {
          userId,
          weekStart,
        },
      },
    });

    if (existing) {
      // Update metrics snapshot
      const updated = await prisma.weeklyReview.update({
        where: { id: existing.id },
        data: {
          commitmentsAttended,
          tasksCompleted,
          habitCompletions,
        },
      });

      return {
        id: updated.id,
        weekStart: formatDate(updated.weekStart),
        weekEnd: formatDate(updated.weekEnd),
        weekNumber: updated.weekNumber,
        year: updated.year,
        reflections: {
          whatWentWell: updated.whatWentWell,
          whatToImprove: updated.whatToImprove,
          keyTakeaways: updated.keyTakeaways,
        },
        intentions: updated.intentions,
        metrics: {
          commitmentsAttended,
          tasksCompleted,
          habitCompletions,
        },
        version: updated.version,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    }

    // Return unsaved draft
    return {
      id: 'draft',
      weekStart: formatDate(weekStart),
      weekEnd: formatDate(weekEnd),
      weekNumber,
      year,
      reflections: {
        whatWentWell: '',
        whatToImprove: '',
        keyTakeaways: '',
      },
      intentions: [],
      metrics: {
        commitmentsAttended,
        tasksCompleted,
        habitCompletions,
      },
      version: 1,
      createdAt: new Date().toISOString(),
    };
  },

  async saveWeeklyReview(userId: string, input: SaveWeeklyReviewInput): Promise<WeeklyReview> {
    const weekStart = parseDateOnly(input.weekStart);
    const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
    const endOfWeekTime = new Date(weekEnd.getTime() + 24 * 60 * 60 * 1000 - 1);
    const { weekNumber, year } = getWeekNumberAndYear(weekStart);

    // Compute live metrics snapshot
    const [commitmentsAttended, tasksCompleted, habitCompletions] = await Promise.all([
      prisma.commitmentLog.count({
        where: {
          userId,
          status: 'ATTENDED',
          date: { gte: weekStart, lte: weekEnd },
        },
      }),
      prisma.task.count({
        where: {
          userId,
          status: 'COMPLETED',
          completedAt: { gte: weekStart, lte: endOfWeekTime },
        },
      }),
      prisma.habitLog.count({
        where: {
          userId,
          status: 'COMPLETED',
          date: { gte: weekStart, lte: weekEnd },
        },
      }),
    ]);

    const review = await prisma.weeklyReview.upsert({
      where: {
        userId_weekStart: {
          userId,
          weekStart,
        },
      },
      update: {
        ...(input.reflections?.whatWentWell !== undefined && {
          whatWentWell: input.reflections.whatWentWell,
        }),
        ...(input.reflections?.whatToImprove !== undefined && {
          whatToImprove: input.reflections.whatToImprove,
        }),
        ...(input.reflections?.keyTakeaways !== undefined && {
          keyTakeaways: input.reflections.keyTakeaways,
        }),
        ...(input.intentions !== undefined && { intentions: input.intentions }),
        commitmentsAttended,
        tasksCompleted,
        habitCompletions,
        version: { increment: 1 },
      },
      create: {
        userId,
        weekStart,
        weekEnd,
        weekNumber,
        year,
        whatWentWell: input.reflections?.whatWentWell || '',
        whatToImprove: input.reflections?.whatToImprove || '',
        keyTakeaways: input.reflections?.keyTakeaways || '',
        intentions: input.intentions || [],
        commitmentsAttended,
        tasksCompleted,
        habitCompletions,
      },
    });

    return {
      id: review.id,
      weekStart: formatDate(review.weekStart),
      weekEnd: formatDate(review.weekEnd),
      weekNumber: review.weekNumber,
      year: review.year,
      reflections: {
        whatWentWell: review.whatWentWell,
        whatToImprove: review.whatToImprove,
        keyTakeaways: review.keyTakeaways,
      },
      intentions: review.intentions,
      metrics: {
        commitmentsAttended: review.commitmentsAttended,
        tasksCompleted: review.tasksCompleted,
        habitCompletions: review.habitCompletions,
      },
      version: review.version,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
    };
  },
};
