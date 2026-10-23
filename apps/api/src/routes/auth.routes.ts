import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';
import { authRateLimiter, passwordResetRateLimiter } from '../middleware/rate-limit';

const router = Router();

// Public auth endpoints
router.post('/register', authRateLimiter, authController.register);
router.post('/verify-email', authController.verifyEmail);
router.post('/login', authRateLimiter, authController.login);
router.post('/google', authRateLimiter, authController.googleAuth);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/forgot-password', passwordResetRateLimiter, authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Authenticated session endpoints
router.get('/sessions', requireAuth, authController.getSessions);
router.delete('/sessions/:sessionId', requireAuth, authController.deleteSession);

export { router as authRoutes };
