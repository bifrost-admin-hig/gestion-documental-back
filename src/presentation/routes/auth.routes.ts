import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from '../controllers/auth.controller';
import { auth } from '@shared/middleware/auth.middleware';

// Límite dedicado y más estricto que el global de /api: el endpoint de
// olvidé-mi-contraseña es un objetivo clásico de abuso (spam de correos,
// enumeración de usuarios por temporización).
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many password reset requests. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
});

export function createAuthRoutes(authController: AuthController): Router {
  const authRouter = Router();

  authRouter.post('/login', authController.login);
  authRouter.post('/logout', authController.logout);
  authRouter.get('/permissions', auth, authController.getPermissions);
  authRouter.post('/refresh', auth, authController.refresh);
  authRouter.get('/me', auth, authController.getMe);
  authRouter.delete('/notifications/:id', auth, authController.deleteNotification);
  authRouter.delete('/notifications', auth, authController.clearNotifications);
  authRouter.post('/me', auth, authController.updateMe);
  authRouter.post('/change-password', auth, authController.changePassword);
  authRouter.post('/set-password', authController.setPassword);
  authRouter.post('/forgot-password', forgotPasswordLimiter, authController.forgotPassword);
  authRouter.post('/reset-password', authController.resetPassword);
  authRouter.get('/token', authController.getToken);
  authRouter.get('/group', authController.getGroup);

  return authRouter;
}
