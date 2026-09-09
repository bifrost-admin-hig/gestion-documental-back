import { Router } from 'express';
import { SignatureFlowController } from '../controllers/signature-flow.controller';
import { validateRequest } from '@shared/middleware/validation';
import {
  createSignatureFlowSchema,
  updateSignatureFlowSchema,
  addSignatureFlowParticipantSchema,
  processSignatureFlowParticipantActionSchema,
  resendSignatureFlowNotificationSchema,
  skipSignerSchema,
  closeSignatureFlowSchema,
  reopenSignatureFlowSchema,
} from '../dto/validation-schemas';
import { auth } from '@shared/middleware/auth.middleware';
import { authorize } from '@shared/middleware/authorize.middleware';

export const createSignatureFlowRoutes = (controller: SignatureFlowController): Router => {
  const router = Router();

  router.use(auth);

  router.post(
    '/',
    authorize('signature-flow:create'),
    validateRequest(createSignatureFlowSchema, true),
    controller.create,
  );

  router.get('/my-pending', authorize('signature-flow:read'), controller.getMyPending);

  router.get('/reports/pending-documents', authorize('signature-flow:report:read'), controller.getPendingDocumentsReport);

  router.get('/reports/signing-time', authorize('signature-flow:report:read'), controller.getSigningTimeReport);

  router.get('/document/:documentId', authorize('signature-flow:read'), controller.getByDocument);

  router.get('/document/:documentId/tracking', authorize('signature-flow:read'), controller.getDocumentTracking);

  router.get('/:id', authorize('signature-flow:read'), controller.getById);

  router.get('/:id/participants', authorize('signature-flow:read'), controller.getParticipants);

  router.put(
    '/:id',
    authorize('signature-flow:update'),
    validateRequest(updateSignatureFlowSchema, true),
    controller.update,
  );

  router.post(
    '/:id/participants',
    authorize('signature-flow:update'),
    validateRequest(addSignatureFlowParticipantSchema, true),
    controller.addParticipant,
  );

  router.delete('/:id/participants/:participantId', authorize('signature-flow:update'), controller.removeParticipant);

  router.get('/:id/resend-candidates', authorize('signature-flow:update'), controller.getResendCandidates);

  router.post(
    '/:id/resend-notifications',
    authorize('signature-flow:update'),
    validateRequest(resendSignatureFlowNotificationSchema, true),
    controller.resendNotifications,
  );

  router.post(
    '/:id/skip-signer',
    authorize('signature-flow:update'),
    validateRequest(skipSignerSchema, true),
    controller.skipSigner,
  );

  router.post(
    '/:id/close',
    authorize('signature-flow:update'),
    validateRequest(closeSignatureFlowSchema, true),
    controller.closeSignatureFlow,
  );

  router.post(
    '/:id/reopen',
    authorize('signature-flow:reopen'),
    validateRequest(reopenSignatureFlowSchema, true),
    controller.reopenSignatureFlow,
  );

  router.post(
    '/participants/:participantId/action',
    authorize('signature-flow:update'),
    validateRequest(processSignatureFlowParticipantActionSchema, true),
    controller.processParticipantAction,
  );

  router.delete('/:id', authorize('signature-flow:delete'), controller.delete);

  return router;
};
