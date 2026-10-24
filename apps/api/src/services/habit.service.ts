import { prisma } from '../lib/prisma';
import { AuthError } from './auth.service';
import type {
  Habit,
  CreateHabitInput,
  UpdateHabitInput,
  HabitLog,
  LogHabitOccurrenceInput,
} from '@unitrack/contracts';

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function parseDateOnly(str: string): Date {
  return new Date(`${str}T00:00:00.000Z`);
}

/**
 * Get ISO week identifier 'YYYY-Www' for a date
 */
function getIsoWeekKey(d: Date): string {
  const target = new Date(d.valueOf());
  const dayNr = (d.getUTCDay() + 6) % 7; // Monday = 0, Sunday = 6
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return `${target.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

/**
 * Deterministic streak calculation based on frequency rules and saved logs.
 */
export function calculateHabitStreaks(
  habit: {
    frequencyType: 'DAILY' | 'SELECTED_WEEKDAYS' | 'WEEKLY_TARGET';
    selectedWeekdays: number[];
    targetPerWeek: number | null;
  },
  logs: Array<{ date: Date; status: 'COMPLETED' | 'SKIPPED' | 'MISSED' }>,
  referenceDate: Date = new Date()
): { currentStreak: number; longestStreak: number } {
  if (logs.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Sort logs by date ascending
  const sortedLogs = [...logs].sort((a, b) => a.date.getTime() - b.date.getTime());
  const logMap = new Map<string, 'COMPLETED' | 'SKIPPED' | 'MISSED'>();
  for (const log of sortedLogs) {
    logMap.set(formatDate(log.date), log.status);
  }

  const todayStr = formatDate(referenceDate);
  const todayDate = parseDateOnly(todayStr);

  if (habit.frequencyType === 'DAILY') {
    // Traverse backwards from today
    let checkDate = new Date(todayDate.getTime());
    const todayStatus = logMap.get(todayStr);

    // If today is not logged yet, start checking from yesterday without breaking streak
    if (!todayStatus) {
      checkDate.setUTCDate(checkDate.getUTCDate() - 1);
    }

    let currentStreak = 0;
    let longestStreak = 0;

    // Calculate current streak backwards
    let iterDate = new Date(checkDate.getTime());
    while (true) {
      const key = formatDate(iterDate);
      const st = logMap.get(key);

      if (st === 'COMPLETED') {
        currentStreak++;
      } else if (st === 'SKIPPED') {
        // Skipped forgives the day without breaking, does not increment
      } else {
        // Missed or no log breaks current streak
        break;
      }
      iterDate.setUTCDate(iterDate.getUTCDate() - 1);
      // Safety limit: 10 years
      if (currentStreak > 3650) break;
    }

    // Calculate longest streak forwards across all logs
    let runningStreak = 0;
    if (sortedLogs.length > 0) {
      const firstDate = new Date(sortedLogs[0].date.getTime());
      let scanDate = new Date(firstDate.getTime());

      while (scanDate <= todayDate) {
        const key = formatDate(scanDate);
        const st = logMap.get(key);

        if (st === 'COMPLETED') {
          runningStreak++;
          if (runningStreak > longestStreak) {
            longestStreak = runningStreak;
          }
        } else if (st === 'SKIPPED') {
          // preserve running streak
        } else {
          runningStreak = 0;
        }
        scanDate.setUTCDate(scanDate.getUTCDate() + 1);
      }
    }

    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }

    return { currentStreak, longestStreak };
  }

  if (habit.frequencyType === 'SELECTED_WEEKDAYS') {
    const scheduledDays = new Set(habit.selectedWeekdays);
    if (scheduledDays.size === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    let checkDate = new Date(todayDate.getTime());
    const todayWeekday = checkDate.getUTCDay();
    const todayStatus = logMap.get(todayStr);

    // If today is not scheduled or scheduled but not yet logged, start from previous scheduled day
    if (!scheduledDays.has(todayWeekday) || !todayStatus) {
      checkDate.setUTCDate(checkDate.getUTCDate() - 1);
    }

    let currentStreak = 0;
    let iterDate = new Date(checkDate.getTime());

    while (true) {
      const w = iterDate.getUTCDay();
      if (scheduledDays.has(w)) {
        const key = formatDate(iterDate);
        const st = logMap.get(key);
        if (st === 'COMPLETED') {
          currentStreak++;
        } else if (st === 'SKIPPED') {
          // forgiven
        } else {
          break;
        }
      }
      iterDate.setUTCDate(iterDate.getUTCDate() - 1);
      if (currentStreak > 3650) break;
    }

    // Longest streak
    let longestStreak = currentStreak;
    let runningStreak = 0;
    if (sortedLogs.length > 0) {
      let scanDate = new Date(sortedLogs[0].date.getTime());
      while (scanDate <= todayDate) {
        const w = scanDate.getUTCDay();
        if (scheduledDays.has(w)) {
          const key = formatDate(scanDate);
          const st = logMap.get(key);
          if (st === 'COMPLETED') {
            runningStreak++;
            if (runningStreak > longestStreak) {
              longestStreak = runningStreak;
            }
          } else if (st === 'SKIPPED') {
            // forgiven
          } else {
            runningStreak = 0;
          }
        }
        scanDate.setUTCDate(scanDate.getUTCDate() + 1);
      }
    }

    return { currentStreak, longestStreak: Math.max(longestStreak, currentStreak) };
  }

  if (habit.frequencyType === 'WEEKLY_TARGET') {
    const target = habit.targetPerWeek || 1;

    // Group logs by ISO week
    const weekMap = new Map<string, number>();
    for (const l of sortedLogs) {
      if (l.status === 'COMPLETED') {
        const weekKey = getIsoWeekKey(l.date);
        weekMap.set(weekKey, (weekMap.get(weekKey) || 0) + 1);
      }
    }

    const currentWeekKey = getIsoWeekKey(todayDate);
    const currentWeekCompleted = weekMap.get(currentWeekKey) || 0;

    // Traverse weeks backward
    let checkWeekDate = new Date(todayDate.getTime());
    let currentStreak = 0;

    // If current week already reached target, count it
    if (currentWeekCompleted >= target) {
      currentStreak++;
      checkWeekDate.setUTCDate(checkWeekDate.getUTCDate() - 7);
    } else {
      // Current week is in progress, check previous week
      checkWeekDate.setUTCDate(checkWeekDate.getUTCDate() - 7);
    }

    while (true) {
      const weekKey = getIsoWeekKey(checkWeekDate);
      const count = weekMap.get(weekKey) || 0;
      if (count >= target) {
        currentStreak++;
        checkWeekDate.setUTCDate(checkWeekDate.getUTCDate() - 7);
      } else {
        break;
      }
      if (currentStreak > 520) break;
    }

    // Longest streak across weeks
    let longestStreak = currentStreak;
    let runningStreak = 0;
    if (sortedLogs.length > 0) {
      let scanWeekDate = new Date(sortedLogs[0].date.getTime());
      while (scanWeekDate <= todayDate) {
        const weekKey = getIsoWeekKey(scanWeekDate);
        const count = weekMap.get(weekKey) || 0;
        if (count >= target) {
          runningStreak++;
          if (runningStreak > longestStreak) {
            longestStreak = runningStreak;
          }
        } else {
          // If this is the current week, don't reset to 0 yet
          if (weekKey !== currentWeekKey) {
            runningStreak = 0;
          }
        }
        scanWeekDate.setUTCDate(scanWeekDate.getUTCDate() + 7);
      }
    }

    return { currentStreak, longestStreak: Math.max(longestStreak, currentStreak) };
  }

  return { currentStreak: 0, longestStreak: 0 };
}

export const habitService = {
  /**
   * List non-archived habits for user
   */
  async getHabits(userId: string): Promise<{ data: Habit[] }> {
    const habits = await prisma.habit.findMany({
      where: { userId, isArchived: false },
      include: {
        context: { select: { name: true, colorHex: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: habits.map((h) => ({
        id: h.id,
        title: h.title,
        contextId: h.contextId,
        contextName: h.context?.name || null,
        contextColor: h.context?.colorHex || null,
        frequencyType: h.frequencyType,
        selectedWeekdays: h.selectedWeekdays,
        targetPerWeek: h.targetPerWeek,
        targetUnits: h.targetUnits,
        unitLabel: h.unitLabel,
        currentStreak: h.currentStreak,
        longestStreak: h.longestStreak,
        isArchived: h.isArchived,
        version: h.version,
        createdAt: h.createdAt.toISOString(),
        updatedAt: h.updatedAt.toISOString(),
      })),
    };
  },

  /**
   * Create a new habit
   */
  async createHabit(userId: string, input: CreateHabitInput): Promise<Habit> {
    if (input.contextId) {
      const context = await prisma.context.findFirst({
        where: { id: input.contextId, userId },
      });
      if (!context) {
        throw new AuthError(404, 'CONTEXT_NOT_FOUND', 'Context not found.');
      }
    }

    const habit = await prisma.habit.create({
      data: {
        userId,
        contextId: input.contextId || null,
        title: input.title,
        frequencyType: input.frequencyType || 'DAILY',
        selectedWeekdays: input.selectedWeekdays || [],
        targetPerWeek: input.targetPerWeek || null,
        targetUnits: input.targetUnits || 1,
        unitLabel: input.unitLabel || null,
      },
      include: {
        context: { select: { name: true, colorHex: true } },
      },
    });

    return {
      id: habit.id,
      title: habit.title,
      contextId: habit.contextId,
      contextName: habit.context?.name || null,
      contextColor: habit.context?.colorHex || null,
      frequencyType: habit.frequencyType,
      selectedWeekdays: habit.selectedWeekdays,
      targetPerWeek: habit.targetPerWeek,
      targetUnits: habit.targetUnits,
      unitLabel: habit.unitLabel,
      currentStreak: habit.currentStreak,
      longestStreak: habit.longestStreak,
      isArchived: habit.isArchived,
      version: habit.version,
      createdAt: habit.createdAt.toISOString(),
      updatedAt: habit.updatedAt.toISOString(),
    };
  },

  /**
   * Update habit with OCC check
   */
  async updateHabit(userId: string, habitId: string, input: UpdateHabitInput): Promise<Habit> {
    const existing = await prisma.habit.findFirst({
      where: { id: habitId, userId },
    });

    if (!existing) {
      throw new AuthError(404, 'HABIT_NOT_FOUND', 'Habit not found.');
    }

    if (input.version !== undefined && input.version !== existing.version) {
      throw new AuthError(409, 'VERSION_CONFLICT', 'Record was modified concurrently.');
    }

    if (input.contextId) {
      const context = await prisma.context.findFirst({
        where: { id: input.contextId, userId },
      });
      if (!context) {
        throw new AuthError(404, 'CONTEXT_NOT_FOUND', 'Context not found.');
      }
    }

    const updated = await prisma.habit.update({
      where: { id: habitId },
      data: {
        ...(input.title && { title: input.title }),
        ...(input.contextId !== undefined && { contextId: input.contextId }),
        ...(input.frequencyType && { frequencyType: input.frequencyType }),
        ...(input.selectedWeekdays && { selectedWeekdays: input.selectedWeekdays }),
        ...(input.targetPerWeek !== undefined && { targetPerWeek: input.targetPerWeek }),
        ...(input.targetUnits !== undefined && { targetUnits: input.targetUnits }),
        ...(input.unitLabel !== undefined && { unitLabel: input.unitLabel }),
        ...(input.isArchived !== undefined && { isArchived: input.isArchived }),
        version: { increment: 1 },
      },
      include: {
        context: { select: { name: true, colorHex: true } },
      },
    });

    return {
      id: updated.id,
      title: updated.title,
      contextId: updated.contextId,
      contextName: updated.context?.name || null,
      contextColor: updated.context?.colorHex || null,
      frequencyType: updated.frequencyType,
      selectedWeekdays: updated.selectedWeekdays,
      targetPerWeek: updated.targetPerWeek,
      targetUnits: updated.targetUnits,
      unitLabel: updated.unitLabel,
      currentStreak: updated.currentStreak,
      longestStreak: updated.longestStreak,
      isArchived: updated.isArchived,
      version: updated.version,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  },

  /**
   * Delete habit
   */
  async deleteHabit(userId: string, habitId: string): Promise<void> {
    const existing = await prisma.habit.findFirst({
      where: { id: habitId, userId },
    });

    if (!existing) {
      throw new AuthError(404, 'HABIT_NOT_FOUND', 'Habit not found.');
    }

    await prisma.habit.delete({
      where: { id: habitId },
    });
  },

  /**
   * Record or update occurrence log for a habit (supports backdated entries)
   * Automatically recalculates streaks and saves them to the Habit record.
   */
  async logHabitOccurrence(
    userId: string,
    habitId: string,
    input: LogHabitOccurrenceInput
  ): Promise<HabitLog> {
    const habit = await prisma.habit.findFirst({
      where: { id: habitId, userId },
    });

    if (!habit) {
      throw new AuthError(404, 'HABIT_NOT_FOUND', 'Habit not found.');
    }

    const logDate = parseDateOnly(input.date);

    const log = await prisma.habitLog.upsert({
      where: {
        habitId_date: {
          habitId,
          date: logDate,
        },
      },
      update: {
        status: input.status,
        completedUnits: input.completedUnits,
        notes: input.notes !== undefined ? input.notes : undefined,
      },
      create: {
        userId,
        habitId,
        date: logDate,
        status: input.status,
        completedUnits: input.completedUnits,
        notes: input.notes || null,
      },
    });

    // Fetch all logs to recalculate streaks deterministically
    const allLogs = await prisma.habitLog.findMany({
      where: { habitId },
      select: { date: true, status: true },
    });

    const { currentStreak, longestStreak } = calculateHabitStreaks(
      {
        frequencyType: habit.frequencyType,
        selectedWeekdays: habit.selectedWeekdays,
        targetPerWeek: habit.targetPerWeek,
      },
      allLogs
    );

    await prisma.habit.update({
      where: { id: habitId },
      data: {
        currentStreak,
        longestStreak: Math.max(longestStreak, habit.longestStreak),
      },
    });

    return {
      id: log.id,
      habitId: log.habitId,
      date: formatDate(log.date),
      status: log.status,
      completedUnits: log.completedUnits,
      notes: log.notes,
      createdAt: log.createdAt.toISOString(),
      updatedAt: log.updatedAt.toISOString(),
    };
  },
};
