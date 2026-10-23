import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { notificationService } from '../services/notification.service';
import {
  RegisterDeviceInputSchema,
  UpdateNotificationPreferenceInputSchema,
  NotificationCategory,
} from '@unitrack/contracts';

export async function registerDevice(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = RegisterDeviceInputSchema.parse(req.body);
    const result = await notificationService.registerDevice(req.user!.id, input);
    res.status(result.statusCode).json(result.device);
  } catch (err) {
    next(err);
  }
}

export async function unregisterDevice(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const p = req.params.deviceId;
    const deviceId = Array.isArray(p) ? p[0] : p;
    await notificationService.unregisterDevice(req.user!.id, deviceId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function getDevices(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const devices = await notificationService.getDevices(req.user!.id);
    res.json({ data: devices });
  } catch (err) {
    next(err);
  }
}

export async function getNotificationPreferences(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const prefs = await notificationService.getNotificationPreferences(req.user!.id);
    res.json({ data: prefs });
  } catch (err) {
    next(err);
  }
}

export async function updateNotificationPreference(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const p = req.params.category;
    const category = (Array.isArray(p) ? p[0] : p) as NotificationCategory;
    const input = UpdateNotificationPreferenceInputSchema.parse(req.body);
    const updated = await notificationService.updateNotificationPreference(req.user!.id, category, input);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function triggerNotificationDispatch(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await notificationService.processPendingReminders();
    res.json(result);
  } catch (err) {
    next(err);
  }
}
