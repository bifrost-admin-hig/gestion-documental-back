import { Router } from 'express';
import { ColaboratorGroupController } from '../controllers/colaborator-group.controller';
import { validateRequest } from '@shared/middleware/validation';
import { createColaboratorGroupSchema, updateColaboratorGroupSchema, assignColaboratorsToGroupSchema } from '../dto/validation-schemas';
import { auth } from '@shared/middleware/auth.middleware';
import { authorize } from '@shared/middleware/authorize.middleware';
import { getByGroup } from '@shared/middleware/group.middleware';

export const createColaboratorGroupRoutes = (colaboratorGroupController: ColaboratorGroupController): Router => {
  const router = Router();
  router.use(auth);

  // CRUD Colaborator Groups
  router.post('/', authorize('colaborator-group:create'), validateRequest(createColaboratorGroupSchema), colaboratorGroupController.createGroup);
  router.get('/', authorize('colaborator-group:read'), getByGroup(), colaboratorGroupController.getGroups);
  router.get('/:id', authorize('colaborator-group:read'), colaboratorGroupController.getGroupById);
  router.put('/:id', authorize('colaborator-group:update'), validateRequest(updateColaboratorGroupSchema), colaboratorGroupController.updateGroup);
  router.delete('/:id', authorize('colaborator-group:delete'), colaboratorGroupController.deleteGroup);

  // Group Colaborators
  router.get('/:id/colaborators', authorize('colaborator-group:read'), colaboratorGroupController.getColaborators);
  router.post('/:id/colaborators', authorize('colaborator-group:assign:colaborator'), validateRequest(assignColaboratorsToGroupSchema), colaboratorGroupController.assignColaborators);

  return router;
};
