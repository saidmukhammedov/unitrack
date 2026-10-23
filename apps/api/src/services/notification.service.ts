import { prisma } from '../lib/prisma';
import { ApiError } from '../middleware/error';
import type {
  RegisterDeviceInput,
  DevicePlatform,
  NotificationCategory,
  UpdateNotificationPreferenceInput,
} from '@unitrack/contracts';

export interface PushNotificationMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

export interface PushDispatchResult {
  status: 'ok' | 'error';
  message?: string;
  details?: {
    error?: string;
  };
}

export interface ExpoPushClient {
  sendPushNotification(message: PushNotificationMessage): Promise<PushDispatchResult>;
}

/**
 * Default Expo Push Notification HTTP Client
 * Unpacks array responses from official Expo push service.
 */
export class DefaultExpoPushClient implements ExpoPushClient {
  async sendPushNotification(message: PushNotificationMessage): Promise<PushDispatchResult> {
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        return {
          status: 'error',
          message: `Expo Push HTTP ${response.status}`,
        };
      }

      const json: any = await response.json();
      // ISS-05 fix: Expo API returns { data: [ { status, id, ... } ] }
      const ticket = Array.isArray(json.data) ? json.data[0] : json.data;

      if (ticket && ticket.status === 'error') {
        return {
          status: 'error',
          message: ticket.message || 'Expo error',
          details: { error: ticket.details?.error },
        };
      }

      return { status: 'ok' };
    } catch (err: any) {
      return {
        status: 'error',
        message: err.message || 'Network error reaching Expo',
      };
    }
  }
}

export class NotificationService {
  private pushClient: ExpoPushClient;
  private isProcessing = false;

  constructor(pushClient?: ExpoPushClient) {
    this.pushClient = pushClient || new DefaultExpoPushClient();
  }

  // ---------------------------------------------------------------------------
  // Device Management (docs/api-specification.md §11)
  // ---------------------------------------------------------------------------

  async registerDevice(userId: string, input: RegisterDeviceInput) {
    const existing = await prisma.device.findUnique({
      where: { expoPushToken: input.expoPushToken },
    });

    if (existing) {
      if (existing.userId !== userId) {
        throw new ApiError(
          409,
          'DEVICE_ALREADY_REGISTERED',
          'This device token is registered to another account'
        );
      }

      // Existing device belonging to the same user: update lastSeenAt and label
      const updated = await prisma.device.update({
        where: { id: existing.id },
        data: {
          lastSeenAt: new Date(),
          deviceLabel: input.deviceLabel ?? existing.deviceLabel,
          platform: input.platform as DevicePlatform,
        },
      });

      return { statusCode: 200, device: this.formatDevice(updated) };
    }

    // New device registration
    const created = await prisma.device.create({
      data: {
        userId,
        expoPushToken: input.expoPushToken,
        platform: input.platform as DevicePlatform,
        deviceLabel: input.deviceLabel,
      },
    });

    return { statusCode: 201, device: this.formatDevice(created) };
  }

  async unregisterDevice(userId: string, deviceId: string): Promise<void> {
    const device = await prisma.device.findFirst({
      where: { id: deviceId, userId },
    });

    if (!device) {
      throw new ApiError(404, 'DEVICE_NOT_FOUND', 'Device registration not found');
    }

    await prisma.device.delete({
      where: { id: deviceId },
    });
  }

  async getDevices(userId: string) {
    const devices = await prisma.device.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return devices.map((d) => this.formatDevice(d));
  }

  // ---------------------------------------------------------------------------
  // Notification Preferences (docs/api-specification.md §10)
  // ---------------------------------------------------------------------------

  async getNotificationPreferences(userId: string) {
    let prefs = await prisma.notificationPreference.findMany({
      where: { userId },
      orderBy: { category: 'asc' },
    });

    // Seed defaults if empty
    if (prefs.length === 0) {
      const defaults = [
        { category: 'TASK_REMINDER' as const, isEnabled: true, leadTimeMinutes: 1440 }, // 1 day
        { category: 'ASSESSMENT_REMINDER' as const, isEnabled: true, leadTimeMinutes: 60 }, // 1 hour
      ];

      for (const d of defaults) {
        await prisma.notificationPreference.upsert({
          where: { userId_category: { userId, category: d.category } },
          create: { userId, category: d.category, isEnabled: d.isEnabled, leadTimeMinutes: d.leadTimeMinutes },
          update: {},
        });
      }

      prefs = await prisma.notificationPreference.findMany({
        where: { userId },
        orderBy: { category: 'asc' },
      });
    }

    return prefs.map((p) => ({
      id: p.id,
      userId: p.userId,
      category: p.category,
      isEnabled: p.isEnabled,
      leadTimeMinutes: p.leadTimeMinutes,
      updatedAt: p.updatedAt.toISOString(),
    }));
  }

