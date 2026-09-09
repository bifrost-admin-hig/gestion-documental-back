import { Router } from 'express';
import { ExternalParticipantController } from '../controllers/external-participant.controller';

export const createExternalParticipantRoutes = (controller: ExternalParticipantController): Router => {
  const router = Router();

  // All routes are public — no authentication required.
  router.get('/:token', controller.getAccess);
  router.get('/:token/document', controller.getDocument);
  router.post('/:token/action', controller.submitAction);
  router.post('/:token/request-otp', controller.requestOtp);
  router.get('/:token/saved-signature', controller.getSavedSignature);
  router.post('/:token/sign', controller.validateOtp);

  return router;
};
