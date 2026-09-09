import { Router } from 'express';
import { GroupController } from '../controllers/group.controller';
import { auth } from '@shared/middleware/auth.middleware';
import { authorize } from '@shared/middleware/authorize.middleware';

export const createGroupRoutes = (groupController: GroupController): Router => {
  const router = Router();
  router.use(auth);

  // Assign group to user (from user perspective - requires user:change:group OR group:assign:user)
  // This route must be BEFORE /:id routes to avoid conflict
  router.post('/assign-to-user/:userId', authorize(['group:assign:user', 'user:change:group']), groupController.assignGroupToUser);

  // CRUD Groups
  router.post('/', authorize(['group:create', 'group:owner']), groupController.createGroup);
  router.get('/', authorize('group:read'), groupController.getAllGroups);
  router.get('/:id', authorize('group:read'), groupController.getGroupById);
  router.put('/:id', authorize('group:update'), groupController.updateGroup);
  router.delete('/:id', authorize('group:delete'), groupController.deleteGroup);

  // Manage users in groups (requires group:assign:user OR user:change:group)
  router.post('/:id/users', authorize(['group:assign:user', 'user:change:group']), groupController.addUserToGroup);
  router.delete('/:id/users/:userId', authorize(['group:assign:user', 'user:change:group']), groupController.removeUserFromGroup);

  return router;
};