  async updateNotificationPreference(
    userId: string,
    category: NotificationCategory,
    input: UpdateNotificationPreferenceInput
  ) {
    if (!['TASK_REMINDER', 'ASSESSMENT_REMINDER'].includes(category)) {
      throw new ApiError(400, 'INVALID_CATEGORY', `Invalid category: ${category}`);
    }

    const defaultLeadTime = category === 'TASK_REMINDER' ? 1440 : 60;

    const pref = await prisma.notificationPreference.upsert({
      where: {
        userId_category: { userId, category },
      },
      create: {
        userId,
        category,
        isEnabled: input.isEnabled ?? true,
        leadTimeMinutes: input.leadTimeMinutes ?? defaultLeadTime,
      },
      update: {
        ...(input.isEnabled !== undefined ? { isEnabled: input.isEnabled } : {}),
        ...(input.leadTimeMinutes !== undefined ? { leadTimeMinutes: input.leadTimeMinutes } : {}),
      },
    });

    return {
      id: pref.id,
      userId: pref.userId,
      category: pref.category,
      isEnabled: pref.isEnabled,
      leadTimeMinutes: pref.leadTimeMinutes,
      updatedAt: pref.updatedAt.toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Reminder Scheduling, Duplicate Prevention & Dispatch
  // ---------------------------------------------------------------------------

  /**
   * Evaluates upcoming events against user lead-time preferences, creates delivery logs,
   * enforces DUPLICATE REMINDER PREVENTION, concurrency protection, and dispatches push notifications.
   */
  async processPendingReminders(now: Date = new Date(), userId?: string) {
    // ISS-02 fix: Concurrency guard to prevent overlapping scheduler executions
    if (this.isProcessing) {
      return {
        scheduled: 0,
        sent: 0,
        failed: 0,
        skippedDuplicates: 0,
        cleanedDevices: 0,
        locked: true,
      };
    }

    this.isProcessing = true;

    try {
      let scheduled = 0;
      let sent = 0;
      let failed = 0;
      let skippedDuplicates = 0;
      let cleanedDevices = 0;

      // Maximum allowable staleness (2 hours): do not send "due soon" reminders if trigger was hours ago
      const MAX_STALENESS_MS = 2 * 60 * 60 * 1000;

      // 1. Process Task Reminders
      const tasks = await prisma.task.findMany({
        where: {
          dueAt: { not: null },
          completedAt: null, // Incomplete tasks only
          ...(userId ? { userId } : {}),
        },
        include: {
          user: {
            include: {
              devices: true,
              notificationPreferences: true,
            },
          },
        },
      });

      for (const task of tasks) {
        if (!task.dueAt) continue;

        // ISS-04 fix: Do NOT dispatch reminders for tasks whose deadline has already elapsed
        if (task.dueAt <= now) {
          continue;
        }

        const pref = task.user.notificationPreferences.find(
          (p) => p.category === 'TASK_REMINDER'
        );
        const isEnabled = pref ? pref.isEnabled : true;
        const leadTimeMinutes = pref ? pref.leadTimeMinutes : 1440;

        if (!isEnabled) continue;

        // Calculate scheduled trigger time in UTC
        const scheduledFor = new Date(task.dueAt.getTime() - leadTimeMinutes * 60 * 1000);

        // Check if trigger window has arrived
        if (scheduledFor > now) {
          continue; // Not yet due
        }

        // Drop if past stale threshold
        if (now.getTime() - scheduledFor.getTime() > MAX_STALENESS_MS) {
          continue;
        }

        // If user has no registered mobile devices, record skipped delivery
        if (task.user.devices.length === 0) {
          const existingSkipped = await prisma.notificationDelivery.findFirst({
            where: {
              userId: task.userId,
              referenceType: 'TASK',
              referenceId: task.id,
              scheduledFor,
            },
          });
          if (!existingSkipped) {
            await prisma.notificationDelivery.create({
              data: {
                userId: task.userId,
                referenceType: 'TASK',
                referenceId: task.id,
                scheduledFor,
                status: 'SKIPPED',
                errorMessage: 'No registered devices for push notification',
              },
            });
          }
          continue;
        }

        // Dispatch per device with device-level duplicate prevention (ISS-02 & ISS-05 fix)
        for (const device of task.user.devices) {
          const existingDelivery = await prisma.notificationDelivery.findFirst({
            where: {
              userId: task.userId,
              deviceId: device.id,
              referenceType: 'TASK',
              referenceId: task.id,
              scheduledFor,
              status: { in: ['SENT', 'PENDING'] },
            },
          });

          if (existingDelivery) {
            skippedDuplicates++;
            continue;
          }

          scheduled++;

          const delivery = await prisma.notificationDelivery.create({
            data: {
              userId: task.userId,
              deviceId: device.id,
              referenceType: 'TASK',
              referenceId: task.id,
              scheduledFor,
              status: 'PENDING',
            },
          });

          const res = await this.pushClient.sendPushNotification({
            to: device.expoPushToken,
            title: 'Task Reminder',
            body: `Reminder: "${task.title}" is due soon.`,
            data: { taskId: task.id, type: 'TASK_REMINDER' },
          });

          if (res.status === 'ok') {
            await prisma.notificationDelivery.update({
              where: { id: delivery.id },
              data: { status: 'SENT', sentAt: new Date() },
            });
            sent++;
          } else {
            await prisma.notificationDelivery.update({
              where: { id: delivery.id },
              data: { status: 'FAILED', errorMessage: res.message || 'Push dispatch failed' },
            });
            failed++;

            // Failed token cleanup (NOTIF-07): remove invalid Device on DeviceNotRegistered
            if (res.details?.error === 'DeviceNotRegistered' || res.message?.includes('DeviceNotRegistered')) {
              await prisma.device.delete({ where: { id: device.id } }).catch(() => {});
              cleanedDevices++;
            }
          }
        }
      }

      // 2. Process Assessment Reminders
      const assessments = await prisma.assessment.findMany({
        where: {
          status: 'SCHEDULED',
          ...(userId ? { userId } : {}),
        },
        include: {
          user: {
            include: {
              devices: true,
              notificationPreferences: true,
            },
          },
        },
      });

      for (const assessment of assessments) {
        // ISS-04 fix: Do NOT dispatch reminders for assessments that have already started/passed
        if (assessment.scheduledAt <= now) {
          continue;
        }

        const pref = assessment.user.notificationPreferences.find(
          (p) => p.category === 'ASSESSMENT_REMINDER'
        );
        const isEnabled = pref ? pref.isEnabled : true;
        const leadTimeMinutes = pref ? pref.leadTimeMinutes : 60; // 1 hour default

        if (!isEnabled) continue;

        const scheduledFor = new Date(assessment.scheduledAt.getTime() - leadTimeMinutes * 60 * 1000);

        if (scheduledFor > now) {
          continue;
        }

        if (now.getTime() - scheduledFor.getTime() > MAX_STALENESS_MS) {
          continue;
        }

        if (assessment.user.devices.length === 0) {
          const existingSkipped = await prisma.notificationDelivery.findFirst({
            where: {
              userId: assessment.userId,
              referenceType: 'ASSESSMENT',
              referenceId: assessment.id,
              scheduledFor,
            },
          });
          if (!existingSkipped) {
            await prisma.notificationDelivery.create({
              data: {
                userId: assessment.userId,
                referenceType: 'ASSESSMENT',
                referenceId: assessment.id,
                scheduledFor,
                status: 'SKIPPED',
                errorMessage: 'No registered devices for push notification',
              },
            });
          }
          continue;
        }

        for (const device of assessment.user.devices) {
          const existingDelivery = await prisma.notificationDelivery.findFirst({
            where: {
              userId: assessment.userId,
              deviceId: device.id,
              referenceType: 'ASSESSMENT',
              referenceId: assessment.id,
              scheduledFor,
              status: { in: ['SENT', 'PENDING'] },
            },
          });

          if (existingDelivery) {
            skippedDuplicates++;
            continue;
          }

          scheduled++;

          const delivery = await prisma.notificationDelivery.create({
            data: {
              userId: assessment.userId,
              deviceId: device.id,
              referenceType: 'ASSESSMENT',
              referenceId: assessment.id,
              scheduledFor,
              status: 'PENDING',
            },
          });

          const res = await this.pushClient.sendPushNotification({
            to: device.expoPushToken,
            title: 'Upcoming Assessment Reminder',
            body: `Upcoming ${assessment.assessmentType}: "${assessment.title}".`,
            data: { assessmentId: assessment.id, type: 'ASSESSMENT_REMINDER' },
          });

          if (res.status === 'ok') {
            await prisma.notificationDelivery.update({
              where: { id: delivery.id },
              data: { status: 'SENT', sentAt: new Date() },
            });
            sent++;
          } else {
            await prisma.notificationDelivery.update({
              where: { id: delivery.id },
              data: { status: 'FAILED', errorMessage: res.message || 'Push dispatch failed' },
            });
            failed++;

            if (res.details?.error === 'DeviceNotRegistered' || res.message?.includes('DeviceNotRegistered')) {
              await prisma.device.delete({ where: { id: device.id } }).catch(() => {});
              cleanedDevices++;
            }
          }
        }
      }

      return { scheduled, sent, failed, skippedDuplicates, cleanedDevices, locked: false };
    } finally {
      this.isProcessing = false;
    }
  }

  private formatDevice(d: any) {
    return {
      id: d.id,
      userId: d.userId,
      expoPushToken: d.expoPushToken,
      platform: d.platform,
      deviceLabel: d.deviceLabel,
      lastSeenAt: d.lastSeenAt.toISOString(),
      createdAt: d.createdAt.toISOString(),
    };
  }
}

export const notificationService = new NotificationService();
