import { Router } from 'express';
import { PermissionController } from '../controllers/permission.controller';
import { validateRequest } from '@shared/middleware/validation';
import { createPermissionSchema, updatePermissionSchema } from '../dto/validation-schemas';
import { auth } from '@shared/middleware/auth.middleware';
import { authorize } from '@shared/middleware/authorize.middleware';

export const createPermissionRoutes = (permissionController: PermissionController): Router => {
  const router = Router();
  router.use(auth);

  // CRUD Permisos
  router.post('/', authorize('permission:create'), validateRequest(createPermissionSchema), permissionController.createPermission);
  router.get('/', authorize('permission:read'), permissionController.getAllPermissions);
  router.get('/:id', authorize('permission:read'), permissionController.getPermissionById);
  router.put('/:id', authorize('permission:update'), validateRequest(updatePermissionSchema), permissionController.updatePermission);
  router.delete('/:id', authorize('permission:delete'), permissionController.deletePermission);

  return router;
};
