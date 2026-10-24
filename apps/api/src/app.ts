import express, { type Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pino from 'pino';
import { env } from './env';
import { authRoutes } from './routes/auth.routes';
import { userRoutes } from './routes/user.routes';
import {
  periodsRouter,
  subjectsRouter,
  timetableRouter,
  tasksRouter,
  assessmentsRouter,
  dashboardRouter,
} from './routes/academic.routes';
import { gradingRoutes } from './routes/grading.routes';
import notificationRoutes from './routes/notification.routes';
import {
  contextsRouter,
  commitmentsRouter,
  habitsRouter,
  todayRouter,
  goalsRouter,
  reviewsRouter,
  syncRouter,
} from './routes/productivity.routes';
import { errorHandler } from './middleware/error';
import type { HealthCheckResponse } from '@unitrack/contracts';

const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : env.NODE_ENV === 'production' ? 'info' : 'debug',
});

const app: Express = express();

// Trust proxy for IP rate limiting / secure cookies behind reverse proxies
app.set('trust proxy', 1);

// Middleware
app.use(
  cors({
    origin: env.CORS_ORIGINS.split(',').map((origin) => origin.trim()),
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  if (env.NODE_ENV !== 'test') {
    logger.info({ method: req.method, url: req.url }, 'Incoming request');
  }
  next();
});

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  const payload: HealthCheckResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: env.NODE_ENV,
  };
  res.status(200).json(payload);
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/periods', periodsRouter);
app.use('/api/v1/subjects', subjectsRouter);
app.use('/api/v1/timetable', timetableRouter);
app.use('/api/v1/tasks', tasksRouter);
app.use('/api/v1/assessments', assessmentsRouter);
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api/v1/contexts', contextsRouter);
app.use('/api/v1/commitments', commitmentsRouter);
app.use('/api/v1/habits', habitsRouter);
app.use('/api/v1/today', todayRouter);
app.use('/api/v1/goals', goalsRouter);
app.use('/api/v1/reviews', reviewsRouter);
app.use('/api/v1/sync', syncRouter);
app.use('/api/v1', gradingRoutes);
app.use('/api/v1', notificationRoutes);

// Central error handler
app.use(errorHandler);

export { app };
