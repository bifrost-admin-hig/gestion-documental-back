import { Router } from 'express';
import { FileShareController } from '../controllers/file-share.controller';
import { auth } from '@shared/middleware/auth.middleware';
import { authorize } from '@shared/middleware/authorize.middleware';

export function createFileShareAuthRoutes(fileShareController: FileShareController): Router {
  const router = Router({ mergeParams: true });
  router.use(auth);
  router.post('/:id/share', authorize('file:share'), fileShareController.create);
  return router;
}

export function createSharedFileRoutes(fileShareController: FileShareController): Router {
  const router = Router();
  router.get('/:token', fileShareController.getInfo);
  router.get('/:token/preview', fileShareController.preview);
  router.get('/:token/download', fileShareController.download);
  return router;
}
