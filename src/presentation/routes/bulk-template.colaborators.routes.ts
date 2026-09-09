import { Router } from 'express';
import { BulkTemplateController } from '../controllers/bulk-template.controller';
import { auth } from '@shared/middleware/auth.middleware';
import { authorize } from '@shared/middleware/authorize.middleware';

export const createBulkTemplateColaboratorsRoutes = (bulkTemplateController: BulkTemplateController): Router => {
  const router = Router();
  router.use(auth);

  // POST /api/colaborators/bulk/template - Upload a new bulk template
  router.post('/bulk/template',
    authorize('admin:colaborator:manage-template'),
    bulkTemplateController.uploadTemplate,
  );

  // GET /api/colaborators/bulk/template - Get the active bulk template metadata
  router.get('/bulk/template',
    authorize('colaborator:read'),
    bulkTemplateController.getActiveTemplate,
  );

  // GET /api/colaborators/bulk/template/download - Download the active bulk template file
  router.get('/bulk/template/download',
    authorize('colaborator:read'),
    bulkTemplateController.downloadTemplate,
  );

  // GET /api/colaborators/bulk/template/history - Get all historical templates
  router.get('/bulk/template/history',
    authorize('admin:colaborator:manage-template'),
    bulkTemplateController.getTemplateHistory,
  );

  // POST /api/colaborators/bulk - Bulk load colaborators from a file
  router.post('/bulk',
    authorize('colaborator:create'),
    bulkTemplateController.bulkLoad,
  );

  return router;
};
