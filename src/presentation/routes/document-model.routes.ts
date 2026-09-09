import { Router } from 'express';
import { DocumentModelController } from '../controllers/document-model.controller';
import { validateRequest } from '@shared/middleware/validation';
import { createDocumentModelSchema, updateDocumentModelSchema } from '../dto/validation-schemas';
import { auth } from '@shared/middleware/auth.middleware';
import { authorize } from '@shared/middleware/authorize.middleware';
import { assignGroup, changeGroup, getByGroup } from '@shared/middleware/group.middleware';

export const createDocumentModelRoutes = (documentModelController: DocumentModelController): Router => {
  const router = Router();
  router.use(auth);

  // POST /api/document-models - Create a new document model
  router.post(
    '/',
    authorize('document-model:create'),
    assignGroup(),
    validateRequest(createDocumentModelSchema),
    documentModelController.createDocumentModel,
  );

  // GET /api/document-models - Get all document models
  router.get(
    '/',
    authorize('document-model:read'),
    getByGroup(),
    documentModelController.getAllDocumentModels,
  );

  // GET /api/document-models/family/:familyId - Get document models by family ID
  router.get(
    '/family/:familyId',
    authorize('document-model:read'),
    getByGroup(),
    documentModelController.getDocumentModelsByFamilyId,
  );

  // GET /api/document-models/:id - Get document model by ID
  router.get(
    '/:id',
    authorize('document-model:read'),
    getByGroup(),
    documentModelController.getDocumentModelById,
  );

  // PUT /api/document-models/:id - Update document model
  router.put(
    '/:id',
    authorize('document-model:update'),
    changeGroup(),
    validateRequest(updateDocumentModelSchema),
    documentModelController.updateDocumentModel,
  );

  // DELETE /api/document-models/:id - Delete document model
  router.delete('/:id', authorize('document-model:delete'), documentModelController.deleteDocumentModel);

  // POST /api/document-models/assign-documents - Assign documents from model
  router.post(
    '/assign-documents',
    authorize('document:create'),
    documentModelController.assignDocumentsFromModel,
  );

  return router;
};
