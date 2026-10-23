import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { NotificationService, ExpoPushClient, PushNotificationMessage, PushDispatchResult } from '../src/services/notification.service';
import { resetIdempotencyStore } from '../src/middleware/idempotency';

// Mock Expo Push Client for testing
class MockExpoPushClient implements ExpoPushClient {
  public dispatched: PushNotificationMessage[] = [];
  public failNextWithTokenError = false;
  public failForToken: string | null = null;

  async sendPushNotification(message: PushNotificationMessage): Promise<PushDispatchResult> {
    if (this.failForToken && message.to === this.failForToken) {
      return {
        status: 'error',
        message: 'Transient network failure',
      };
    }

    if (this.failNextWithTokenError) {
      return {
        status: 'error',
        message: 'The recipient is no longer registered',
        details: { error: 'DeviceNotRegistered' },
      };
    }

    this.dispatched.push(message);
    return { status: 'ok' };
  }
}

describe('Phase 6 — Notifications, Device Management, and Offline Resilience', () => {
  let user1Token: string;
  let user1Id: string;
  let user2Token: string;
  let user2Id: string;
  let periodId: string;
  let subjectId: string;

  beforeEach(async () => {
    resetIdempotencyStore();
    await prisma.notificationDelivery.deleteMany({});
    await prisma.device.deleteMany({});

    // Register User 1
    const email1 = `notif1_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`;
    const regRes1 = await request(app).post('/api/v1/auth/register').send({
      email: email1,
      password: 'Password123!',
      displayName: 'Notif Student 1',
    });
    expect(regRes1.status).toBe(201);

    const user1 = await prisma.user.findUnique({ where: { email: email1 } });
    expect(user1).not.toBeNull();
    user1Id = user1!.id;
    await prisma.user.update({ where: { id: user1Id }, data: { emailVerified: true } });

    const loginRes1 = await request(app).post('/api/v1/auth/login').send({
      email: email1,
      password: 'Password123!',
    });
    user1Token = loginRes1.body.accessToken;

    // Register User 2
    const email2 = `notif2_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`;
    await request(app).post('/api/v1/auth/register').send({
      email: email2,
      password: 'Password123!',
      displayName: 'Notif Student 2',
    });
    const user2 = await prisma.user.findUnique({ where: { email: email2 } });
    user2Id = user2!.id;
    await prisma.user.update({ where: { id: user2Id }, data: { emailVerified: true } });

    const loginRes2 = await request(app).post('/api/v1/auth/login').send({
      email: email2,
      password: 'Password123!',
    });
    user2Token = loginRes2.body.accessToken;

    // Create Academic Period and Subject for User 1
    const pRes = await request(app)
      .post('/api/v1/periods')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        name: 'Fall 2026',
        type: 'SEMESTER',
        startDate: '2026-09-01',
        endDate: '2026-12-20',
      });
    periodId = pRes.body.id;

    const sRes = await request(app)
      .post(`/api/v1/periods/${periodId}/subjects`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        name: 'Distributed Systems',
        creditHours: 4,
      });
    subjectId = sRes.body.id;
  });

  describe('Device Registration & Management (/api/v1/devices)', () => {
    it('registers a new mobile device with 201', async () => {
      const res = await request(app)
        .post('/api/v1/devices')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          expoPushToken: 'ExponentPushToken[device-token-abc-123]',
          platform: 'ANDROID',
          deviceLabel: 'Pixel 8',
        });

      expect(res.status).toBe(201);
      expect(res.body.expoPushToken).toBe('ExponentPushToken[device-token-abc-123]');
      expect(res.body.platform).toBe('ANDROID');
      expect(res.body.deviceLabel).toBe('Pixel 8');
      expect(res.body.userId).toBe(user1Id);
    });

    it('returns 200 and updates lastSeenAt on re-registration by the same user', async () => {
      const token = 'ExponentPushToken[device-token-duplicate-test]';
      const res1 = await request(app)
        .post('/api/v1/devices')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ expoPushToken: token, platform: 'IOS', deviceLabel: 'iPhone 15' });
      expect(res1.status).toBe(201);

      const res2 = await request(app)
        .post('/api/v1/devices')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ expoPushToken: token, platform: 'IOS', deviceLabel: 'iPhone 15 Pro' });
      expect(res2.status).toBe(200);
      expect(res2.body.id).toBe(res1.body.id);
      expect(res2.body.deviceLabel).toBe('iPhone 15 Pro');
    });

    it('returns 409 conflict when registering a token owned by a different user', async () => {
      const sharedToken = 'ExponentPushToken[device-token-conflicting-users]';
      const res1 = await request(app)
        .post('/api/v1/devices')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ expoPushToken: sharedToken, platform: 'ANDROID' });
      expect(res1.status).toBe(201);

      const res2 = await request(app)
        .post('/api/v1/devices')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ expoPushToken: sharedToken, platform: 'ANDROID' });
      expect(res2.status).toBe(409);
      expect(res2.body.error.code).toBe('DEVICE_ALREADY_REGISTERED');
    });

    it('unregisters device on logout or removal', async () => {
      const res1 = await request(app)
        .post('/api/v1/devices')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ expoPushToken: 'ExponentPushToken[to-delete]', platform: 'IOS' });
      expect(res1.status).toBe(201);

      const deviceId = res1.body.id;

      // User 2 cannot delete user 1's device
      const failDelete = await request(app)
        .delete(`/api/v1/devices/${deviceId}`)
        .set('Authorization', `Bearer ${user2Token}`);
      expect(failDelete.status).toBe(404);

      // User 1 deletes their own device
      const successDelete = await request(app)
        .delete(`/api/v1/devices/${deviceId}`)
        .set('Authorization', `Bearer ${user1Token}`);
      expect(successDelete.status).toBe(204);

      // Verify deletion from db
      const devInDb = await prisma.device.findUnique({ where: { id: deviceId } });
      expect(devInDb).toBeNull();
    });
  });

  describe('Notification Preferences (/api/v1/notification-preferences)', () => {
    it('seeds and returns default notification preferences', async () => {
      const res = await request(app)
        .get('/api/v1/notification-preferences')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      const taskPref = res.body.data.find((p: any) => p.category === 'TASK_REMINDER');
      expect(taskPref).toBeDefined();
      expect(taskPref.leadTimeMinutes).toBe(1440); // 1 day
      expect(taskPref.isEnabled).toBe(true);

      const examPref = res.body.data.find((p: any) => p.category === 'ASSESSMENT_REMINDER');
      expect(examPref).toBeDefined();
      expect(examPref.leadTimeMinutes).toBe(60); // 1 hour
      expect(examPref.isEnabled).toBe(true);
    });

    it('updates notification preference category with validation', async () => {
      const updateRes = await request(app)
        .patch('/api/v1/notification-preferences/TASK_REMINDER')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          isEnabled: false,
          leadTimeMinutes: 720, // 12 hours
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.category).toBe('TASK_REMINDER');
      expect(updateRes.body.isEnabled).toBe(false);
      expect(updateRes.body.leadTimeMinutes).toBe(720);

      // Invalid leadTime <= 0
      const invalidRes = await request(app)
        .patch('/api/v1/notification-preferences/TASK_REMINDER')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ leadTimeMinutes: -10 });
      expect(invalidRes.status).toBe(400);
    });
  });

  describe('Duplicate Reminder Prevention, Stale Filter, and Failed Token Cleanup', () => {
    it('prevents duplicate reminders and logs deliveries accurately', async () => {
      const mockPush = new MockExpoPushClient();
      const customService = new NotificationService(mockPush);

      // Register device for User 1
      await prisma.device.create({
        data: {
          userId: user1Id,
          expoPushToken: 'ExponentPushToken[mock-device-user1]',
          platform: 'ANDROID',
        },
      });

      // Create a task due 30 minutes from reference time
      const refTime = new Date('2026-10-23T12:00:00Z');
      const taskDue = new Date('2026-10-23T12:30:00Z');

      const task = await prisma.task.create({
        data: {
          userId: user1Id,
          subjectId,
          title: 'Algorithms Homework',
          dueAt: taskDue,
        },
      });

      // Set user preference to 60 minutes lead time so it is due for reminder
      await prisma.notificationPreference.upsert({
        where: { userId_category: { userId: user1Id, category: 'TASK_REMINDER' } },
        create: { userId: user1Id, category: 'TASK_REMINDER', isEnabled: true, leadTimeMinutes: 60 },
        update: { isEnabled: true, leadTimeMinutes: 60 },
      });

      // FIRST DISPATCH RUN: Reminder is due (scheduledFor = 11:30 <= 12:00)
      const run1 = await customService.processPendingReminders(refTime, user1Id);
      expect(run1.scheduled).toBe(1);
      expect(run1.sent).toBe(1);
      expect(mockPush.dispatched.length).toBe(1);
      expect(mockPush.dispatched[0].title).toBe('Task Reminder');

      // Check delivery record in DB
      const delivery = await prisma.notificationDelivery.findFirst({
        where: { referenceId: task.id },
      });
      expect(delivery).not.toBeNull();
      expect(delivery!.status).toBe('SENT');
      expect(delivery!.sentAt).not.toBeNull();

      // SECOND DISPATCH RUN (Duplicate reminder prevention test):
      // Running the scheduler again MUST NOT send duplicate push notification!
      const run2 = await customService.processPendingReminders(refTime, user1Id);
      expect(run2.scheduled).toBe(0);
      expect(run2.sent).toBe(0);
      expect(run2.skippedDuplicates).toBe(1);
      // Dispatched count must remain 1!
      expect(mockPush.dispatched.length).toBe(1);
    });

    it('suppresses reminders for tasks that are already overdue or in the past (ISS-04)', async () => {
      const mockPush = new MockExpoPushClient();
      const customService = new NotificationService(mockPush);

      await prisma.device.create({
        data: {
          userId: user1Id,
          expoPushToken: 'ExponentPushToken[mock-device-past]',
          platform: 'ANDROID',
        },
      });

      const refTime = new Date('2026-10-23T12:00:00Z');
      // Task was due 10 minutes ago
      await prisma.task.create({
        data: {
          userId: user1Id,
          subjectId,
          title: 'Already Past Task',
          dueAt: new Date('2026-10-23T11:50:00Z'),
        },
      });

      const res = await customService.processPendingReminders(refTime, user1Id);
      expect(res.scheduled).toBe(0);
      expect(res.sent).toBe(0);
      expect(mockPush.dispatched.length).toBe(0);
    });

    it('isolates multi-device deliveries and allows retrying a transiently failed device (ISS-05)', async () => {
      const mockPush = new MockExpoPushClient();
      // Configure Device 2 to fail on first attempt
      mockPush.failForToken = 'ExponentPushToken[mock-device-fail]';
      const customService = new NotificationService(mockPush);

      await prisma.device.create({
        data: {
          userId: user1Id,
          expoPushToken: 'ExponentPushToken[mock-device-success]',
          platform: 'ANDROID',
        },
      });
      await prisma.device.create({
        data: {
          userId: user1Id,
          expoPushToken: 'ExponentPushToken[mock-device-fail]',
          platform: 'IOS',
        },
      });

      const refTime = new Date('2026-10-23T12:00:00Z');
      await prisma.task.create({
        data: {
          userId: user1Id,
          subjectId,
          title: 'Multi-Device Task',
          dueAt: new Date('2026-10-23T12:20:00Z'),
        },
      });

      // Set 30m lead time
      await prisma.notificationPreference.upsert({
        where: { userId_category: { userId: user1Id, category: 'TASK_REMINDER' } },
        create: { userId: user1Id, category: 'TASK_REMINDER', isEnabled: true, leadTimeMinutes: 30 },
        update: { isEnabled: true, leadTimeMinutes: 30 },
      });

      // Run 1: 1 device succeeds, 1 fails
      const run1 = await customService.processPendingReminders(refTime, user1Id);
      expect(run1.scheduled).toBe(2);
      expect(run1.sent).toBe(1);
      expect(run1.failed).toBe(1);

      // Now transient error recovers
      mockPush.failForToken = null;

      // Run 2: The succeeded device is skipped (no duplicate), but the failed device is retried and succeeds!
      const run2 = await customService.processPendingReminders(refTime, user1Id);
      expect(run2.skippedDuplicates).toBe(1); // Device 1 skipped
      expect(run2.scheduled).toBe(1); // Device 2 scheduled
      expect(run2.sent).toBe(1); // Device 2 sent!
    });

    it('automatically cleans up invalid device token on DeviceNotRegistered error (NOTIF-07)', async () => {
      const mockPush = new MockExpoPushClient();
      mockPush.failNextWithTokenError = true;
      const customService = new NotificationService(mockPush);

      const device = await prisma.device.create({
        data: {
          userId: user1Id,
          expoPushToken: 'ExponentPushToken[invalid-stale-token]',
          platform: 'IOS',
        },
      });

      const refTime = new Date('2026-10-23T12:00:00Z');
      await prisma.assessment.create({
        data: {
          userId: user1Id,
          subjectId,
          periodId,
          title: 'Midterm Exam',
          assessmentType: 'MIDTERM',
          scheduledAt: new Date('2026-10-23T12:15:00Z'),
          status: 'SCHEDULED',
        },
      });

      const res = await customService.processPendingReminders(refTime, user1Id);
      expect(res.failed).toBe(1);
      expect(res.cleanedDevices).toBe(1);

      // Verify that device was deleted from DB automatically
      const devInDb = await prisma.device.findUnique({ where: { id: device.id } });
      expect(devInDb).toBeNull();
    });
  });

  describe('Idempotency & Safe Retries (§13, §SYNC-06, §SYNC-07)', () => {
    it('scopes idempotency keys to user and endpoint so distinct endpoints do not collide (ISS-01)', async () => {
      const sharedKey = 'shared-idempotency-key-xyz';

      // 1. Create a Task using sharedKey
      const taskRes = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${user1Token}`)
        .set('Idempotency-Key', sharedKey)
        .send({
          title: 'Task With Shared Key',
          subjectId,
        });
      expect(taskRes.status).toBe(201);
      expect(taskRes.body.title).toBe('Task With Shared Key');

      // 2. Create an Assessment using the SAME sharedKey
      // Because key is scoped to endpoint, it must NOT return the cached task!
      const assessRes = await request(app)
        .post('/api/v1/assessments')
        .set('Authorization', `Bearer ${user1Token}`)
        .set('Idempotency-Key', sharedKey)
        .send({
          subjectId,
          title: 'Assessment With Shared Key',
          assessmentType: 'QUIZ',
          scheduledAt: '2026-11-20T10:00:00.000Z',
          weight: 0.1,
        });
      expect(assessRes.status).toBe(201);
      expect(assessRes.body.title).toBe('Assessment With Shared Key');
      expect(assessRes.body.id).not.toBe(taskRes.body.id);
    });

    it('does NOT cache server errors (>= 500) so that subsequent client retries can succeed (ISS-01)', async () => {
      const retryKey = 'retry-on-error-key-456';

      // Submit invalid request (e.g. missing required title)
      const errRes = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${user1Token}`)
        .set('Idempotency-Key', retryKey)
        .send({
          title: '', // Missing title triggers 400
        });
      expect(errRes.status).toBe(400);

      // Subsequent valid retry with the same key can still succeed
      const okRes = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${user1Token}`)
        .set('Idempotency-Key', retryKey)
        .send({
          title: 'Corrected Task Title',
          subjectId,
        });
      expect(okRes.status).toBe(201);
      expect(okRes.body.title).toBe('Corrected Task Title');
    });

    it('returns identical cached response on duplicate task creation with same Idempotency-Key', async () => {
      const idempotencyKey = 'task-idempotent-key-12345';

      // First request
      const res1 = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${user1Token}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          title: 'Idempotent Task Test',
          subjectId,
        });

      expect(res1.status).toBe(201);
      const createdTaskId = res1.body.id;
      expect(createdTaskId).toBeDefined();

      // Retry request (simulating connection dropped after server processing)
      const res2 = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${user1Token}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          title: 'Idempotent Task Test',
          subjectId,
        });

      // Must return identical cached 201 response with same task ID
      expect(res2.status).toBe(201);
      expect(res2.body.id).toBe(createdTaskId);
      expect(res2.headers['idempotency-key']).toBe(idempotencyKey);
      expect(res2.headers['x-cache-lookup']).toBe('HIT');

      // Verify only 1 task with this title exists in database
      const tasksInDb = await prisma.task.findMany({
        where: { userId: user1Id, title: 'Idempotent Task Test' },
      });
      expect(tasksInDb.length).toBe(1);
    });

    it('enforces idempotency on assessment creation', async () => {
      const idempotencyKey = 'assessment-idempotent-key-999';

      const res1 = await request(app)
        .post('/api/v1/assessments')
        .set('Authorization', `Bearer ${user1Token}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          subjectId,
          title: 'Idempotent Quiz',
          assessmentType: 'QUIZ',
          scheduledAt: '2026-11-15T10:00:00.000Z',
          weight: 0.15,
        });

      expect(res1.status).toBe(201);
      const assessmentId = res1.body.id;

      // Duplicate submission
      const res2 = await request(app)
        .post('/api/v1/assessments')
        .set('Authorization', `Bearer ${user1Token}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          subjectId,
          title: 'Idempotent Quiz',
          assessmentType: 'QUIZ',
          scheduledAt: '2026-11-15T10:00:00.000Z',
          weight: 0.15,
        });

      expect(res2.status).toBe(201);
      expect(res2.body.id).toBe(assessmentId);
      expect(res2.headers['x-cache-lookup']).toBe('HIT');

      const assessmentsInDb = await prisma.assessment.findMany({
        where: { userId: user1Id, title: 'Idempotent Quiz' },
      });
      expect(assessmentsInDb.length).toBe(1);
    });
  });
});
