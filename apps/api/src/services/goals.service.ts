import { prisma } from '../lib/prisma';
import { AuthError } from './auth.service';
import type {
  Goal,
  CreateGoalInput,
  UpdateGoalInput,
  Milestone,
  CreateMilestoneInput,
  UpdateMilestoneInput,
} from '@unitrack/contracts';

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function parseDateOnly(str: string): Date {
  return new Date(`${str}T00:00:00.000Z`);
}

async function recalculateGoalProgress(goalId: string): Promise<number> {
  const milestones = await prisma.milestone.findMany({
    where: { goalId },
    select: { isCompleted: true },
  });

  if (milestones.length === 0) return 0;

  const completedCount = milestones.filter((m) => m.isCompleted).length;
  const progressPercentage = Math.round((completedCount / milestones.length) * 100);

  const currentGoal = await prisma.goal.findUnique({
    where: { id: goalId },
    select: { status: true },
  });

  const nextStatus =
    progressPercentage === 100
      ? 'COMPLETED'
      : currentGoal?.status === 'COMPLETED'
        ? 'IN_PROGRESS'
        : undefined;

  await prisma.goal.update({
    where: { id: goalId },
    data: {
      progressPercentage,
      ...(nextStatus && { status: nextStatus }),
    },
  });

  return progressPercentage;
}

