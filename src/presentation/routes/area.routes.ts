import { Router } from 'express';
import { AreaController } from '../controllers/area.controller';
import { auth } from '@shared/middleware/auth.middleware';
import { authorize } from '@shared/middleware/authorize.middleware';
import { getByGroup } from '@shared/middleware/group.middleware';

export const createAreaRoutes = (areaController: AreaController): Router => {
  const router = Router();
  router.use(auth);

  // Endpoint público (solo requiere autenticación) para formularios
  router.get('/options', areaController.listAreas);

  // CRUD Areas (requieren permisos específicos)
  router.post('/', authorize('area:create'), areaController.createArea);
  router.get('/', authorize('area:read'), getByGroup(), areaController.listAreas);
  router.get('/:id', authorize('area:read'), areaController.getAreaById);
  router.put('/:id', authorize('area:update'), areaController.updateArea);
  router.delete('/:id', authorize('area:delete'), areaController.deleteArea);

  return router;
};
