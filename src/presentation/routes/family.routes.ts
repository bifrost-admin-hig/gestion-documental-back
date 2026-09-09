import { Router } from 'express';
import { FamilyController } from '../controllers/family.controller';
import { validateRequest } from '@shared/middleware/validation';
import {
  createFamilySchema,
  updateFamilySchema,
  assignDocumentsFromFamilySchema,
} from '../dto/validation-schemas';
import { auth } from '@shared/middleware/auth.middleware';
import { authorize } from '@shared/middleware/authorize.middleware';
import { assignGroup, changeGroup, getByGroup } from '@shared/middleware/group.middleware';

export const createFamilyRoutes = (familyController: FamilyController): Router => {
  const router = Router();
  router.use(auth);

  // POST /api/families - Create a new family
  router.post('/', authorize('family:create'), assignGroup(), validateRequest(createFamilySchema), familyController.createFamily);

  // GET /api/families - Get all families
  router.get('/', authorize('family:read'), getByGroup(), familyController.getAllFamilies);

  // GET /api/families/by-contract/:contractId - Get families by contract
  router.get('/by-contract/:contractId', authorize('family:read'), getByGroup(), familyController.getFamiliesByContract);

  // GET /api/families/:id - Get family by ID
  router.get('/:id', authorize('family:read'), familyController.getFamilyById);

  // PUT /api/families/:id - Update family
  router.put('/:id', authorize('family:update'), changeGroup(), validateRequest(updateFamilySchema), familyController.updateFamily);

  // DELETE /api/families/:id - Delete family
  router.delete('/:id', authorize('family:delete'), familyController.deleteFamily);

  // POST /api/families/assign-documents - Assign documents from family models to colaborators
  router.post('/assign-documents', authorize('document:create'), validateRequest(assignDocumentsFromFamilySchema), familyController.assignDocumentsFromFamily);

  return router;
};
