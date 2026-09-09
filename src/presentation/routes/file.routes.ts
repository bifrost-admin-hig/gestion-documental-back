import { Router } from 'express';
import { FileController } from '../controllers/file.controller';
import { auth } from '@shared/middleware/auth.middleware';

export function createFileRoutes(fileController: FileController): Router {
  const router = Router();
  router.use(auth);
  router.post('/', fileController.upload);
  router.get('/:id', fileController.getFileById);
  router.get('/:id/download', fileController.download);
  router.get('/:id/preview', fileController.preview);
  router.delete('/:id', fileController.delete);
  return router;
}

