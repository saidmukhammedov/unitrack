import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { calculateHabitStreaks } from '../src/services/habit.service';

const TEST_EMAIL = `prod-test-${Date.now()}@example.com`;
const PASSWORD = 'Str0ng!Password123';

let token: string;
let userId: string;

describe('Universal Productivity Flow (The Chronicle)', () => {
  beforeAll(async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send({
      email: TEST_EMAIL,
      password: PASSWORD,
      displayName: 'Chronicle User',
      languageCode: 'en',
    });
    expect(regRes.status).toBe(201);

    const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    userId = user!.id;

    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: TEST_EMAIL,
      password: PASSWORD,
    });
    token = loginRes.body.accessToken;
  });

  afterAll(async () => {
    if (userId) {
      await prisma.user.delete({ where: { id: userId } });
    }
  });

  // ---------------------------------------------------------------------------
  // 1. Contexts & Seeding Idempotency
  // ---------------------------------------------------------------------------
  describe('Contexts & Seeding', () => {
    it('seeds default Personal, Work, and Study contexts on registration', async () => {
      const res = await request(app)
        .get('/api/v1/contexts')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(3);
      const names = res.body.data.map((c: any) => c.name);
      expect(names).toContain('Personal');
      expect(names).toContain('Work');
      expect(names).toContain('Study');
    });

    it('creates a custom context and prevents duplicate names', async () => {
      const createRes = await request(app)
        .post('/api/v1/contexts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Fitness',
          colorHex: '#EF4444',
          icon: 'activity',
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.name).toBe('Fitness');

      // Duplicate attempt
      const dupRes = await request(app)
        .post('/api/v1/contexts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Fitness',
          colorHex: '#EF4444',
        });

      expect(dupRes.status).toBe(409);
      expect(dupRes.body.error.code).toBe('CONTEXT_ALREADY_EXISTS');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Schedule Commitments & Concurrency
  // ---------------------------------------------------------------------------
  describe('Schedule Commitments & Occurrences', () => {
    let commitmentId: string;

    it('creates a recurring weekly commitment', async () => {
      const res = await request(app)
        .post('/api/v1/commitments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Morning Deep Work',
          isRecurring: true,
          weekday: 1, // Monday
          startTime: '09:00',
          endTime: '11:30',
          effectiveFrom: '2026-10-01',
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Morning Deep Work');
      expect(res.body.isRecurring).toBe(true);
      expect(res.body.version).toBe(1);
      commitmentId = res.body.id;
    });

    it('enforces optimistic concurrency control (OCC 409) on outdated version', async () => {
      // First update succeeds and increments version to 2
      const firstUpdate = await request(app)
        .patch(`/api/v1/commitments/${commitmentId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Morning Deep Work (Focus)',
          version: 1,
        });
      expect(firstUpdate.status).toBe(200);
      expect(firstUpdate.body.version).toBe(2);

      // Concurrent update attempting to use stale version 1 fails
      const conflictRes = await request(app)
        .patch(`/api/v1/commitments/${commitmentId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Stale Update',
          version: 1,
        });
      expect(conflictRes.status).toBe(409);
      expect(conflictRes.body.error.code).toBe('VERSION_CONFLICT');
    });

    it('logs occurrence status (ATTENDED / CANCELLED / RESCHEDULED) for specific date', async () => {
      const logRes = await request(app)
        .post(`/api/v1/commitments/${commitmentId}/occurrences/2026-10-26`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: 'ATTENDED',
          notes: 'Completed full 2.5 hours uninterrupted',
        });

      expect(logRes.status).toBe(200);
      expect(logRes.body.status).toBe('ATTENDED');
      expect(logRes.body.notes).toBe('Completed full 2.5 hours uninterrupted');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Habit Streaks & Backdated Entries
  // ---------------------------------------------------------------------------
  describe('Habits & Deterministic Streaks', () => {
    let habitId: string;

    it('creates a daily habit', async () => {
      const res = await request(app)
        .post('/api/v1/habits')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Read 20 pages',
          frequencyType: 'DAILY',
          targetUnits: 20,
          unitLabel: 'pages',
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Read 20 pages');
      expect(res.body.currentStreak).toBe(0);
      habitId = res.body.id;
    });

    it('recalculates streak correctly with backdated entries and skipped day forgiveness', async () => {
      // Backdate logs:
      // Day -3: COMPLETED
      // Day -2: SKIPPED (forgiven, streak maintained)
      // Day -1: COMPLETED
      const d1 = '2026-10-20';
      const d2 = '2026-10-21';
      const d3 = '2026-10-22';

      await request(app)
        .post(`/api/v1/habits/${habitId}/logs`)
        .set('Authorization', `Bearer ${token}`)
        .send({ date: d1, status: 'COMPLETED', completedUnits: 20 });

      await request(app)
        .post(`/api/v1/habits/${habitId}/logs`)
        .set('Authorization', `Bearer ${token}`)
        .send({ date: d2, status: 'SKIPPED', notes: 'Traveling' });

      const res3 = await request(app)
        .post(`/api/v1/habits/${habitId}/logs`)
        .set('Authorization', `Bearer ${token}`)
        .send({ date: d3, status: 'COMPLETED', completedUnits: 25 });

      expect(res3.status).toBe(200);

      // Verify streak algorithm via unit test
      const streaks = calculateHabitStreaks(
        { frequencyType: 'DAILY', selectedWeekdays: [], targetPerWeek: null },
        [
          { date: new Date('2026-10-20T00:00:00Z'), status: 'COMPLETED' },
          { date: new Date('2026-10-21T00:00:00Z'), status: 'SKIPPED' },
          { date: new Date('2026-10-22T00:00:00Z'), status: 'COMPLETED' },
        ],
        new Date('2026-10-22T12:00:00Z')
      );

      // 2 completed days + 1 skipped = streak of 2 completed days unbroken
      expect(streaks.currentStreak).toBe(2);
      expect(streaks.longestStreak).toBe(2);
    });

    it('calculates weekly target habit streak including active week in progress', () => {
      const streaks = calculateHabitStreaks(
        { frequencyType: 'WEEKLY_TARGET', selectedWeekdays: [], targetPerWeek: 3 },
        [
          // Previous week: 3 completions
          { date: new Date('2026-10-12T00:00:00Z'), status: 'COMPLETED' },
          { date: new Date('2026-10-14T00:00:00Z'), status: 'COMPLETED' },
          { date: new Date('2026-10-16T00:00:00Z'), status: 'COMPLETED' },
          // Current week: 1 completion so far (week in progress)
          { date: new Date('2026-10-20T00:00:00Z'), status: 'COMPLETED' },
        ],
        new Date('2026-10-22T12:00:00Z')
      );

      // Previous week met target (streak = 1 week unbroken)
      expect(streaks.currentStreak).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Chronicle Today Stream Endpoint
  // ---------------------------------------------------------------------------
  describe('GET /api/v1/today', () => {
    it('returns unified view with contexts, commitments, prioritized tasks, and habits', async () => {
      // Create high-priority task
      await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Submit Quarterly Report',
          priority: 'URGENT',
        });

      const res = await request(app)
        .get('/api/v1/today')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('date');
      expect(res.body).toHaveProperty('timezone');
      expect(Array.isArray(res.body.contexts)).toBe(true);
      expect(Array.isArray(res.body.commitments)).toBe(true);
      expect(Array.isArray(res.body.tasks)).toBe(true);
      expect(Array.isArray(res.body.habits)).toBe(true);

      // Top intentions should contain the urgent task
      expect(res.body.topIntentions).toContain('Submit Quarterly Report');
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Goals & Milestones Progress Flow
  // ---------------------------------------------------------------------------
  describe('Goals & Milestones', () => {
    let goalId: string;
    let milestoneId: string;

    it('creates a goal with initial milestones', async () => {
      const res = await request(app)
        .post('/api/v1/goals')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Launch Personal Portfolio',
          description: 'Ship high performance site',
          initialMilestones: [
            { title: 'Draft content & designs', sortOrder: 0 },
            { title: 'Develop frontend components', sortOrder: 1 },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Launch Personal Portfolio');
      expect(res.body.milestones).toHaveLength(2);
      expect(res.body.progressPercentage).toBe(0);
      goalId = res.body.id;
      milestoneId = res.body.milestones[0].id;
    });

    it('completing a milestone automatically updates goal progress percentage', async () => {
      const updateRes = await request(app)
        .patch(`/api/v1/goals/${goalId}/milestones/${milestoneId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          isCompleted: true,
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.isCompleted).toBe(true);

      // Verify goal has 50% progress
      const goalRes = await request(app)
        .get(`/api/v1/goals/${goalId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(goalRes.status).toBe(200);
      expect(goalRes.body.progressPercentage).toBe(50);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Weekly Planning & Review Flow
  // ---------------------------------------------------------------------------
  describe('Weekly Planning & Review', () => {
    it('saves reflection and intentions for a week', async () => {
      const weekStart = '2026-10-19';
      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${token}`)
        .send({
          weekStart,
          reflections: {
            whatWentWell: 'High focus and consistent habits',
            whatToImprove: 'Sleep schedule consistency',
            keyTakeaways: 'Deep work blocks in the morning work best',
          },
          intentions: ['Ship UniTrack v2.2', 'Run 15km total'],
        });

      expect(res.status).toBe(200);
      expect(res.body.weekStart).toBe(weekStart);
      expect(res.body.reflections.whatWentWell).toBe('High focus and consistent habits');
      expect(res.body.intentions).toHaveLength(2);
      expect(typeof res.body.metrics.commitmentsAttended).toBe('number');
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Offline Sync Engine
  // ---------------------------------------------------------------------------
  describe('Offline Sync & Conflict Engine', () => {
    it('processes batch mutations and returns sync changes without failing on isolated conflict', async () => {
      const res = await request(app)
        .post('/api/v1/sync')
        .set('Authorization', `Bearer ${token}`)
        .send({
          mutations: [
            {
              clientMutationId: 'mut-1',
              entityType: 'TASK',
              action: 'CREATE',
              entityId: 'temp-task-1',
              payload: {
                title: 'Offline Created Task',
                priority: 'HIGH',
              },
              clientTimestamp: new Date().toISOString(),
            },
            {
              clientMutationId: 'mut-2',
              entityType: 'TASK',
              action: 'UPDATE',
              entityId: '00000000-0000-0000-0000-000000000000', // Non-existent ID triggers conflict
              payload: { title: 'Ghost update' },
              clientTimestamp: new Date().toISOString(),
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.processedMutationIds).toContain('mut-1');
      expect(res.body.conflicts).toHaveLength(1);
      expect(res.body.conflicts[0].clientMutationId).toBe('mut-2');
      expect(Array.isArray(res.body.changes.tasks)).toBe(true);
    });
  });
});
