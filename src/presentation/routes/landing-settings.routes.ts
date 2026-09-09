import { Router } from 'express';
import { LandingSettingsController } from '../controllers/landing-settings.controller';
import { auth } from '@shared/middleware/auth.middleware';
import { authorize } from '@shared/middleware/authorize.middleware';
import { validateRequest } from '@shared/middleware/validation';
import { submitLandingContactSchema, updateLandingSettingsSchema } from '../dto/validation-schemas';

export const createLandingSettingsRoutes = (controller: LandingSettingsController): Router => {
  const router = Router();

  // Endpoints públicos — usados por la landing page, sin autenticación
  router.get('/public', controller.getPublicSettings);
  router.post('/contact', validateRequest(submitLandingContactSchema, true), controller.submitContactForm);

  // Administración (requiere autenticación + permiso)
  router.use(auth);
  router.get('/', authorize('landing-settings:read'), controller.getSettings);
  router.put('/', authorize('landing-settings:update'), validateRequest(updateLandingSettingsSchema, true), controller.updateSettings);

  return router;
};
