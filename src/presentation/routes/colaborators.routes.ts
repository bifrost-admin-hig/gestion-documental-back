import { Router } from 'express';
import { ColaboratorController } from '../controllers/colaborators.controller';
import { validateRequest } from '@shared/middleware/validation';
import {
  createColaboratorSchema,
  updateColaboratorSchema,
  updateColaboratorContractsSchema,
} from '../dto/validation-schemas';
import { auth } from '@shared/middleware/auth.middleware';
import { authorize } from '@shared/middleware/authorize.middleware';
import { assignGroup, changeGroup, getByGroup } from '@shared/middleware/group.middleware';
import { BulkTemplateController } from '../controllers/bulk-template.controller';
import { createBulkTemplateColaboratorsRoutes } from './bulk-template.colaborators.routes';

export const createColaboratorRoutes = (colaboratorController: ColaboratorController, bulkTemplateController?: BulkTemplateController): Router => {
  const router = Router();
  router.use(auth);

  // Bulk template routes (must be before /:id routes)
  if (bulkTemplateController) {
    router.use(createBulkTemplateColaboratorsRoutes(bulkTemplateController));
  }

  // POST /api/colaborators - Create a new colaborator
  router.post('/',
    authorize('colaborator:create'),
    assignGroup(),
    validateRequest(createColaboratorSchema),
    colaboratorController.createColaborator,
  );

  // GET /api/colaborators - Get all colaborators
  router.get('/',
    authorize('colaborator:read'),
    getByGroup(),
    colaboratorController.getAllColaborators,
  );

  // GET /api/colaborators/active - Get active colaborators
  router.get('/active',
    authorize('colaborator:read'),
    colaboratorController.getActiveColaborators,
  );

  // GET /api/colaborators/search - Search colaborators by name (query: ?name=Juan)
  router.get('/search',
    authorize('colaborator:read'),
    colaboratorController.searchColaboratorsByName,
  );

  // GET /api/colaborators/document/:numeroDocumento - Get colaborator by document number
  router.get('/document/:numeroDocumento',
    authorize('colaborator:read'),
    colaboratorController.getColaboratorByDocumentNumber,
  );

  // GET /api/colaborators/email/:email - Get colaborator by email
  router.get('/email/:email',
    authorize('colaborator:read'),
    colaboratorController.getColaboratorByEmail,
  );

  // GET /api/colaborators/:id - Get colaborator by ID
  router.get('/:id',
    authorize('colaborator:read'),
    colaboratorController.getColaboratorById,
  );

  // GET /api/colaborators/:id/groups - Get colaborator groups
  router.get('/:id/groups',
    authorize('colaborator:read'),
    colaboratorController.getColaboratorGroups,
  );

  // GET /api/colaborators/:id/contracts - Get colaborator contracts
  router.get('/:id/contracts',
    authorize('colaborator:read'),
    colaboratorController.getColaboratorContracts,
  );

  // PUT /api/colaborators/:id/contracts - Update colaborator contracts
  router.put('/:id/contracts',
    authorize('colaborator:update'),
    validateRequest(updateColaboratorContractsSchema),
    colaboratorController.updateColaboratorContracts,
  );

  // PUT /api/colaborators/:id/user - Assign / unassign user (requires BOTH colaborator:update AND user:update)
  router.put('/:id/user',
    authorize('colaborator:update'),
    authorize('user:update'),
    colaboratorController.assignUser,
  );

  // PUT /api/colaborators/:id - Update colaborator
  router.put('/:id',
    authorize('colaborator:update'),
    changeGroup(),
    validateRequest(updateColaboratorSchema),
    colaboratorController.updateColaborator,
  );

  // PATCH /api/colaborators/:id/activate - Activate colaborator
  router.patch('/:id/activate',
    authorize('colaborator:update'),
    colaboratorController.activateColaborator,
  );

  // PATCH /api/colaborators/:id/suspend - Suspend colaborator
  router.patch('/:id/suspend',
    authorize('colaborator:update'),
    colaboratorController.suspendColaborator,
  );

  // PATCH /api/colaborators/:id/deactivate - Deactivate colaborator
  router.patch('/:id/deactivate',
    authorize('colaborator:update'),
    colaboratorController.deactivateColaborator,
  );

  // PATCH /api/colaborators/:id/terminate - Terminate colaborator
  router.patch('/:id/terminate',
    authorize('colaborator:update'),
    colaboratorController.terminateColaborator,
  );

  // DELETE /api/colaborators/:id - Delete (soft-delete) colaborator
  router.delete('/:id',
    authorize('colaborator:delete'),
    colaboratorController.deleteColaborator,
  );

  return router;
};
