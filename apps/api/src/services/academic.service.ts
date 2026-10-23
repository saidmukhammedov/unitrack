import { prisma } from '../lib/prisma';
import { AuthError } from './auth.service';
import type {
  AcademicPeriod,
  CreateAcademicPeriodInput,
  UpdateAcademicPeriodInput,
  Subject,
  CreateSubjectInput,
  UpdateSubjectInput,
  ClassSession,
  CreateClassSessionInput,
  UpdateClassSessionInput,
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskListResponse,
  Assessment,
  CreateAssessmentInput,
  UpdateAssessmentInput,
  AssessmentListResponse,
  DashboardResponse,
  DashboardClassItem,
} from '@unitrack/contracts';

// Date / Time conversion helpers
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
  const d = new Date(Date.UTC(1970, 0, 1, h, m, 0, 0));
  return d;
}

export const academicService = {
  // ---------------------------------------------------------------------------
  // 1. Academic Periods
  // ---------------------------------------------------------------------------
  async getPeriods(userId: string, archived?: string): Promise<{ data: AcademicPeriod[] }> {
    const where: any = { userId };
    if (archived === 'false' || archived === undefined) {
      where.isArchived = false;
    } else if (archived === 'true') {
      where.isArchived = true;
    }

    const periods = await prisma.academicPeriod.findMany({
      where,
      orderBy: { startDate: 'desc' },
    });

    return {
      data: periods.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type as any,
        startDate: formatDate(p.startDate),
        endDate: formatDate(p.endDate),
        isArchived: p.isArchived,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    };
  },

  async createPeriod(userId: string, input: CreateAcademicPeriodInput): Promise<AcademicPeriod> {
    const period = await prisma.academicPeriod.create({
      data: {
        userId,
        name: input.name,
        type: input.type,
        startDate: parseDateOnly(input.startDate),
        endDate: parseDateOnly(input.endDate),
      },
    });

    return {
      id: period.id,
      name: period.name,
      type: period.type as any,
      startDate: formatDate(period.startDate),
      endDate: formatDate(period.endDate),
      isArchived: period.isArchived,
      createdAt: period.createdAt.toISOString(),
      updatedAt: period.updatedAt.toISOString(),
    };
  },

  async getPeriodById(userId: string, periodId: string): Promise<AcademicPeriod> {
    const period = await prisma.academicPeriod.findFirst({
      where: { id: periodId, userId },
    });

    if (!period) {
      throw new AuthError(404, 'PERIOD_NOT_FOUND', 'Academic period not found.');
    }

    return {
      id: period.id,
      name: period.name,
      type: period.type as any,
      startDate: formatDate(period.startDate),
      endDate: formatDate(period.endDate),
      isArchived: period.isArchived,
      createdAt: period.createdAt.toISOString(),
      updatedAt: period.updatedAt.toISOString(),
    };
  },

  async updatePeriod(
    userId: string,
    periodId: string,
    input: UpdateAcademicPeriodInput
  ): Promise<AcademicPeriod> {
    const period = await prisma.academicPeriod.findFirst({
      where: { id: periodId, userId },
    });

    if (!period) {
      throw new AuthError(404, 'PERIOD_NOT_FOUND', 'Academic period not found.');
    }

    const updated = await prisma.academicPeriod.update({
      where: { id: periodId },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.type && { type: input.type }),
        ...(input.startDate && { startDate: parseDateOnly(input.startDate) }),
        ...(input.endDate && { endDate: parseDateOnly(input.endDate) }),
        ...(input.isArchived !== undefined && { isArchived: input.isArchived }),
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      type: updated.type as any,
      startDate: formatDate(updated.startDate),
      endDate: formatDate(updated.endDate),
      isArchived: updated.isArchived,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  },

  async deletePeriod(userId: string, periodId: string): Promise<void> {
    const period = await prisma.academicPeriod.findFirst({
      where: { id: periodId, userId },
    });

    if (!period) {
      throw new AuthError(404, 'PERIOD_NOT_FOUND', 'Academic period not found.');
    }

    await prisma.academicPeriod.delete({
      where: { id: periodId },
    });
  },

  // ---------------------------------------------------------------------------
  // 2. Subjects
  // ---------------------------------------------------------------------------
  async getSubjectsByPeriod(
    userId: string,
    periodId: string,
    archived?: string
  ): Promise<{ data: Subject[] }> {
    const period = await prisma.academicPeriod.findFirst({
      where: { id: periodId, userId },
    });

    if (!period) {
      throw new AuthError(404, 'PERIOD_NOT_FOUND', 'Academic period not found.');
    }

    const where: any = { userId, periodId };
    if (archived === 'false' || archived === undefined) {
      where.isArchived = false;
    } else if (archived === 'true') {
      where.isArchived = true;
    }

    const subjects = await prisma.subject.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return {
      data: subjects.map((s) => ({
        id: s.id,
        periodId: s.periodId,
        name: s.name,
        colorHex: s.colorHex,
        teacherName: s.teacherName,
        creditHours: s.creditHours ? Number(s.creditHours) : null,
        isArchived: s.isArchived,
        gradingSchemeId: s.gradingSchemeId,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
    };
  },

  async createSubject(
    userId: string,
    periodId: string,
    input: CreateSubjectInput
  ): Promise<Subject> {
    const period = await prisma.academicPeriod.findFirst({
      where: { id: periodId, userId },
    });

    if (!period) {
      throw new AuthError(404, 'PERIOD_NOT_FOUND', 'Academic period not found.');
    }

    if (input.gradingSchemeId) {
      const scheme = await prisma.gradingScheme.findFirst({
        where: { id: input.gradingSchemeId, userId },
      });
      if (!scheme) {
        throw new AuthError(400, 'GRADING_SCHEME_NOT_FOUND', 'Grading scheme not found or not owned by user.');
      }
    }

    const subject = await prisma.subject.create({
      data: {
        userId,
        periodId,
        name: input.name,
        colorHex: input.colorHex || null,
        teacherName: input.teacherName || null,
        creditHours: input.creditHours || null,
        gradingSchemeId: input.gradingSchemeId || null,
      },
    });

    return {
      id: subject.id,
      periodId: subject.periodId,
      name: subject.name,
      colorHex: subject.colorHex,
      teacherName: subject.teacherName,
      creditHours: subject.creditHours ? Number(subject.creditHours) : null,
      isArchived: subject.isArchived,
      gradingSchemeId: subject.gradingSchemeId,
      createdAt: subject.createdAt.toISOString(),
      updatedAt: subject.updatedAt.toISOString(),
    };
  },

  async getSubjectById(userId: string, subjectId: string): Promise<Subject> {
    const subject = await prisma.subject.findFirst({
      where: { id: subjectId, userId },
    });

    if (!subject) {
      throw new AuthError(404, 'SUBJECT_NOT_FOUND', 'Subject not found.');
    }

    return {
      id: subject.id,
      periodId: subject.periodId,
      name: subject.name,
      colorHex: subject.colorHex,
      teacherName: subject.teacherName,
      creditHours: subject.creditHours ? Number(subject.creditHours) : null,
      isArchived: subject.isArchived,
      gradingSchemeId: subject.gradingSchemeId,
      createdAt: subject.createdAt.toISOString(),
      updatedAt: subject.updatedAt.toISOString(),
    };
  },

  async updateSubject(
    userId: string,
    subjectId: string,
    input: UpdateSubjectInput
  ): Promise<Subject> {
    const subject = await prisma.subject.findFirst({
      where: { id: subjectId, userId },
    });

    if (!subject) {
      throw new AuthError(404, 'SUBJECT_NOT_FOUND', 'Subject not found.');
    }

    if (input.gradingSchemeId) {
      const scheme = await prisma.gradingScheme.findFirst({
        where: { id: input.gradingSchemeId, userId },
      });
      if (!scheme) {
        throw new AuthError(400, 'GRADING_SCHEME_NOT_FOUND', 'Grading scheme not found or not owned by user.');
      }
    }

    const updated = await prisma.subject.update({
      where: { id: subjectId },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.colorHex !== undefined && { colorHex: input.colorHex }),
        ...(input.teacherName !== undefined && { teacherName: input.teacherName }),
        ...(input.creditHours !== undefined && { creditHours: input.creditHours }),
        ...(input.isArchived !== undefined && { isArchived: input.isArchived }),
        ...(input.gradingSchemeId !== undefined && { gradingSchemeId: input.gradingSchemeId }),
      },
    });

    return {
      id: updated.id,
      periodId: updated.periodId,
      name: updated.name,
      colorHex: updated.colorHex,
      teacherName: updated.teacherName,
      creditHours: updated.creditHours ? Number(updated.creditHours) : null,
      isArchived: updated.isArchived,
      gradingSchemeId: updated.gradingSchemeId,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  },

  async deleteSubject(userId: string, subjectId: string): Promise<void> {
    const subject = await prisma.subject.findFirst({
      where: { id: subjectId, userId },
    });

    if (!subject) {
      throw new AuthError(404, 'SUBJECT_NOT_FOUND', 'Subject not found.');
    }

    await prisma.subject.delete({
      where: { id: subjectId },
    });
  },

  // ---------------------------------------------------------------------------
  // 3. Timetable (Class Sessions)
  // ---------------------------------------------------------------------------
  async getTimetable(
    userId: string,
    filters: { periodId?: string; subjectId?: string; weekday?: number }
  ): Promise<{ data: ClassSession[] }> {
    const where: any = { userId };
    if (filters.periodId) where.periodId = filters.periodId;
    if (filters.subjectId) where.subjectId = filters.subjectId;
    if (filters.weekday !== undefined) where.weekday = filters.weekday;

    const sessions = await prisma.classSession.findMany({
      where,
      include: {
        subject: {
          select: { name: true, colorHex: true },
        },
      },
      orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }],
    });

    return {
      data: sessions.map((s) => ({
        id: s.id,
        subjectId: s.subjectId,
        subjectName: s.subject.name,
        subjectColor: s.subject.colorHex,
        periodId: s.periodId,
        weekday: s.weekday,
        startTime: formatTime(s.startTime),
        endTime: formatTime(s.endTime),
        location: s.location,
        effectiveFrom: formatDate(s.effectiveFrom),
        effectiveTo: s.effectiveTo ? formatDate(s.effectiveTo) : null,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
    };
  },

  async createClassSession(
    userId: string,
    input: CreateClassSessionInput
  ): Promise<ClassSession> {
    const subject = await prisma.subject.findFirst({
      where: { id: input.subjectId, userId },
    });

    if (!subject) {
      throw new AuthError(404, 'SUBJECT_NOT_FOUND', 'Subject not found or not owned by user.');
    }

    // PeriodId is derived directly from Subject.periodId (D-02 / A-02)
    const session = await prisma.classSession.create({
      data: {
        userId,
        subjectId: subject.id,
        periodId: subject.periodId,
        weekday: input.weekday,
        startTime: parseTimeOnly(input.startTime),
        endTime: parseTimeOnly(input.endTime),
        location: input.location || null,
        effectiveFrom: parseDateOnly(input.effectiveFrom),
        effectiveTo: input.effectiveTo ? parseDateOnly(input.effectiveTo) : null,
      },
      include: {
        subject: { select: { name: true, colorHex: true } },
      },
    });

    return {
      id: session.id,
      subjectId: session.subjectId,
      subjectName: session.subject.name,
      subjectColor: session.subject.colorHex,
      periodId: session.periodId,
      weekday: session.weekday,
      startTime: formatTime(session.startTime),
      endTime: formatTime(session.endTime),
      location: session.location,
      effectiveFrom: formatDate(session.effectiveFrom),
      effectiveTo: session.effectiveTo ? formatDate(session.effectiveTo) : null,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
  },

  async updateClassSession(
    userId: string,
    sessionId: string,
    input: UpdateClassSessionInput
  ): Promise<ClassSession> {
    const existing = await prisma.classSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!existing) {
      throw new AuthError(404, 'SESSION_NOT_FOUND', 'Class session not found.');
    }

    let targetPeriodId = existing.periodId;
    if (input.subjectId && input.subjectId !== existing.subjectId) {
      const newSubject = await prisma.subject.findFirst({
        where: { id: input.subjectId, userId },
      });
      if (!newSubject) {
        throw new AuthError(404, 'SUBJECT_NOT_FOUND', 'Target subject not found or not owned.');
      }
      targetPeriodId = newSubject.periodId;
    }

    const updated = await prisma.classSession.update({
      where: { id: sessionId },
      data: {
        ...(input.subjectId && { subjectId: input.subjectId, periodId: targetPeriodId }),
        ...(input.weekday !== undefined && { weekday: input.weekday }),
        ...(input.startTime && { startTime: parseTimeOnly(input.startTime) }),
        ...(input.endTime && { endTime: parseTimeOnly(input.endTime) }),
        ...(input.location !== undefined && { location: input.location }),
        ...(input.effectiveFrom && { effectiveFrom: parseDateOnly(input.effectiveFrom) }),
        ...(input.effectiveTo !== undefined && {
          effectiveTo: input.effectiveTo ? parseDateOnly(input.effectiveTo) : null,
        }),
      },
      include: {
        subject: { select: { name: true, colorHex: true } },
      },
    });

    return {
      id: updated.id,
      subjectId: updated.subjectId,
      subjectName: updated.subject.name,
      subjectColor: updated.subject.colorHex,
      periodId: updated.periodId,
      weekday: updated.weekday,
      startTime: formatTime(updated.startTime),
      endTime: formatTime(updated.endTime),
      location: updated.location,
      effectiveFrom: formatDate(updated.effectiveFrom),
      effectiveTo: updated.effectiveTo ? formatDate(updated.effectiveTo) : null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  },

  async deleteClassSession(userId: string, sessionId: string): Promise<void> {
    const existing = await prisma.classSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!existing) {
      throw new AuthError(404, 'SESSION_NOT_FOUND', 'Class session not found.');
    }

    await prisma.classSession.delete({
      where: { id: sessionId },
    });
  },

  // ---------------------------------------------------------------------------
  // 4. Tasks
  // ---------------------------------------------------------------------------
  async getTasks(
    userId: string,
    query: {
      periodId?: string;
      subjectId?: string;
      completed?: string;
      dueBefore?: string;
      limit?: number;
      cursor?: string;
    }
  ): Promise<TaskListResponse> {
    const where: any = { userId };
    const limit = query.limit ? Math.min(query.limit, 100) : 20;

    if (query.subjectId) {
      where.subjectId = query.subjectId;
    }

    if (query.periodId) {
      where.OR = [
        { periodId: query.periodId },
        { subject: { periodId: query.periodId } },
      ];
    }

    if (query.completed === 'true') {
      where.completedAt = { not: null };
    } else if (query.completed === 'false' || query.completed === undefined) {
      where.completedAt = null;
    }

    if (query.dueBefore) {
      where.dueAt = { lte: new Date(query.dueBefore) };
    }

    const tasks = await prisma.task.findMany({
      where,
      take: limit + 1,
      ...(query.cursor && {
        cursor: { id: query.cursor },
        skip: 1,
      }),
      include: {
        subject: { select: { name: true, colorHex: true } },
      },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }, { id: 'asc' }],
    });

    let nextCursor: string | null = null;
    if (tasks.length > limit) {
      const nextItem = tasks.pop();
      nextCursor = nextItem!.id;
    }

    return {
      data: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        taskType: t.taskType as any,
        subjectId: t.subjectId,
        subjectName: t.subject?.name || null,
        subjectColor: t.subject?.colorHex || null,
        periodId: t.periodId,
        dueAt: t.dueAt ? t.dueAt.toISOString() : null,
        completedAt: t.completedAt ? t.completedAt.toISOString() : null,
        isCompleted: t.completedAt !== null,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
      nextCursor,
    };
  },

  async createTask(userId: string, input: CreateTaskInput): Promise<Task> {
    if (input.subjectId) {
      const subject = await prisma.subject.findFirst({
        where: { id: input.subjectId, userId },
      });
      if (!subject) {
        throw new AuthError(404, 'SUBJECT_NOT_FOUND', 'Subject not found or not owned.');
      }
    }

    if (input.periodId) {
      const period = await prisma.academicPeriod.findFirst({
        where: { id: input.periodId, userId },
      });
      if (!period) {
        throw new AuthError(404, 'PERIOD_NOT_FOUND', 'Academic period not found.');
      }
    }

    const task = await prisma.task.create({
      data: {
        userId,
        title: input.title,
        description: input.description || null,
        taskType: input.taskType || 'OTHER',
        subjectId: input.subjectId || null,
        periodId: input.periodId || null,
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
      },
      include: {
        subject: { select: { name: true, colorHex: true } },
      },
    });

    return {
      id: task.id,
      title: task.title,
      description: task.description,
      taskType: task.taskType as any,
      subjectId: task.subjectId,
      subjectName: task.subject?.name || null,
      subjectColor: task.subject?.colorHex || null,
      periodId: task.periodId,
      dueAt: task.dueAt ? task.dueAt.toISOString() : null,
      completedAt: task.completedAt ? task.completedAt.toISOString() : null,
      isCompleted: task.completedAt !== null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  },

  async getTaskById(userId: string, taskId: string): Promise<Task> {
    const task = await prisma.task.findFirst({
      where: { id: taskId, userId },
      include: {
        subject: { select: { name: true, colorHex: true } },
      },
    });

    if (!task) {
      throw new AuthError(404, 'TASK_NOT_FOUND', 'Task not found.');
    }

    return {
      id: task.id,
      title: task.title,
      description: task.description,
      taskType: task.taskType as any,
      subjectId: task.subjectId,
      subjectName: task.subject?.name || null,
      subjectColor: task.subject?.colorHex || null,
      periodId: task.periodId,
      dueAt: task.dueAt ? task.dueAt.toISOString() : null,
      completedAt: task.completedAt ? task.completedAt.toISOString() : null,
      isCompleted: task.completedAt !== null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  },

  async updateTask(userId: string, taskId: string, input: UpdateTaskInput): Promise<Task> {
    const task = await prisma.task.findFirst({
      where: { id: taskId, userId },
    });

    if (!task) {
      throw new AuthError(404, 'TASK_NOT_FOUND', 'Task not found.');
    }

    if (input.subjectId) {
      const subject = await prisma.subject.findFirst({
        where: { id: input.subjectId, userId },
      });
      if (!subject) {
        throw new AuthError(404, 'SUBJECT_NOT_FOUND', 'Subject not found.');
      }
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(input.title && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.taskType && { taskType: input.taskType }),
        ...(input.subjectId !== undefined && { subjectId: input.subjectId }),
        ...(input.periodId !== undefined && { periodId: input.periodId }),
        ...(input.dueAt !== undefined && {
          dueAt: input.dueAt ? new Date(input.dueAt) : null,
        }),
        ...(input.completedAt !== undefined && {
          completedAt: input.completedAt ? new Date(input.completedAt) : null,
        }),
      },
      include: {
        subject: { select: { name: true, colorHex: true } },
      },
    });

    return {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      taskType: updated.taskType as any,
      subjectId: updated.subjectId,
      subjectName: updated.subject?.name || null,
      subjectColor: updated.subject?.colorHex || null,
      periodId: updated.periodId,
      dueAt: updated.dueAt ? updated.dueAt.toISOString() : null,
      completedAt: updated.completedAt ? updated.completedAt.toISOString() : null,
      isCompleted: updated.completedAt !== null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  },

  async deleteTask(userId: string, taskId: string): Promise<void> {
    const task = await prisma.task.findFirst({
      where: { id: taskId, userId },
    });

    if (!task) {
      throw new AuthError(404, 'TASK_NOT_FOUND', 'Task not found.');
    }

    await prisma.task.delete({
      where: { id: taskId },
    });
  },

  // ---------------------------------------------------------------------------
  // 5. Assessments
  // ---------------------------------------------------------------------------
  async getAssessments(
    userId: string,
    query: {
      periodId?: string;
      subjectId?: string;
      status?: string;
      scheduledAfter?: string;
      scheduledBefore?: string;
      limit?: number;
      cursor?: string;
    }
  ): Promise<AssessmentListResponse> {
    const where: any = { userId };
    const limit = query.limit ? Math.min(query.limit, 100) : 20;

    if (query.periodId) where.periodId = query.periodId;
    if (query.subjectId) where.subjectId = query.subjectId;
    if (query.status) where.status = query.status;

    if (query.scheduledAfter || query.scheduledBefore) {
      where.scheduledAt = {};
      if (query.scheduledAfter) where.scheduledAt.gte = new Date(query.scheduledAfter);
      if (query.scheduledBefore) where.scheduledAt.lte = new Date(query.scheduledBefore);
    }

    const assessments = await prisma.assessment.findMany({
      where,
      take: limit + 1,
      ...(query.cursor && {
        cursor: { id: query.cursor },
        skip: 1,
      }),
      include: {
        subject: { select: { name: true, colorHex: true } },
      },
      orderBy: [{ scheduledAt: 'asc' }, { id: 'asc' }],
    });

    let nextCursor: string | null = null;
    if (assessments.length > limit) {
      const nextItem = assessments.pop();
      nextCursor = nextItem!.id;
    }

    return {
      data: assessments.map((a) => ({
        id: a.id,
        subjectId: a.subjectId,
        subjectName: a.subject.name,
        subjectColor: a.subject.colorHex,
        periodId: a.periodId,
        title: a.title,
        assessmentType: a.assessmentType as any,
        scheduledAt: a.scheduledAt.toISOString(),
        status: a.status as any,
        rawScore: a.rawScore ? Number(a.rawScore) : null,
        maxScore: a.maxScore ? Number(a.maxScore) : null,
        weight: Number(a.weight),
        notes: a.notes,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
      nextCursor,
    };
  },

  async createAssessment(
    userId: string,
    input: CreateAssessmentInput
  ): Promise<Assessment> {
    const subject = await prisma.subject.findFirst({
      where: { id: input.subjectId, userId },
    });

    if (!subject) {
      throw new AuthError(404, 'SUBJECT_NOT_FOUND', 'Subject not found.');
    }

    // periodId derived from Subject.periodId (D-02 / A-02)
    const assessment = await prisma.assessment.create({
      data: {
        userId,
        subjectId: subject.id,
        periodId: subject.periodId,
        title: input.title,
        assessmentType: input.assessmentType,
        scheduledAt: new Date(input.scheduledAt),
        weight: input.weight ?? 1.0,
        notes: input.notes || null,
        status: 'SCHEDULED',
      },
      include: {
        subject: { select: { name: true, colorHex: true } },
      },
    });

    return {
      id: assessment.id,
      subjectId: assessment.subjectId,
      subjectName: assessment.subject.name,
      subjectColor: assessment.subject.colorHex,
      periodId: assessment.periodId,
      title: assessment.title,
      assessmentType: assessment.assessmentType as any,
      scheduledAt: assessment.scheduledAt.toISOString(),
      status: assessment.status as any,
      rawScore: assessment.rawScore ? Number(assessment.rawScore) : null,
      maxScore: assessment.maxScore ? Number(assessment.maxScore) : null,
      weight: Number(assessment.weight),
      notes: assessment.notes,
      createdAt: assessment.createdAt.toISOString(),
      updatedAt: assessment.updatedAt.toISOString(),
    };
  },

  async getAssessmentById(userId: string, assessmentId: string): Promise<Assessment> {
    const assessment = await prisma.assessment.findFirst({
      where: { id: assessmentId, userId },
      include: {
        subject: { select: { name: true, colorHex: true } },
      },
    });

    if (!assessment) {
      throw new AuthError(404, 'ASSESSMENT_NOT_FOUND', 'Assessment not found.');
    }

    return {
      id: assessment.id,
      subjectId: assessment.subjectId,
      subjectName: assessment.subject.name,
      subjectColor: assessment.subject.colorHex,
      periodId: assessment.periodId,
      title: assessment.title,
      assessmentType: assessment.assessmentType as any,
      scheduledAt: assessment.scheduledAt.toISOString(),
      status: assessment.status as any,
      rawScore: assessment.rawScore ? Number(assessment.rawScore) : null,
      maxScore: assessment.maxScore ? Number(assessment.maxScore) : null,
      weight: Number(assessment.weight),
      notes: assessment.notes,
      createdAt: assessment.createdAt.toISOString(),
      updatedAt: assessment.updatedAt.toISOString(),
    };
  },

  async updateAssessment(
    userId: string,
    assessmentId: string,
    input: UpdateAssessmentInput
  ): Promise<Assessment> {
    const existing = await prisma.assessment.findFirst({
      where: { id: assessmentId, userId },
    });

    if (!existing) {
      throw new AuthError(404, 'ASSESSMENT_NOT_FOUND', 'Assessment not found.');
    }

    let targetPeriodId = existing.periodId;
    if (input.subjectId && input.subjectId !== existing.subjectId) {
      const newSubject = await prisma.subject.findFirst({
        where: { id: input.subjectId, userId },
      });
      if (!newSubject) {
        throw new AuthError(404, 'SUBJECT_NOT_FOUND', 'Target subject not found.');
      }
      targetPeriodId = newSubject.periodId;
    }

    const nextRawScore = input.rawScore !== undefined ? input.rawScore : (existing.rawScore ? Number(existing.rawScore) : null);
    const nextMaxScore = input.maxScore !== undefined ? input.maxScore : (existing.maxScore ? Number(existing.maxScore) : null);
    const nextStatus = input.status || existing.status;

    // Enforce COMPLETED validation (D-01 / A-01)
    if (nextStatus === 'COMPLETED') {
      if (nextRawScore === null || nextMaxScore === null || nextMaxScore <= 0) {
        throw new AuthError(
          400,
          'VALIDATION_ERROR',
          'Assessments marked COMPLETED must have both non-null rawScore (>= 0) and maxScore (> 0).'
        );
      }
    }

    // Extra credit check
    let warning: string | undefined;
    if (nextRawScore !== null && nextMaxScore !== null && nextRawScore > nextMaxScore) {
      warning = 'RAW_SCORE_EXCEEDS_MAX';
    }

    const updated = await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        ...(input.subjectId && { subjectId: input.subjectId, periodId: targetPeriodId }),
        ...(input.title && { title: input.title }),
        ...(input.assessmentType && { assessmentType: input.assessmentType }),
        ...(input.scheduledAt && { scheduledAt: new Date(input.scheduledAt) }),
        ...(input.status && { status: input.status }),
        ...(input.rawScore !== undefined && { rawScore: input.rawScore }),
        ...(input.maxScore !== undefined && { maxScore: input.maxScore }),
        ...(input.weight !== undefined && { weight: input.weight }),
        ...(input.notes !== undefined && { notes: input.notes }),
      },
      include: {
        subject: { select: { name: true, colorHex: true } },
      },
    });

    return {
      id: updated.id,
      subjectId: updated.subjectId,
      subjectName: updated.subject.name,
      subjectColor: updated.subject.colorHex,
      periodId: updated.periodId,
      title: updated.title,
      assessmentType: updated.assessmentType as any,
      scheduledAt: updated.scheduledAt.toISOString(),
      status: updated.status as any,
      rawScore: updated.rawScore ? Number(updated.rawScore) : null,
      maxScore: updated.maxScore ? Number(updated.maxScore) : null,
      weight: Number(updated.weight),
      notes: updated.notes,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      ...(warning && { warning }),
    };
  },

  async deleteAssessment(userId: string, assessmentId: string): Promise<void> {
    const existing = await prisma.assessment.findFirst({
      where: { id: assessmentId, userId },
    });

    if (!existing) {
      throw new AuthError(404, 'ASSESSMENT_NOT_FOUND', 'Assessment not found.');
    }

    await prisma.assessment.delete({
      where: { id: assessmentId },
    });
  },

  // ---------------------------------------------------------------------------
  // 6. Dashboard Aggregation
  // ---------------------------------------------------------------------------
  async getDashboard(userId: string, targetDateStr?: string): Promise<DashboardResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AuthError(404, 'USER_NOT_FOUND', 'User not found.');
    }

    // Timezone-aware date resolution (I-12)
    let calendarDateStr = targetDateStr;
    if (!calendarDateStr) {
      try {
        const formatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: user.timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
        calendarDateStr = formatter.format(new Date()); // YYYY-MM-DD
      } catch {
        calendarDateStr = new Date().toISOString().split('T')[0];
      }
    }

    const targetDate = parseDateOnly(calendarDateStr);
    const weekday = targetDate.getUTCDay(); // 0 = Sunday .. 6 = Saturday

    // 1. Today's classes matching weekday and active date range
    const sessions = await prisma.classSession.findMany({
      where: {
        userId,
        weekday,
        effectiveFrom: { lte: targetDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: targetDate } }],
        period: { isArchived: false },
        subject: { isArchived: false },
      },
      include: {
        subject: { select: { name: true, colorHex: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    const todaysClasses: DashboardClassItem[] = sessions.map((s) => ({
      sessionId: s.id,
      subjectId: s.subjectId,
      subjectName: s.subject.name,
      subjectColor: s.subject.colorHex,
      startTime: formatTime(s.startTime),
      endTime: formatTime(s.endTime),
      location: s.location,
    }));

    // 2. Overdue tasks (incomplete and dueAt < now)
    const overdueTasksDb = await prisma.task.findMany({
      where: {
        userId,
        completedAt: null,
        dueAt: { lt: new Date() },
      },
      include: { subject: { select: { name: true, colorHex: true } } },
      orderBy: { dueAt: 'asc' },
      take: 10,
    });

    // 3. Upcoming tasks (incomplete and dueAt >= now or null)
    const upcomingTasksDb = await prisma.task.findMany({
      where: {
        userId,
        completedAt: null,
        OR: [{ dueAt: { gte: new Date() } }, { dueAt: null }],
      },
      include: { subject: { select: { name: true, colorHex: true } } },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
      take: 10,
    });

    // 4. Upcoming assessments (scheduled and scheduledAt >= start of today)
    const upcomingAssessmentsDb = await prisma.assessment.findMany({
      where: {
        userId,
        status: 'SCHEDULED',
        scheduledAt: { gte: targetDate },
      },
      include: { subject: { select: { name: true, colorHex: true } } },
      orderBy: { scheduledAt: 'asc' },
      take: 10,
    });

    return {
      date: calendarDateStr,
      todaysClasses,
      overdueTasks: overdueTasksDb.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        taskType: t.taskType as any,
        subjectId: t.subjectId,
        subjectName: t.subject?.name || null,
        subjectColor: t.subject?.colorHex || null,
        periodId: t.periodId,
        dueAt: t.dueAt ? t.dueAt.toISOString() : null,
        completedAt: null,
        isCompleted: false,
        createdAt: t.createdAt.toISOString(),
      })),
      upcomingTasks: upcomingTasksDb.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        taskType: t.taskType as any,
        subjectId: t.subjectId,
        subjectName: t.subject?.name || null,
        subjectColor: t.subject?.colorHex || null,
        periodId: t.periodId,
        dueAt: t.dueAt ? t.dueAt.toISOString() : null,
        completedAt: null,
        isCompleted: false,
        createdAt: t.createdAt.toISOString(),
      })),
      upcomingAssessments: upcomingAssessmentsDb.map((a) => ({
        id: a.id,
        subjectId: a.subjectId,
        subjectName: a.subject.name,
        subjectColor: a.subject.colorHex,
        periodId: a.periodId,
        title: a.title,
        assessmentType: a.assessmentType as any,
        scheduledAt: a.scheduledAt.toISOString(),
        status: a.status as any,
        rawScore: a.rawScore ? Number(a.rawScore) : null,
        maxScore: a.maxScore ? Number(a.maxScore) : null,
        weight: Number(a.weight),
        notes: a.notes,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  },
};
