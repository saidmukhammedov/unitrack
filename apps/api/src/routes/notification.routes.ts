import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { idempotencyMiddleware } from '../middleware/idempotency';
import {
  registerDevice,
  unregisterDevice,
  getDevices,
  getNotificationPreferences,
  updateNotificationPreference,
  triggerNotificationDispatch,
} from '../controllers/notification.controller';

const router = Router();

// All notification & device routes require authentication
router.use(requireAuth);

// Device management
router.post('/devices', idempotencyMiddleware, registerDevice);
router.get('/devices', getDevices);
router.delete('/devices/:deviceId', unregisterDevice);

// Notification preferences
router.get('/notification-preferences', getNotificationPreferences);
router.patch('/notification-preferences/:category', updateNotificationPreference);

// Administrative / testing trigger for scheduled dispatch
router.post('/notifications/dispatch', triggerNotificationDispatch);

export default router;