export const goalsService = {
  async getGoals(userId: string): Promise<{ data: Goal[] }> {
    const goals = await prisma.goal.findMany({
      where: { userId, isArchived: false },
      include: {
        context: { select: { name: true, colorHex: true } },
        milestones: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: [{ targetDate: 'asc' }, { createdAt: 'desc' }],
    });

    return {
      data: goals.map((g) => ({
        id: g.id,
        title: g.title,
        description: g.description,
        contextId: g.contextId,
        contextName: g.context?.name || null,
        contextColor: g.context?.colorHex || null,
        status: g.status,
        targetDate: g.targetDate ? formatDate(g.targetDate) : null,
        progressPercentage: g.progressPercentage,
        milestones: g.milestones.map((m) => ({
          id: m.id,
          goalId: m.goalId,
          title: m.title,
          targetDate: m.targetDate ? formatDate(m.targetDate) : null,
          isCompleted: m.isCompleted,
          completedAt: m.completedAt ? m.completedAt.toISOString() : null,
          sortOrder: m.sortOrder,
          createdAt: m.createdAt.toISOString(),
          updatedAt: m.updatedAt.toISOString(),
        })),
        version: g.version,
        createdAt: g.createdAt.toISOString(),
        updatedAt: g.updatedAt.toISOString(),
      })),
    };
  },

  async getGoalById(userId: string, goalId: string): Promise<Goal> {
    const g = await prisma.goal.findFirst({
      where: { id: goalId, userId },
      include: {
        context: { select: { name: true, colorHex: true } },
        milestones: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!g) {
      throw new AuthError(404, 'GOAL_NOT_FOUND', 'Goal not found.');
    }

    return {
      id: g.id,
      title: g.title,
      description: g.description,
      contextId: g.contextId,
      contextName: g.context?.name || null,
      contextColor: g.context?.colorHex || null,
      status: g.status,
      targetDate: g.targetDate ? formatDate(g.targetDate) : null,
      progressPercentage: g.progressPercentage,
      milestones: g.milestones.map((m) => ({
        id: m.id,
        goalId: m.goalId,
        title: m.title,
        targetDate: m.targetDate ? formatDate(m.targetDate) : null,
        isCompleted: m.isCompleted,
        completedAt: m.completedAt ? m.completedAt.toISOString() : null,
        sortOrder: m.sortOrder,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      })),
      version: g.version,
      createdAt: g.createdAt.toISOString(),
      updatedAt: g.updatedAt.toISOString(),
    };
  },

  async createGoal(userId: string, input: CreateGoalInput): Promise<Goal> {
    if (input.contextId) {
      const context = await prisma.context.findFirst({
        where: { id: input.contextId, userId },
      });
      if (!context) {
        throw new AuthError(404, 'CONTEXT_NOT_FOUND', 'Context not found.');
      }
    }

    const goal = await prisma.goal.create({
      data: {
        userId,
        contextId: input.contextId || null,
        title: input.title,
        description: input.description || null,
        status: input.status || 'IN_PROGRESS',
        targetDate: input.targetDate ? parseDateOnly(input.targetDate) : null,
        ...(input.initialMilestones && input.initialMilestones.length > 0 && {
          milestones: {
            create: input.initialMilestones.map((m, idx) => ({
              title: m.title,
              targetDate: m.targetDate ? parseDateOnly(m.targetDate) : null,
              sortOrder: m.sortOrder ?? idx,
            })),
          },
        }),
      },
      include: {
        context: { select: { name: true, colorHex: true } },
        milestones: true,
      },
    });

    return {
      id: goal.id,
      title: goal.title,
      description: goal.description,
      contextId: goal.contextId,
      contextName: goal.context?.name || null,
      contextColor: goal.context?.colorHex || null,
      status: goal.status,
      targetDate: goal.targetDate ? formatDate(goal.targetDate) : null,
      progressPercentage: goal.progressPercentage,
      milestones: goal.milestones.map((m) => ({
        id: m.id,
        goalId: m.goalId,
        title: m.title,
        targetDate: m.targetDate ? formatDate(m.targetDate) : null,
        isCompleted: m.isCompleted,
        completedAt: m.completedAt ? m.completedAt.toISOString() : null,
        sortOrder: m.sortOrder,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      })),
      version: goal.version,
      createdAt: goal.createdAt.toISOString(),
      updatedAt: goal.updatedAt.toISOString(),
    };
  },

  async updateGoal(userId: string, goalId: string, input: UpdateGoalInput): Promise<Goal> {
    const existing = await prisma.goal.findFirst({
      where: { id: goalId, userId },
    });

    if (!existing) {
      throw new AuthError(404, 'GOAL_NOT_FOUND', 'Goal not found.');
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

    const updated = await prisma.goal.update({
      where: { id: goalId },
      data: {
        ...(input.title && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.contextId !== undefined && { contextId: input.contextId }),
        ...(input.status && { status: input.status }),
        ...(input.targetDate !== undefined && {
          targetDate: input.targetDate ? parseDateOnly(input.targetDate) : null,
        }),
        ...(input.progressPercentage !== undefined && {
          progressPercentage: input.progressPercentage,
        }),
        version: { increment: 1 },
      },
      include: {
        context: { select: { name: true, colorHex: true } },
        milestones: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    return {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      contextId: updated.contextId,
      contextName: updated.context?.name || null,
      contextColor: updated.context?.colorHex || null,
      status: updated.status,
      targetDate: updated.targetDate ? formatDate(updated.targetDate) : null,
      progressPercentage: updated.progressPercentage,
      milestones: updated.milestones.map((m) => ({
        id: m.id,
        goalId: m.goalId,
        title: m.title,
        targetDate: m.targetDate ? formatDate(m.targetDate) : null,
        isCompleted: m.isCompleted,
        completedAt: m.completedAt ? m.completedAt.toISOString() : null,
        sortOrder: m.sortOrder,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      })),
      version: updated.version,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  },

  async deleteGoal(userId: string, goalId: string): Promise<void> {
    const existing = await prisma.goal.findFirst({
      where: { id: goalId, userId },
    });

    if (!existing) {
      throw new AuthError(404, 'GOAL_NOT_FOUND', 'Goal not found.');
    }

    await prisma.goal.delete({
      where: { id: goalId },
    });
  },

  async createMilestone(
    userId: string,
    goalId: string,
    input: CreateMilestoneInput
  ): Promise<Milestone> {
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId },
    });

    if (!goal) {
      throw new AuthError(404, 'GOAL_NOT_FOUND', 'Goal not found.');
    }

    const milestone = await prisma.milestone.create({
      data: {
        goalId,
        title: input.title,
        targetDate: input.targetDate ? parseDateOnly(input.targetDate) : null,
        sortOrder: input.sortOrder ?? 0,
      },
    });

    await recalculateGoalProgress(goalId);

    return {
      id: milestone.id,
      goalId: milestone.goalId,
      title: milestone.title,
      targetDate: milestone.targetDate ? formatDate(milestone.targetDate) : null,
      isCompleted: milestone.isCompleted,
      completedAt: milestone.completedAt ? milestone.completedAt.toISOString() : null,
      sortOrder: milestone.sortOrder,
      createdAt: milestone.createdAt.toISOString(),
      updatedAt: milestone.updatedAt.toISOString(),
    };
  },

  async updateMilestone(
    userId: string,
    goalId: string,
    milestoneId: string,
    input: UpdateMilestoneInput
  ): Promise<Milestone> {
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId },
    });

    if (!goal) {
      throw new AuthError(404, 'GOAL_NOT_FOUND', 'Goal not found.');
    }

    const existing = await prisma.milestone.findFirst({
      where: { id: milestoneId, goalId },
    });

    if (!existing) {
      throw new AuthError(404, 'MILESTONE_NOT_FOUND', 'Milestone not found.');
    }

    const isCompleted = input.isCompleted !== undefined ? input.isCompleted : existing.isCompleted;
    const completedAt = input.isCompleted !== undefined
      ? input.isCompleted ? new Date() : null
      : existing.completedAt;

    const updated = await prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        ...(input.title && { title: input.title }),
        ...(input.targetDate !== undefined && {
          targetDate: input.targetDate ? parseDateOnly(input.targetDate) : null,
        }),
        ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
        isCompleted,
        completedAt,
      },
    });

    await recalculateGoalProgress(goalId);

    return {
      id: updated.id,
      goalId: updated.goalId,
      title: updated.title,
      targetDate: updated.targetDate ? formatDate(updated.targetDate) : null,
      isCompleted: updated.isCompleted,
      completedAt: updated.completedAt ? updated.completedAt.toISOString() : null,
      sortOrder: updated.sortOrder,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  },

  async deleteMilestone(userId: string, goalId: string, milestoneId: string): Promise<void> {
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId },
    });

    if (!goal) {
      throw new AuthError(404, 'GOAL_NOT_FOUND', 'Goal not found.');
    }

    const existing = await prisma.milestone.findFirst({
      where: { id: milestoneId, goalId },
    });

    if (!existing) {
      throw new AuthError(404, 'MILESTONE_NOT_FOUND', 'Milestone not found.');
    }

    await prisma.milestone.delete({
      where: { id: milestoneId },
    });

    await recalculateGoalProgress(goalId);
  },
};
