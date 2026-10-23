import { app } from './app';
import { env } from './env';
import { notificationService } from './services/notification.service';
import pino from 'pino';

const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
});

const server = app.listen(env.PORT, () => {
  logger.info(`UniTrack API server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
});

// ISS-03 fix: Start automated background reminder scheduler (60-second interval)
let schedulerInterval: NodeJS.Timeout | null = null;
if (env.NODE_ENV !== 'test') {
  logger.info('Starting automated background push reminder scheduler (60s tick)');
  schedulerInterval = setInterval(async () => {
    try {
      const result = await notificationService.processPendingReminders();
      if (result.scheduled > 0 || result.failed > 0) {
        logger.info({ result }, 'Automated reminder scheduler dispatch completed');
      }
    } catch (err) {
      logger.error({ err }, 'Unhandled error in automated reminder scheduler');
    }
  }, 60 * 1000);
  schedulerInterval.unref();
}

// Graceful shutdown
const shutdown = (signal: string) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app, server };
