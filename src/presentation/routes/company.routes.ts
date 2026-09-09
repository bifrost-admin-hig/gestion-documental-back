import { Router } from 'express';
import { CompanyController } from '../controllers/company/company.controller';
import { auth } from '@shared/middleware/auth.middleware';
import { authorize } from '@shared/middleware/authorize.middleware';
import { assignGroup, changeGroup, getByGroup } from '@shared/middleware/group.middleware';

export const createCompanyRoutes = (controller: CompanyController) => {
  const router = Router();

  router.use(auth);

  router.post('/',
    authorize('company:create'),
    assignGroup(),
    controller.create,
  );

  router.get('/',
    authorize('company:read'),
    getByGroup(),
    controller.findAll,
  );

  router.get('/:id',
    authorize('company:read'),
    controller.findById,
  );

  router.put('/:id',
    authorize('company:update'),
    changeGroup(),
    controller.update,
  );

  router.delete('/:id',
    authorize('company:delete'),
    controller.delete,
  );

  return router;
};
