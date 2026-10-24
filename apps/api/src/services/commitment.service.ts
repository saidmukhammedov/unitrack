import { prisma } from '../lib/prisma';
import { AuthError } from './auth.service';
import type {
  ScheduleCommitment,
  CreateScheduleCommitmentInput,
  UpdateScheduleCommitmentInput,
  CommitmentLog,
  LogCommitmentOccurrenceInput,
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

function parseTimeOnly(timeStr: string): Date {
  const [h, m] = timeStr.split(':').map(Number);
  return new Date(Date.UTC(1970, 0, 1, h, m, 0, 0));
}

export const commitmentService = {
  /**
   * List non-archived commitments for user
   */
  async getCommitments(userId: string): Promise<{ data: ScheduleCommitment[] }> {
    const commitments = await prisma.scheduleCommitment.findMany({
      where: { userId, isArchived: false },
      include: {
        context: { select: { name: true, colorHex: true } },
      },
      orderBy: [{ isRecurring: 'desc' }, { startTime: 'asc' }],
    });

    return {
      data: commitments.map((c) => ({
        id: c.id,
        title: c.title,
        contextId: c.contextId,
        contextName: c.context?.name || null,
        contextColor: c.context?.colorHex || null,
        location: c.location,
        isRecurring: c.isRecurring,
        specificDate: c.specificDate ? formatDate(c.specificDate) : null,
        weekday: c.weekday,
        startTime: formatTime(c.startTime),
        endTime: formatTime(c.endTime),
        isOvernight: c.isOvernight,
        effectiveFrom: formatDate(c.effectiveFrom),
        effectiveTo: c.effectiveTo ? formatDate(c.effectiveTo) : null,
        isArchived: c.isArchived,
        version: c.version,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
    };
  },

  /**
   * Create a schedule commitment (recurring or one-off)
   */
  async createCommitment(
    userId: string,
    input: CreateScheduleCommitmentInput
  ): Promise<ScheduleCommitment> {
    if (input.contextId) {
      const context = await prisma.context.findFirst({
        where: { id: input.contextId, userId },
      });
      if (!context) {
        throw new AuthError(404, 'CONTEXT_NOT_FOUND', 'Context not found.');
      }
    }

    // Determine overnight
    const isOvernight = input.endTime <= input.startTime;

    const effectiveFromDate = input.isRecurring
      ? parseDateOnly(input.effectiveFrom || formatDate(new Date()))
      : parseDateOnly(input.specificDate!);

    const specificDateParsed = input.isRecurring
      ? null
      : parseDateOnly(input.specificDate!);

    const commitment = await prisma.scheduleCommitment.create({
      data: {
        userId,
        contextId: input.contextId || null,
        title: input.title,
        location: input.location || null,
        isRecurring: input.isRecurring,
        specificDate: specificDateParsed,
        weekday: input.isRecurring ? input.weekday : null,
        startTime: parseTimeOnly(input.startTime),
        endTime: parseTimeOnly(input.endTime),
        isOvernight,
        effectiveFrom: effectiveFromDate,
        effectiveTo: input.effectiveTo ? parseDateOnly(input.effectiveTo) : null,
      },
      include: {
        context: { select: { name: true, colorHex: true } },
      },
    });

    return {
      id: commitment.id,
      title: commitment.title,
      contextId: commitment.contextId,
      contextName: commitment.context?.name || null,
      contextColor: commitment.context?.colorHex || null,
      location: commitment.location,
      isRecurring: commitment.isRecurring,
      specificDate: commitment.specificDate ? formatDate(commitment.specificDate) : null,
      weekday: commitment.weekday,
      startTime: formatTime(commitment.startTime),
      endTime: formatTime(commitment.endTime),
      isOvernight: commitment.isOvernight,
      effectiveFrom: formatDate(commitment.effectiveFrom),
      effectiveTo: commitment.effectiveTo ? formatDate(commitment.effectiveTo) : null,
      isArchived: commitment.isArchived,
      version: commitment.version,
      createdAt: commitment.createdAt.toISOString(),
      updatedAt: commitment.updatedAt.toISOString(),
    };
  },

  /**
   * Update an existing commitment with optimistic concurrency control
   */
  async updateCommitment(
    userId: string,
    commitmentId: string,
    input: UpdateScheduleCommitmentInput
  ): Promise<ScheduleCommitment> {
    const existing = await prisma.scheduleCommitment.findFirst({
      where: { id: commitmentId, userId },
    });

    if (!existing) {
      throw new AuthError(404, 'COMMITMENT_NOT_FOUND', 'Commitment not found.');
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

    const nextStartTime = input.startTime ? parseTimeOnly(input.startTime) : existing.startTime;
    const nextEndTime = input.endTime ? parseTimeOnly(input.endTime) : existing.endTime;
    const isOvernight = formatTime(nextEndTime) <= formatTime(nextStartTime);

    const updated = await prisma.scheduleCommitment.update({
      where: { id: commitmentId },
      data: {
        ...(input.title && { title: input.title }),
        ...(input.contextId !== undefined && { contextId: input.contextId }),
        ...(input.location !== undefined && { location: input.location }),
        ...(input.startTime && { startTime: nextStartTime }),
        ...(input.endTime && { endTime: nextEndTime, isOvernight }),
        ...(input.effectiveFrom && { effectiveFrom: parseDateOnly(input.effectiveFrom) }),
        ...(input.effectiveTo !== undefined && {
          effectiveTo: input.effectiveTo ? parseDateOnly(input.effectiveTo) : null,
        }),
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
      location: updated.location,
      isRecurring: updated.isRecurring,
      specificDate: updated.specificDate ? formatDate(updated.specificDate) : null,
      weekday: updated.weekday,
      startTime: formatTime(updated.startTime),
      endTime: formatTime(updated.endTime),
      isOvernight: updated.isOvernight,
      effectiveFrom: formatDate(updated.effectiveFrom),
      effectiveTo: updated.effectiveTo ? formatDate(updated.effectiveTo) : null,
      isArchived: updated.isArchived,
      version: updated.version,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  },

  /**
   * Delete or archive commitment
   */
  async deleteCommitment(userId: string, commitmentId: string): Promise<void> {
    const existing = await prisma.scheduleCommitment.findFirst({
      where: { id: commitmentId, userId },
    });

    if (!existing) {
      throw new AuthError(404, 'COMMITMENT_NOT_FOUND', 'Commitment not found.');
    }

    await prisma.scheduleCommitment.delete({
      where: { id: commitmentId },
    });
  },

  /**
   * Log attendance or status for a single occurrence (date: YYYY-MM-DD)
   */
  async logOccurrence(
    userId: string,
    commitmentId: string,
    dateStr: string,
    input: LogCommitmentOccurrenceInput
  ): Promise<CommitmentLog> {
    const commitment = await prisma.scheduleCommitment.findFirst({
      where: { id: commitmentId, userId },
    });

    if (!commitment) {
      throw new AuthError(404, 'COMMITMENT_NOT_FOUND', 'Commitment not found.');
    }

    const date = parseDateOnly(dateStr);

    const log = await prisma.commitmentLog.upsert({
      where: {
        commitmentId_date: {
          commitmentId,
          date,
        },
      },
      update: {
        status: input.status,
        rescheduledStartTime: input.rescheduledStartTime
          ? parseTimeOnly(input.rescheduledStartTime)
          : null,
        rescheduledEndTime: input.rescheduledEndTime
          ? parseTimeOnly(input.rescheduledEndTime)
          : null,
        notes: input.notes !== undefined ? input.notes : undefined,
      },
      create: {
        userId,
        commitmentId,
        date,
        status: input.status,
        rescheduledStartTime: input.rescheduledStartTime
          ? parseTimeOnly(input.rescheduledStartTime)
          : null,
        rescheduledEndTime: input.rescheduledEndTime
          ? parseTimeOnly(input.rescheduledEndTime)
          : null,
        notes: input.notes || null,
      },
    });

    return {
      id: log.id,
      commitmentId: log.commitmentId,
      date: formatDate(log.date),
      status: log.status,
      rescheduledStartTime: log.rescheduledStartTime ? formatTime(log.rescheduledStartTime) : null,
      rescheduledEndTime: log.rescheduledEndTime ? formatTime(log.rescheduledEndTime) : null,
      notes: log.notes,
      createdAt: log.createdAt.toISOString(),
      updatedAt: log.updatedAt.toISOString(),
    };
  },
};
