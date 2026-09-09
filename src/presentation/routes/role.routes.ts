import { Router } from 'express';
import { RoleController } from '../controllers/role.controller';
import { validateRequest } from '@shared/middleware/validation';
import { createRoleSchema, updateRoleSchema, assignPermissionsSchema } from '../dto/validation-schemas';
import { auth } from '@shared/middleware/auth.middleware';
import { authorize } from '@shared/middleware/authorize.middleware';

export const createRoleRoutes = (roleController: RoleController): Router => {
  const router = Router();
  router.use(auth);

  // CRUD Roles
  router.post('/', authorize('role:create'), validateRequest(createRoleSchema), roleController.createRole);
  router.get('/', authorize('role:read'), roleController.getRoles);
  router.get('/:id', authorize('role:read'), roleController.getRoleById);
  router.put('/:id', authorize('role:update'), validateRequest(updateRoleSchema), roleController.updateRole);
  router.delete('/:id', authorize('role:delete'), roleController.deleteRole);

  // Role Permissions
  router.get('/:id/permissions', authorize('role:read'), roleController.getPermissions);
  router.post('/:id/permissions', authorize('role:assign:permission'), validateRequest(assignPermissionsSchema), roleController.assignPermissions);

  return router;
};
