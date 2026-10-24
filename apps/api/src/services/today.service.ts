import { prisma } from '../lib/prisma';
import { contextService } from './context.service';
import type {
  TodayResponse,
  TodayCommitmentItem,
  TodayHabitItem,
  Task,
} from '@unitrack/contracts';

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function parseDateOnly(str: string): Date {
  return new Date(`${str}T00:00:00.000Z`);
}

function formatTime(d: Date): string {
  const hours = d.getUTCHours().toString().padStart(2, '0');
  const minutes = d.getUTCMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export const todayService = {
  async getTodayView(
    userId: string,
    targetDateStr?: string,
    userTimezone: string = 'UTC'
  ): Promise<TodayResponse> {
    const todayStr = targetDateStr || formatDate(new Date());
    const targetDate = parseDateOnly(todayStr);
    const dayOfWeek = targetDate.getUTCDay(); // 0 = Sunday, 1 = Monday ... 6 = Saturday

    // 1. Ensure contexts exist (seed if user has none)
    const contexts = await contextService.getContexts(userId);

    // 2. Fetch Universal Commitments for this date
    // One-off for this date OR recurring on this weekday within effective range
    const universalCommitments = await prisma.scheduleCommitment.findMany({
      where: {
        userId,
        isArchived: false,
        OR: [
          {
            isRecurring: false,
            specificDate: targetDate,
          },
          {
            isRecurring: true,
            weekday: dayOfWeek,
            effectiveFrom: { lte: targetDate },
            OR: [
              { effectiveTo: null },
              { effectiveTo: { gte: targetDate } },
            ],
          },
        ],
      },
      include: {
        context: { select: { name: true, colorHex: true } },
        logs: {
          where: { date: targetDate },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    const universalItems: TodayCommitmentItem[] = universalCommitments.map((c) => {
      const log = c.logs[0];
      const status = log ? log.status : 'SCHEDULED';
      const startTime = log?.rescheduledStartTime
        ? formatTime(log.rescheduledStartTime)
        : formatTime(c.startTime);
      const endTime = log?.rescheduledEndTime
        ? formatTime(log.rescheduledEndTime)
        : formatTime(c.endTime);

      return {
        id: c.id,
        title: c.title,
        location: c.location,
        contextId: c.contextId,
        contextName: c.context?.name || null,
        contextColor: c.context?.colorHex || null,
        startTime,
        endTime,
        isOvernight: c.isOvernight,
        status,
        source: 'UNIVERSAL',
        notes: log?.notes || null,
      };
    });

    // 3. Fetch Academic ClassSessions for this weekday
    const academicSessions = await prisma.classSession.findMany({
      where: {
        userId,
        weekday: dayOfWeek,
        effectiveFrom: { lte: targetDate },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: targetDate } },
        ],
        period: {
          isArchived: false,
        },
      },
      include: {
        subject: { select: { name: true, colorHex: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    const academicItems: TodayCommitmentItem[] = academicSessions.map((s) => ({
      id: s.id,
      title: s.subject.name,
      location: s.location,
      contextId: null,
      contextName: 'Academic',
      contextColor: s.subject.colorHex || '#4A90D9',
      startTime: formatTime(s.startTime),
      endTime: formatTime(s.endTime),
      isOvernight: false,
      status: 'SCHEDULED',
      source: 'ACADEMIC',
      notes: null,
    }));

    // Combine commitments and sort chronologically
    const allCommitments = [...universalItems, ...academicItems].sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );

    // 4. Fetch Tasks for Today (due today, overdue pending, or completed today)
    const endOfDay = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000 - 1);
    const startOfDay = targetDate;

    const tasksRaw = await prisma.task.findMany({
      where: {
        userId,
        OR: [
          // Pending tasks due on or before today
          {
            status: { in: ['PENDING', 'POSTPONED'] },
            OR: [
              { dueAt: { lte: endOfDay } },
              { dueAt: null }, // General unassigned tasks
            ],
          },
          // Tasks completed today
          {
            status: 'COMPLETED',
            completedAt: { gte: startOfDay, lte: endOfDay },
          },
        ],
      },
      include: {
        subject: { select: { name: true, colorHex: true } },
        context: { select: { name: true, colorHex: true } },
      },
      orderBy: [
        { priority: 'desc' },
        { dueAt: 'asc' },
        { createdAt: 'desc' },
      ],
      take: 20,
    });

    const priorityOrder: Record<string, number> = {
      URGENT: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };

    const tasks: Task[] = tasksRaw
      .map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        taskType: t.taskType as any,
        status: t.status,
        priority: t.priority,
        contextId: t.contextId,
        contextName: t.context?.name || null,
        contextColor: t.context?.colorHex || null,
        subjectId: t.subjectId,
        subjectName: t.subject?.name || null,
        subjectColor: t.subject?.colorHex || null,
        periodId: t.periodId,
        dueAt: t.dueAt ? t.dueAt.toISOString() : null,
        completedAt: t.completedAt ? t.completedAt.toISOString() : null,
        isCompleted: t.status === 'COMPLETED',
        postponedCount: t.postponedCount,
        estimatedMinutes: t.estimatedMinutes,
        version: t.version,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      }))
      .sort((a, b) => {
        // Active tasks first, then by priority desc
        if (a.isCompleted !== b.isCompleted) {
          return a.isCompleted ? 1 : -1;
        }
        const prioA = priorityOrder[a.priority] || 2;
        const prioB = priorityOrder[b.priority] || 2;
        return prioB - prioA;
      });

    // 5. Fetch Habits & Today's logs
    const habitsRaw = await prisma.habit.findMany({
      where: { userId, isArchived: false },
      include: {
        context: { select: { name: true, colorHex: true } },
        logs: {
          where: { date: targetDate },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const habits: TodayHabitItem[] = habitsRaw.map((h) => {
      const todayLogRaw = h.logs[0];
      const todayLog = todayLogRaw
        ? {
            id: todayLogRaw.id,
            habitId: todayLogRaw.habitId,
            date: formatDate(todayLogRaw.date),
            status: todayLogRaw.status,
            completedUnits: todayLogRaw.completedUnits,
            notes: todayLogRaw.notes,
            createdAt: todayLogRaw.createdAt.toISOString(),
            updatedAt: todayLogRaw.updatedAt.toISOString(),
          }
        : null;

      let isDueToday = false;
      if (h.frequencyType === 'DAILY') {
        isDueToday = true;
      } else if (h.frequencyType === 'SELECTED_WEEKDAYS') {
        isDueToday = h.selectedWeekdays.includes(dayOfWeek);
      } else if (h.frequencyType === 'WEEKLY_TARGET') {
        isDueToday = true;
      }

      let status: 'COMPLETED' | 'SKIPPED' | 'MISSED' | 'PENDING' = 'PENDING';
      if (todayLog) {
        status = todayLog.status;
      }

      return {
        habit: {
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
        },
        todayLog,
        isDueToday,
        status,
      };
    });

    return {
      date: todayStr,
      timezone: userTimezone,
      contexts,
      commitments: allCommitments,
      tasks,
      habits,
      topIntentions: tasks
        .filter((t) => !t.isCompleted && (t.priority === 'URGENT' || t.priority === 'HIGH'))
        .slice(0, 3)
        .map((t) => t.title),
    };
  },
};
