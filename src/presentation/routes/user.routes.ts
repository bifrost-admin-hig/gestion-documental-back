import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { validateRequest } from '@shared/middleware/validation';
import {
  assignRoleToUserSchema,
  createUserSchema,
  updateUserSchema,
} from '../dto/validation-schemas';
import { auth } from '@shared/middleware/auth.middleware';
import { authorize } from '@shared/middleware/authorize.middleware';

export const createUserRoutes = (userController: UserController): Router => {
  const router = Router();
  router.use(auth);

  // POST /api/users - Create a new user
  router.post('/', authorize('user:create'), validateRequest(createUserSchema), userController.createUser);

  // GET /api/users - Get all users
  router.get('/', authorize('user:read'), userController.getAllUsers);

  // GET /api/users/:id - Get user by ID
  router.get('/:id', authorize('user:read'), userController.getUserById);

  // PUT /api/users/:id - Update user
  router.put('/:id', authorize('user:update'), validateRequest(updateUserSchema), userController.updateUser);

  // DELETE /api/users/:id - Delete user
  router.delete('/:id', authorize('user:delete'), userController.deleteUser);

  // POST /api/users/:id/roles - assign roles to user
  router.post('/:id/roles', authorize('user:assign:role'), validateRequest(assignRoleToUserSchema), userController.assignRoleToUser);

  return router;
};
