import { Router } from 'express';
import { DocumentController } from '../controllers/document.controller';
import { validateRequest } from '@shared/middleware/validation';
import { createDocumentSchema, updateDocumentSchema } from '../dto/validation-schemas';
import { auth } from '@shared/middleware/auth.middleware';
import { authorize } from '@shared/middleware/authorize.middleware';
import { assignGroup, changeGroup, getByGroup } from '@shared/middleware/group.middleware';
import { RequestHandler } from 'express';

export const createDocumentRoutes = (
  controller: DocumentController,
  contractReviewerMiddleware: RequestHandler,
): Router => {
  const router = Router();

  router.use(auth);

  // Dashboard metrics
  router.get('/dashboard/metrics', authorize('dashboard:read'), controller.getDashboardMetrics);

  // POST routes
  router.post('/',
    authorize('document:create'),
    assignGroup(),
    validateRequest(createDocumentSchema, true),
    controller.createDocument,
  );
  router.post('/assign-to-group', authorize('document:create'), controller.assignDocumentsToGroup);
  router.post('/download-zip', authorize('document:read'), controller.downloadZip);

  // GET routes - specific routes before parameterized routes
  router.get('/expired', authorize('document:read'), controller.getExpiredDocuments);
  router.get('/expiring/:days', authorize('document:read'), controller.getExpiringDocuments);
  router.get('/by-contract/:contractId', authorize('document:read'), controller.getDocumentsByContractId);
  router.get('/by-type-subtype/:typeId/:subtypeId', authorize('document:read'), controller.getDocumentsByTypeAndSubtypeId);
  router.get('/by-colaborator/:colaboratorId', authorize('document:read'), controller.getDocumentsByColaboratorId);
  router.get('/',
    authorize('document:read'),
    getByGroup(),
    controller.getAllDocuments,
  );
  router.get('/:id', authorize('document:read'), controller.getDocumentById);

  // PUT routes
  router.put('/:id/send-to-review', authorize('document:update'), controller.sendToReview);

  // Aprobación directa (sin pasar por revisión) - para revisores globales o revisores activos del contrato
  router.put('/:id/approve-direct', authorize(['document:review', 'document:review:any']), contractReviewerMiddleware, controller.directApproveDocument);

  // Rutas de revisión - requieren permiso document:review Y ser revisor activo del contrato
  router.put('/:id/approve', authorize('document:review'), contractReviewerMiddleware, controller.approveDocument);
  router.put('/:id/reject', authorize('document:review'), contractReviewerMiddleware, controller.rejectDocument);
  router.put('/:id/reject-with-comments', authorize('document:review'), contractReviewerMiddleware, controller.rejectDocumentWithComments);
  router.put('/:id',
    authorize('document:update'),
    changeGroup(),
    validateRequest(updateDocumentSchema, true),
    controller.updateDocument,
  );

  // DELETE routes
  router.delete('/:id', authorize('document:delete'), controller.deleteDocument);

  return router;
};
