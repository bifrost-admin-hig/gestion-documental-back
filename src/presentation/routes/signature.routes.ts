import { Router } from 'express';
import { SignatureController } from '../controllers/signature.controller';
import { validateRequest } from '@shared/middleware/validation';
import { initiateSignatureSchema, validateSignatureCodeSchema, cancelSignatureSchema } from '../dto/validation-schemas';
import { auth } from '@shared/middleware/auth.middleware';
import { authorize } from '@shared/middleware/authorize.middleware';

export const createSignatureRoutes = (controller: SignatureController): Router => {
  const router = Router();

  // Public endpoints — no authentication required
  router.get('/verify/document/:documentId', controller.verifyDocumentById);
  router.get('/verify/document/:documentId/file', controller.getDocumentFilePublic);
  router.get('/verify/:tokenHash', controller.verifyByToken);
  router.get('/verify/:documentId/:tokenHash', controller.verifyByDocumentAndToken);
  router.get('/verify/:documentId/:tokenHash/file', controller.getDocumentFileByVerification);

  // Protected endpoints
  router.use(auth);

  router.get('/sms-default-phone', authorize('signature:create'), controller.getDefaultSmsPhone);
  router.get('/my-signature', authorize('signature:create'), controller.getMySignature);
  router.post('/initiate', authorize('signature:create'), validateRequest(initiateSignatureSchema, true), controller.initiate);
  router.post('/validate', authorize('signature:create'), validateRequest(validateSignatureCodeSchema, true), controller.validate);
  router.post('/cancel', authorize('signature:create'), validateRequest(cancelSignatureSchema, true), controller.cancel);
  router.get('/document/:documentId', authorize('signature:read'), controller.getByDocument);

  return router;
};
