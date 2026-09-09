import { Router } from 'express';
import { EmailQueueController } from '../controllers/email-queue.controller';
import { auth } from '@shared/middleware/auth.middleware';
import { authorize } from '@shared/middleware/authorize.middleware';

export const createEmailQueueRoutes = (controller: EmailQueueController): Router => {
  const router = Router();

  router.use(auth);

  router.get('/stats', authorize('admin:email-queue'), controller.getStats);
  router.get('/', authorize('admin:email-queue'), controller.listJobs);
  router.post('/:id/retry', authorize('admin:email-queue'), controller.retryJob);
  router.post('/cancel/:groupKey', authorize('admin:email-queue'), controller.cancelByGroupKey);

  return router;
};
