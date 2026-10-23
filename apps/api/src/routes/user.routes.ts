import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/me', requireAuth, userController.getMe);
router.patch('/me', requireAuth, userController.updateMe);
router.delete('/me', requireAuth, userController.deleteMe);
router.post('/me/change-password', requireAuth, userController.changePassword);

export { router as userRoutes };
