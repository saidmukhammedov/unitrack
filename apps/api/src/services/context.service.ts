import { prisma } from '../lib/prisma';
import { AuthError } from './auth.service';
import type {
  Context,
  CreateContextInput,
  UpdateContextInput,
} from '@unitrack/contracts';

export const DEFAULT_CONTEXTS = [
  { name: 'Personal', colorHex: '#3B82F6', icon: 'user', sortOrder: 0 },
  { name: 'Work', colorHex: '#10B981', icon: 'briefcase', sortOrder: 1 },
  { name: 'Study', colorHex: '#8B5CF6', icon: 'book', sortOrder: 2 },
];

export const contextService = {
  /**
   * Seed default contexts for user if they don't already exist.
   * Idempotent: safe to call on registration, login, or any time.
   */
  async seedDefaultContexts(userId: string): Promise<Context[]> {
    const existing = await prisma.context.findMany({
      where: { userId },
      orderBy: { sortOrder: 'asc' },
    });

    if (existing.length > 0) {
      return existing.map((c) => ({
        id: c.id,
        name: c.name,
        colorHex: c.colorHex,
        icon: c.icon,
        sortOrder: c.sortOrder,
        isArchived: c.isArchived,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      }));
    }

    const created = await prisma.$transaction(
      DEFAULT_CONTEXTS.map((ctx) =>
        prisma.context.upsert({
          where: {
            userId_name: {
              userId,
              name: ctx.name,
            },
          },
          update: {},
          create: {
            userId,
            name: ctx.name,
            colorHex: ctx.colorHex,
            icon: ctx.icon,
            sortOrder: ctx.sortOrder,
          },
        })
      )
    );

    return created.map((c) => ({
      id: c.id,
      name: c.name,
      colorHex: c.colorHex,
      icon: c.icon,
      sortOrder: c.sortOrder,
      isArchived: c.isArchived,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
  },

  /**
   * Get all non-archived contexts for a user.
   * If none exist, seeds default contexts automatically.
   */
  async getContexts(userId: string): Promise<Context[]> {
    let contexts = await prisma.context.findMany({
      where: { userId, isArchived: false },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    if (contexts.length === 0) {
      return this.seedDefaultContexts(userId);
    }

    return contexts.map((c) => ({
      id: c.id,
      name: c.name,
      colorHex: c.colorHex,
      icon: c.icon,
      sortOrder: c.sortOrder,
      isArchived: c.isArchived,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
  },

  /**
   * Create a new custom context
   */
  async createContext(userId: string, input: CreateContextInput): Promise<Context> {
    const existing = await prisma.context.findUnique({
      where: {
        userId_name: {
          userId,
          name: input.name,
        },
      },
    });

    if (existing) {
      if (existing.isArchived) {
        // Unarchive and update
        const revived = await prisma.context.update({
          where: { id: existing.id },
          data: {
            isArchived: false,
            colorHex: input.colorHex,
            icon: input.icon || null,
          },
        });
        return {
          id: revived.id,
          name: revived.name,
          colorHex: revived.colorHex,
          icon: revived.icon,
          sortOrder: revived.sortOrder,
          isArchived: false,
          createdAt: revived.createdAt.toISOString(),
          updatedAt: revived.updatedAt.toISOString(),
        };
      }
      throw new AuthError(409, 'CONTEXT_ALREADY_EXISTS', `Context "${input.name}" already exists.`);
    }

    const count = await prisma.context.count({ where: { userId } });

    const created = await prisma.context.create({
      data: {
        userId,
        name: input.name,
        colorHex: input.colorHex,
        icon: input.icon || null,
        sortOrder: count,
      },
    });

    return {
      id: created.id,
      name: created.name,
      colorHex: created.colorHex,
      icon: created.icon,
      sortOrder: created.sortOrder,
      isArchived: created.isArchived,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  },

  /**
   * Update an existing context
   */
  async updateContext(userId: string, contextId: string, input: UpdateContextInput): Promise<Context> {
    const existing = await prisma.context.findFirst({
      where: { id: contextId, userId },
    });

    if (!existing) {
      throw new AuthError(404, 'CONTEXT_NOT_FOUND', 'Context not found.');
    }

    if (input.name && input.name !== existing.name) {
      const duplicate = await prisma.context.findUnique({
        where: {
          userId_name: {
            userId,
            name: input.name,
          },
        },
      });
      if (duplicate && duplicate.id !== contextId) {
        throw new AuthError(409, 'CONTEXT_NAME_TAKEN', `A context named "${input.name}" already exists.`);
      }
    }

    const updated = await prisma.context.update({
      where: { id: contextId },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.colorHex && { colorHex: input.colorHex }),
        ...(input.icon !== undefined && { icon: input.icon }),
        ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
        ...(input.isArchived !== undefined && { isArchived: input.isArchived }),
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      colorHex: updated.colorHex,
      icon: updated.icon,
      sortOrder: updated.sortOrder,
      isArchived: updated.isArchived,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  },

  /**
   * Delete or archive context
   */
  async deleteContext(userId: string, contextId: string): Promise<void> {
    const existing = await prisma.context.findFirst({
      where: { id: contextId, userId },
    });

    if (!existing) {
      throw new AuthError(404, 'CONTEXT_NOT_FOUND', 'Context not found.');
    }

    // Check if context has any associated tasks, commitments, or habits
    const [tasksCount, commitmentsCount, habitsCount] = await Promise.all([
      prisma.task.count({ where: { contextId } }),
      prisma.scheduleCommitment.count({ where: { contextId } }),
      prisma.habit.count({ where: { contextId } }),
    ]);

    if (tasksCount > 0 || commitmentsCount > 0 || habitsCount > 0) {
      // Soft-delete (archive) to preserve data integrity
      await prisma.context.update({
        where: { id: contextId },
        data: { isArchived: true },
      });
      return;
    }

    await prisma.context.delete({
      where: { id: contextId },
    });
  },
};
