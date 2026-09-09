import { Router } from 'express';
import { DocumentHistoryController } from '../controllers/document-history.controller';
import { auth } from '@shared/middleware/auth.middleware';
import { authorize } from '@shared/middleware/authorize.middleware';

export const createDocumentHistoryRoutes = (controller: DocumentHistoryController): Router => {
  const router = Router();

  router.use(auth);

  // GET /api/document-history - Get all history
  router.get('/', authorize('document:read'), controller.getAllHistory);

  // GET /api/document-history/document/:documentId - Get history by document ID
  router.get('/document/:documentId', authorize('document:read'), controller.getHistoryByDocumentId);

  return router;
};
