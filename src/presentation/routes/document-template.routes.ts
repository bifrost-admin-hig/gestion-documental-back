import { Router } from 'express';
import { DocumentTemplateController } from '../controllers/document-template.controller';
import { validateRequest } from '@shared/middleware/validation';
import { createDocumentTemplateSchema, createDocumentTemplateVersionSchema } from '../dto/validation-schemas';
import { auth } from '@shared/middleware/auth.middleware';
import { authorize } from '@shared/middleware/authorize.middleware';
import { assignGroup, getByGroup } from '@shared/middleware/group.middleware';

export const createDocumentTemplateRoutes = (controller: DocumentTemplateController): Router => {
  const router = Router();
  router.use(auth);

  // POST /api/document-templates - Create a new document template
  router.post(
    '/',
    authorize('document-template:create'),
    assignGroup(),
    validateRequest(createDocumentTemplateSchema),
    controller.createDocumentTemplate,
  );

  // GET /api/document-templates - Get all document templates
  router.get(
    '/',
    authorize('document-template:read'),
    getByGroup(),
    controller.getAllDocumentTemplates,
  );

  // GET /api/document-templates/versions/:code - Get all versions by code
  router.get(
    '/versions/:code',
    authorize('document-template:read'),
    controller.getDocumentTemplateVersions,
  );

  // GET /api/document-templates/next-code - Get suggested next code for a group
  router.get(
    '/next-code',
    authorize('document-template:create'),
    getByGroup(),
    controller.getNextDocumentTemplateCode,
  );

  // GET /api/document-templates/:id - Get document template by ID
  router.get(
    '/:id',
    authorize('document-template:read'),
    controller.getDocumentTemplateById,
  );

  // POST /api/document-templates/:id/version - Create new version
  router.post(
    '/:id/version',
    authorize('document-template:update'),
    validateRequest(createDocumentTemplateVersionSchema),
    controller.createNewVersion,
  );

  // DELETE /api/document-templates/:id - Delete document template
  router.delete(
    '/:id',
    authorize('document-template:delete'),
    controller.deleteDocumentTemplate,
  );

  return router;
};
