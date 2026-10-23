import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';

const USER_A_EMAIL = `user-a-${Date.now()}@example.com`;
const USER_B_EMAIL = `user-b-${Date.now()}@example.com`;
const PASSWORD = 'Str0ng!Password123';

let tokenA: string;
let tokenB: string;
let userAId: string;
let userBId: string;

let periodId: string;
let subjectId: string;
let sessionId: string;
let taskId: string;
let assessmentId: string;

describe('Academic Core Flow (Phase 4)', () => {
  beforeAll(async () => {
    // 1. Create and verify User A
    await request(app).post('/api/v1/auth/register').send({
      email: USER_A_EMAIL,
      password: PASSWORD,
      displayName: 'User A',
      languageCode: 'en',
    });
    const userA = await prisma.user.findUnique({ where: { email: USER_A_EMAIL } });
    userAId = userA!.id;
    await prisma.user.update({
      where: { id: userAId },
      data: { emailVerified: true, timezone: 'Asia/Tashkent' },
    });
    const loginA = await request(app).post('/api/v1/auth/login').send({
      email: USER_A_EMAIL,
      password: PASSWORD,
    });
    tokenA = loginA.body.accessToken;

    // 2. Create and verify User B (for cross-user isolation tests)
    await request(app).post('/api/v1/auth/register').send({
      email: USER_B_EMAIL,
      password: PASSWORD,
      displayName: 'User B',
      languageCode: 'en',
    });
    const userB = await prisma.user.findUnique({ where: { email: USER_B_EMAIL } });
    userBId = userB!.id;
    await prisma.user.update({
      where: { id: userBId },
      data: { emailVerified: true },
    });
    const loginB = await request(app).post('/api/v1/auth/login').send({
      email: USER_B_EMAIL,
      password: PASSWORD,
    });
    tokenB = loginB.body.accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [USER_A_EMAIL, USER_B_EMAIL] } },
    });
    await prisma.$disconnect();
  });

  // ---------------------------------------------------------------------------
  // 1. Academic Periods
  // ---------------------------------------------------------------------------
  describe('Academic Periods (/api/v1/periods)', () => {
    it('rejects period creation when endDate < startDate with 400', async () => {
      const res = await request(app)
        .post('/api/v1/periods')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: 'Invalid Period',
          type: 'SEMESTER',
          startDate: '2026-09-01',
          endDate: '2026-06-01',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('creates an academic period successfully', async () => {
      const res = await request(app)
        .post('/api/v1/periods')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: 'Spring 2026',
          type: 'SEMESTER',
          startDate: '2026-02-01',
          endDate: '2026-06-30',
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Spring 2026');
      expect(res.body.startDate).toBe('2026-02-01');
      expect(res.body.endDate).toBe('2026-06-30');
      periodId = res.body.id;
    });

    it('lists periods for user', async () => {
      const res = await request(app)
        .get('/api/v1/periods')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(periodId);
    });

    it('enforces isolation: User B cannot access User A period', async () => {
      const res = await request(app)
        .get(`/api/v1/periods/${periodId}`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(404);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Subjects
  // ---------------------------------------------------------------------------
  describe('Subjects (/api/v1/periods/:periodId/subjects & /api/v1/subjects/:id)', () => {
    it('rejects subject creation with invalid hex color', async () => {
      const res = await request(app)
        .post(`/api/v1/periods/${periodId}/subjects`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: 'Mathematics',
          colorHex: 'not-a-color',
        });

      expect(res.status).toBe(400);
    });

    it('creates a subject within a period successfully', async () => {
      const res = await request(app)
        .post(`/api/v1/periods/${periodId}/subjects`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: 'Computer Science',
          colorHex: '#4A90D9',
          teacherName: 'Dr. Turing',
          creditHours: 4.0,
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Computer Science');
      expect(res.body.creditHours).toBe(4.0);
      expect(res.body.periodId).toBe(periodId);
      subjectId = res.body.id;
    });

    it('retrieves subject by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/subjects/${subjectId}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(subjectId);
    });

    it('enforces isolation: User B cannot view or edit User A subject', async () => {
      const getRes = await request(app)
        .get(`/api/v1/subjects/${subjectId}`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(getRes.status).toBe(404);

      const patchRes = await request(app)
        .patch(`/api/v1/subjects/${subjectId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ name: 'Hacked' });
      expect(patchRes.status).toBe(404);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Timetable (Class Sessions)
  // ---------------------------------------------------------------------------
  describe('Timetable (/api/v1/timetable)', () => {
    it('rejects class session where endTime <= startTime', async () => {
      const res = await request(app)
        .post('/api/v1/timetable')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          subjectId,
          weekday: 1, // Monday
          startTime: '10:00',
          endTime: '09:00', // Invalid!
          effectiveFrom: '2026-02-01',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('creates class session deriving periodId automatically from Subject.periodId', async () => {
      const res = await request(app)
        .post('/api/v1/timetable')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          subjectId,
          weekday: 1, // Monday
          startTime: '09:00',
          endTime: '10:30',
          location: 'Lab 301',
          effectiveFrom: '2026-02-01',
          effectiveTo: '2026-06-30',
        });

      expect(res.status).toBe(201);
      expect(res.body.periodId).toBe(periodId); // Automatically derived
      expect(res.body.startTime).toBe('09:00');
      expect(res.body.endTime).toBe('10:30');
      sessionId = res.body.id;

      // Verify compound foreign key directly in DB
      const dbSession = await prisma.classSession.findUnique({ where: { id: sessionId } });
      expect(dbSession!.periodId).toBe(periodId);
      expect(dbSession!.subjectId).toBe(subjectId);
    });

    it('rejects attempt to alter periodId on PATCH with 400', async () => {
      const res = await request(app)
        .patch(`/api/v1/timetable/${sessionId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          periodId: '00000000-0000-0000-0000-000000000000',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('periodId is immutable');
    });

    it('lists timetable entries filtered by weekday', async () => {
      const res = await request(app)
        .get('/api/v1/timetable?weekday=1')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(sessionId);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Tasks
  // ---------------------------------------------------------------------------
  describe('Tasks (/api/v1/tasks)', () => {
    it('creates a task with due date and subject', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Implement Binary Search',
          description: 'Write test cases in TypeScript',
          taskType: 'HOMEWORK',
          subjectId,
          dueAt: '2026-03-15T18:00:00.000Z',
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('Implement Binary Search');
      expect(res.body.isCompleted).toBe(false);
      taskId = res.body.id;
    });

    it('marks task complete and updates completedAt', async () => {
      const completedTimestamp = '2026-03-14T20:00:00.000Z';
      const res = await request(app)
        .patch(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ completedAt: completedTimestamp });

      expect(res.status).toBe(200);
      expect(res.body.isCompleted).toBe(true);

      // Verify default list (completed=false) no longer returns it
      const listRes = await request(app)
        .get('/api/v1/tasks?completed=false')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(listRes.body.data.find((t: any) => t.id === taskId)).toBeUndefined();

      // List with completed=true returns it
      const completedList = await request(app)
        .get('/api/v1/tasks?completed=true')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(completedList.body.data.find((t: any) => t.id === taskId)).toBeDefined();
    });

    it('supports cursor pagination across multiple tasks', async () => {
      // Create 25 tasks for User B
      for (let i = 1; i <= 25; i++) {
        await prisma.task.create({
          data: {
            userId: userBId,
            title: `Batch Task ${i}`,
            taskType: 'HOMEWORK',
          },
        });
      }

      // First page limit=10
      const page1 = await request(app)
        .get('/api/v1/tasks?limit=10')
        .set('Authorization', `Bearer ${tokenB}`);

      expect(page1.status).toBe(200);
      expect(page1.body.data.length).toBe(10);
      expect(page1.body.nextCursor).toBeDefined();

      // Second page with cursor
      const page2 = await request(app)
        .get(`/api/v1/tasks?limit=10&cursor=${page1.body.nextCursor}`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(page2.status).toBe(200);
      expect(page2.body.data.length).toBe(10);
      // Items must be distinct
      expect(page1.body.data[0].id).not.toBe(page2.body.data[0].id);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Assessments & Score Integrity (D-01 / A-01)
  // ---------------------------------------------------------------------------
  describe('Assessments (/api/v1/assessments)', () => {
    it('creates an assessment deriving periodId automatically from subject', async () => {
      const res = await request(app)
        .post('/api/v1/assessments')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          subjectId,
          title: 'Algorithms Midterm',
          assessmentType: 'MIDTERM',
          scheduledAt: '2026-03-20T10:00:00.000Z',
          weight: 0.35,
          notes: 'Open book',
        });

      expect(res.status).toBe(201);
      expect(res.body.periodId).toBe(periodId);
      expect(res.body.status).toBe('SCHEDULED');
      expect(res.body.weight).toBe(0.35);
      assessmentId = res.body.id;
    });

    it('enforces D-01: marking COMPLETED without scores returns 400', async () => {
      const res = await request(app)
        .patch(`/api/v1/assessments/${assessmentId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          status: 'COMPLETED',
          rawScore: null,
          maxScore: null,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('enforces D-01: rejects maxScore <= 0 with 400', async () => {
      const res = await request(app)
        .patch(`/api/v1/assessments/${assessmentId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          maxScore: 0,
        });

      expect(res.status).toBe(400);
    });

    it('enforces D-01: rejects rawScore < 0 with 400', async () => {
      const res = await request(app)
        .patch(`/api/v1/assessments/${assessmentId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          rawScore: -5,
        });

      expect(res.status).toBe(400);
    });

    it('permits extra credit rawScore > maxScore and emits warning notice', async () => {
      const res = await request(app)
        .patch(`/api/v1/assessments/${assessmentId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          status: 'COMPLETED',
          rawScore: 105,
          maxScore: 100,
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('COMPLETED');
      expect(res.body.rawScore).toBe(105);
      expect(res.body.maxScore).toBe(100);
      expect(res.body.warning).toBe('RAW_SCORE_EXCEEDS_MAX');
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Dashboard Aggregation (/api/v1/dashboard)
  // ---------------------------------------------------------------------------
  describe('Dashboard (/api/v1/dashboard)', () => {
    it('aggregates classes, tasks, and assessments for specified date', async () => {
      // 2026-02-02 was a Monday (weekday = 1)
      const res = await request(app)
        .get('/api/v1/dashboard?date=2026-02-02')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.date).toBe('2026-02-02');
      expect(res.body.todaysClasses.length).toBe(1);
      expect(res.body.todaysClasses[0].subjectName).toBe('Computer Science');
      expect(res.body.todaysClasses[0].startTime).toBe('09:00');
      expect(res.body.todaysClasses[0].location).toBe('Lab 301');
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Database Cascade & Foreign Key Integrity
  // ---------------------------------------------------------------------------
  describe('Database Cascade Deletion', () => {
    it('deleting AcademicPeriod cascades and deletes all child subjects, sessions, and assessments', async () => {
      const deleteRes = await request(app)
        .delete(`/api/v1/periods/${periodId}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(deleteRes.status).toBe(204);

      // Verify subject is deleted
      const sub = await prisma.subject.findUnique({ where: { id: subjectId } });
      expect(sub).toBeNull();

      // Verify session is deleted
      const ses = await prisma.classSession.findUnique({ where: { id: sessionId } });
      expect(ses).toBeNull();

      // Verify assessment is deleted
      const asm = await prisma.assessment.findUnique({ where: { id: assessmentId } });
      expect(asm).toBeNull();
    });
  });
});
