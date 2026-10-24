import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import {
  UniTrackApiClient,
  OfflineSyncEngine,
  MemoryOfflineAdapter,
} from '../../../packages/api-client/src/index';

const E2E_EMAIL = `e2e-journey-${Date.now()}@unitrack.test`;
const PASSWORD = 'E2E!SecurePassword99';

let token: string;
let userId: string;

describe('UniTrack End-to-End Workflow Verification', () => {
  beforeAll(async () => {
    // 1. Register
    const regRes = await request(app).post('/api/v1/auth/register').send({
      email: E2E_EMAIL,
      password: PASSWORD,
      displayName: 'E2E Tester',
      languageCode: 'en',
    });
    expect(regRes.status).toBe(201);

    const user = await prisma.user.findUnique({ where: { email: E2E_EMAIL } });
    userId = user!.id;

    // Login
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: E2E_EMAIL,
      password: PASSWORD,
    });
    expect(loginRes.status).toBe(200);
    token = loginRes.body.accessToken;
  });

  afterAll(async () => {
    if (userId) {
      await prisma.user.delete({ where: { id: userId } });
    }
  });

  // ---------------------------------------------------------------------------
  // Journey 1: Register -> Contexts -> Commitment -> Today -> Attend
  // ---------------------------------------------------------------------------
  describe('Journey 1: Register, Contexts, Commitments & Attendance', () => {
    let customContextId: string;
    let commitmentId: string;

    it('verifies seeded contexts and creates a custom context', async () => {
      const getRes = await request(app)
        .get('/api/v1/contexts')
        .set('Authorization', `Bearer ${token}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.data.length).toBeGreaterThanOrEqual(3);

      const createRes = await request(app)
        .post('/api/v1/contexts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Research & Writing',
          colorHex: '#8B5CF6',
          icon: 'book-open',
        });
      expect(createRes.status).toBe(201);
      customContextId = createRes.body.id;
    });

    it('creates a commitment with the context and verifies presence in Today stream', async () => {
      const todayDate = new Date().toISOString().split('T')[0];
      const createRes = await request(app)
        .post('/api/v1/commitments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Deep Editorial Review',
          contextId: customContextId,
          isRecurring: false,
          specificDate: todayDate,
          startTime: '14:00',
          endTime: '15:30',
        });
      expect(createRes.status).toBe(201);
      commitmentId = createRes.body.id;

      // Check Today stream
      const todayRes = await request(app)
        .get(`/api/v1/today?date=${todayDate}`)
        .set('Authorization', `Bearer ${token}`);
      expect(todayRes.status).toBe(200);

      const match = todayRes.body.commitments.find((c: any) => c.id === commitmentId);
      expect(match).toBeDefined();
      expect(match.title).toBe('Deep Editorial Review');
      expect(match.contextName).toBe('Research & Writing');
      expect(match.status).toBe('SCHEDULED');
    });

    it('records ATTENDED attendance log and confirms updated status in Today', async () => {
      const todayDate = new Date().toISOString().split('T')[0];
      const logRes = await request(app)
        .post(`/api/v1/commitments/${commitmentId}/occurrences/${todayDate}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: 'ATTENDED',
          notes: 'Completed review on time',
        });
      expect(logRes.status).toBe(200);
      expect(logRes.body.status).toBe('ATTENDED');

      // Verify Today stream reflects attended status
      const todayRes = await request(app)
        .get(`/api/v1/today?date=${todayDate}`)
        .set('Authorization', `Bearer ${token}`);
      const match = todayRes.body.commitments.find((c: any) => c.id === commitmentId);
      expect(match.status).toBe('ATTENDED');
    });
  });

  // ---------------------------------------------------------------------------
  // Journey 2: Tasks Lifecycle: Create, Complete, Postpone, Reopen
  // ---------------------------------------------------------------------------
  describe('Journey 2: Universal Tasks Complete Lifecycle', () => {
    let taskId: string;
    let version = 1;

    it('creates a task with priority and initial pending state', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Finalize Monorepo Audit',
          priority: 'HIGH',
          taskType: 'HOMEWORK',
        });
      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Finalize Monorepo Audit');
      expect(res.body.isCompleted).toBe(false);
      expect(res.body.status).toBe('PENDING');
      taskId = res.body.id;
      version = res.body.version;
    });

    it('completes the task and sets completedAt timestamp', async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: 'COMPLETED',
          version,
        });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('COMPLETED');
      expect(res.body.isCompleted).toBe(true);
      expect(res.body.completedAt).not.toBeNull();
      version = res.body.version;
    });

    it('postpones the task and increments postponedCount', async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: 'POSTPONED',
          version,
        });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('POSTPONED');
      expect(res.body.isCompleted).toBe(false);
      expect(res.body.postponedCount).toBe(1);
      version = res.body.version;
    });

    it('reopens the task back to pending', async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: 'PENDING',
          version,
        });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('PENDING');
      expect(res.body.isCompleted).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Journey 3: Habits Lifecycle, Logging, Skips & Streak Recalculation
  // ---------------------------------------------------------------------------
  describe('Journey 3: Habits & Streak Verification', () => {
    let habitId: string;

    it('creates a habit and logs completions and skips over several days', async () => {
      const createRes = await request(app)
        .post('/api/v1/habits')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: '30-minute Architecture Reading',
          frequencyType: 'DAILY',
          targetUnits: 30,
          unitLabel: 'minutes',
        });
      expect(createRes.status).toBe(201);
      habitId = createRes.body.id;

      // Log 3 days:
      // Day 1: Completed
      const l1 = await request(app)
        .post(`/api/v1/habits/${habitId}/logs`)
        .set('Authorization', `Bearer ${token}`)
        .send({ date: '2026-10-21', status: 'COMPLETED', completedUnits: 30 });
      expect(l1.status).toBe(200);

      // Day 2: Skipped (forgiven, does not reset streak)
      const l2 = await request(app)
        .post(`/api/v1/habits/${habitId}/logs`)
        .set('Authorization', `Bearer ${token}`)
        .send({ date: '2026-10-22', status: 'SKIPPED', notes: 'Conference day' });
      expect(l2.status).toBe(200);

      // Day 3: Completed
      const l3 = await request(app)
        .post(`/api/v1/habits/${habitId}/logs`)
        .set('Authorization', `Bearer ${token}`)
        .send({ date: '2026-10-23', status: 'COMPLETED', completedUnits: 45 });
      expect(l3.status).toBe(200);

      // Fetch habit details to verify streaks
      const habitRes = await request(app)
        .get('/api/v1/habits')
        .set('Authorization', `Bearer ${token}`);
      expect(habitRes.status).toBe(200);

      const target = habitRes.body.data.find((h: any) => h.id === habitId);
      expect(target).toBeDefined();
      expect(target.currentStreak).toBeGreaterThanOrEqual(1);
      expect(target.longestStreak).toBeGreaterThanOrEqual(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Journey 4: Goals, Milestones & Automatic Progress Updates
  // ---------------------------------------------------------------------------
  describe('Journey 4: Goals & Milestone Progress Recalculation', () => {
    let goalId: string;
    let m1Id: string;
    let m2Id: string;

    it('creates a goal with 2 milestones at 0% progress', async () => {
      const res = await request(app)
        .post('/api/v1/goals')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Publish Production Benchmark',
          initialMilestones: [
            { title: 'Benchmarking script', sortOrder: 0 },
            { title: 'Write and publish report', sortOrder: 1 },
          ],
        });
      expect(res.status).toBe(201);
      expect(res.body.progressPercentage).toBe(0);
      expect(res.body.status).toBe('IN_PROGRESS');
      goalId = res.body.id;
      m1Id = res.body.milestones[0].id;
      m2Id = res.body.milestones[1].id;
    });

    it('completing 1 of 2 milestones scales progress to 50%', async () => {
      const res = await request(app)
        .patch(`/api/v1/goals/${goalId}/milestones/${m1Id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isCompleted: true });
      expect(res.status).toBe(200);

      const goalRes = await request(app)
        .get(`/api/v1/goals/${goalId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(goalRes.body.progressPercentage).toBe(50);
      expect(goalRes.body.status).toBe('IN_PROGRESS');
    });

    it('completing second milestone achieves 100% and marks goal COMPLETED', async () => {
      const res = await request(app)
        .patch(`/api/v1/goals/${goalId}/milestones/${m2Id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isCompleted: true });
      expect(res.status).toBe(200);

      const goalRes = await request(app)
        .get(`/api/v1/goals/${goalId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(goalRes.body.progressPercentage).toBe(100);
      expect(goalRes.body.status).toBe('COMPLETED');
    });

    it('unchecking a milestone reverts progress and resets goal status to IN_PROGRESS', async () => {
      const res = await request(app)
        .patch(`/api/v1/goals/${goalId}/milestones/${m2Id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isCompleted: false });
      expect(res.status).toBe(200);

      const goalRes = await request(app)
        .get(`/api/v1/goals/${goalId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(goalRes.body.progressPercentage).toBe(50);
      expect(goalRes.body.status).toBe('IN_PROGRESS');
    });
  });

  // ---------------------------------------------------------------------------
  // Journey 5: Weekly Planning & Review Persistence
  // ---------------------------------------------------------------------------
  describe('Journey 5: Weekly Planning & Review', () => {
    const monday = '2026-10-19';

    it('saves and re-reads a weekly review with automated metrics snapshot', async () => {
      const saveRes = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${token}`)
        .send({
          weekStart: monday,
          reflections: {
            whatWentWell: 'Completed end-to-end testing with 100% pass rate',
            whatToImprove: 'Earlier morning routine',
            keyTakeaways: 'Continuous verification prevents regression',
          },
          intentions: ['Deploy staging release', 'Review audit feedback'],
        });
      expect(saveRes.status).toBe(200);
      expect(saveRes.body.weekStart).toBe(monday);

      // Reopen review by week
      const fetchRes = await request(app)
        .get(`/api/v1/reviews/${monday}`)
        .set('Authorization', `Bearer ${token}`);
      expect(fetchRes.status).toBe(200);
      expect(fetchRes.body.reflections.whatWentWell).toBe(
        'Completed end-to-end testing with 100% pass rate'
      );
      expect(fetchRes.body.intentions).toContain('Deploy staging release');
      expect(fetchRes.body.metrics).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Journey 6: Academic Hub Coexistence & Today Integration
  // ---------------------------------------------------------------------------
  describe('Journey 6: Academic Hub Coexistence', () => {
    let periodId: string;
    let subjectId: string;
    let classSessionId: string;

    it('creates academic period, subject, and class session', async () => {
      const periodRes = await request(app)
        .post('/api/v1/periods')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Fall 2026 Term',
          type: 'SEMESTER',
          startDate: '2026-09-01',
          endDate: '2026-12-31',
        });
      expect(periodRes.status).toBe(201);
      periodId = periodRes.body.id;

      const subjectRes = await request(app)
        .post(`/api/v1/periods/${periodId}/subjects`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Distributed Systems',
          code: 'CS-401',
          credits: 4,
          colorTheme: '#3B82F6',
        });
      expect(subjectRes.status).toBe(201);
      subjectId = subjectRes.body.id;

      // Class session on weekday 1 (Monday)
      const sessionRes = await request(app)
        .post('/api/v1/timetable')
        .set('Authorization', `Bearer ${token}`)
        .send({
          subjectId,
          weekday: 1,
          startTime: '10:00',
          endTime: '11:30',
          location: 'Hall B-12',
          effectiveFrom: '2026-09-01',
        });
      expect(sessionRes.status).toBe(201);
      classSessionId = sessionRes.body.id;
    });

    it('unifies academic class session in Today stream labeled with source ACADEMIC', async () => {
      // Monday date
      const mondayDate = '2026-10-19';
      const res = await request(app)
        .get(`/api/v1/today?date=${mondayDate}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);

      const academicItem = res.body.commitments.find(
        (c: any) => c.source === 'ACADEMIC' && c.id === classSessionId
      );
      expect(academicItem).toBeDefined();
      expect(academicItem.title).toContain('Distributed Systems');
      expect(academicItem.location).toBe('Hall B-12');
    });
  });

  // ---------------------------------------------------------------------------
  // Journey 7: Client-side OfflineSyncEngine Real Synchronization
  // ---------------------------------------------------------------------------
  describe('Journey 7: OfflineSyncEngine Batch Processing & Conflict Handling', () => {
    it('enqueues mutations offline, then synchronizes them to server and clears queue', async () => {
      // Create mock client pointing to in-process app
      const testClient = new UniTrackApiClient({
        baseUrl: 'http://localhost:3000',
        clientType: 'web',
      });
      // Monkey-patch request to use supertest app
      (testClient as any).request = async (path: string, options: any) => {
        const method = (options.method || 'GET').toLowerCase();
        const req = (request(app) as any)[method](path).set(
          'Authorization',
          `Bearer ${token}`
        );
        if (options.body) {
          req.send(JSON.parse(options.body));
        }
        const res = await req;
        if (res.status >= 400) {
          throw new Error(res.body?.error?.message || `HTTP ${res.status}`);
        }
        return res.body;
      };

      const storage = new MemoryOfflineAdapter();
      const engine = new OfflineSyncEngine({
        api: testClient,
        storage,
        autoSyncOnReconnect: false,
      });

      // 1. Enqueue task creation mutation while "offline"
      engine.setOnline(false);
      const enqueuedTask = await engine.enqueueMutation({
        entityType: 'TASK',
        action: 'CREATE',
        entityId: 'offline-temp-task-01',
        payload: {
          title: 'Offline Queued Verification Task',
          priority: 'URGENT',
        },
      });

      expect(engine.getPendingMutations()).toHaveLength(1);
      expect(engine.getState().pendingCount).toBe(1);

      // 2. Reconnect and sync
      engine.setOnline(true);
      const syncResult = await engine.sync();

      expect(syncResult).not.toBeNull();
      expect(syncResult!.processedMutationIds).toContain(enqueuedTask.clientMutationId);
      expect(engine.getPendingMutations()).toHaveLength(0);
      expect(engine.getState().pendingCount).toBe(0);

      // 3. Verify task actually exists in the database
      const tasksRes = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${token}`);
      const found = tasksRes.body.data.find(
        (t: any) => t.title === 'Offline Queued Verification Task'
      );
      expect(found).toBeDefined();
      expect(found.priority).toBe('URGENT');
    });
  });
});
