import { Router } from 'express';
import { DivisionController } from '../controllers/division.controller';
import { auth } from '@shared/middleware/auth.middleware';
import { authorize } from '@shared/middleware/authorize.middleware';
import { getByGroup } from '@shared/middleware/group.middleware';

export const createDivisionRoutes = (divisionController: DivisionController): Router => {
  const router = Router();
  router.use(auth);

  // Endpoint público (solo requiere autenticación) para formularios
  router.get('/options', divisionController.listDivisions);

  // CRUD Divisions (requieren permisos específicos)
  router.post('/', authorize('division:create'), divisionController.createDivision);
  router.get('/', authorize('division:read'), getByGroup(), divisionController.listDivisions);
  router.get('/:id', authorize('division:read'), divisionController.getDivisionById);
  router.put('/:id', authorize('division:update'), divisionController.updateDivision);
  router.delete('/:id', authorize('division:delete'), divisionController.deleteDivision);

  return router;
};
