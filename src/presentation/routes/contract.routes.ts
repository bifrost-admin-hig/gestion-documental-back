import { Router } from 'express';
import { ContractController } from '../controllers/contract.controller';
import { validateRequest } from '@shared/middleware/validation';
import {
  createContractSchema,
  updateContractSchema,
  assignReviewerSchema,
  updateReviewerSchema,
} from '../dto/validation-schemas';
import { auth } from '@shared/middleware/auth.middleware';
import { authorize } from '@shared/middleware/authorize.middleware';
import { assignGroup, changeGroup, getByGroup } from '@shared/middleware/group.middleware';

export const createContractRoutes = (contractController: ContractController): Router => {
  const router = Router();
  router.use(auth);

  // POST /api/contracts - Create a new contract
  router.post(
    '/',
    authorize('contract:create'),
    assignGroup(),
    validateRequest(createContractSchema, true),
    contractController.createContract,
  );

  // GET /api/contracts - Get all contracts
  router.get('/', authorize('contract:read'), getByGroup(), contractController.getAllContracts);

  // GET /api/contracts/active - Get active contracts
  router.get('/active', authorize('contract:read'), contractController.getActiveContracts);

  // GET /api/contracts/expired - Get expired contracts
  router.get('/expired', authorize('contract:read'), contractController.getExpiredContracts);

  // GET /api/contracts/ending-before - Get contracts ending before date (query: ?date=2024-12-31)
  router.get('/ending-before', authorize('contract:read'), contractController.getContractsEndingBefore);

  // GET /api/contracts/rut-sociedad/:rutSociedad - Get contracts by RUT sociedad
  router.get('/rut-sociedad/:rutSociedad', authorize('contract:read'), contractController.getContractsByRutSociedad);

  // GET /api/contracts/colaborador/:nombre - Get contracts by colaborador name
  router.get('/colaborador/:nombre', authorize('contract:read'), contractController.getContractsByNombreColaborador);

  // GET /api/contracts/mandante/:mandante - Get contracts by mandante
  router.get('/mandante/:mandante', authorize('contract:read'), contractController.getContractsByMandante);

  // GET /api/contracts/division/:division - Get contracts by division
  router.get('/division/:division', authorize('contract:read'), contractController.getContractsByDivision);

  // GET /api/contracts/area/:area - Get contracts by area
  router.get('/area/:area', authorize('contract:read'), contractController.getContractsByArea);

  // GET /api/contracts/number/:contractNumber - Get contract by number
  router.get('/number/:contractNumber', authorize('contract:read'), contractController.getContractByNumber);

  // GET /api/contracts/:id - Get contract by ID
  router.get('/:id', authorize('contract:read'), contractController.getContractById);

  // PUT /api/contracts/:id - Update contract
  router.put(
    '/:id',
    authorize('contract:update'),
    changeGroup(),
    validateRequest(updateContractSchema, true),
    contractController.updateContract,
  );

  // PATCH /api/contracts/:id/activate - Activate contract
  router.patch('/:id/activate', authorize('contract:update'), contractController.activateContract);

  // PATCH /api/contracts/:id/suspend - Suspend contract
  router.patch('/:id/suspend', authorize('contract:update'), contractController.suspendContract);

  // PATCH /api/contracts/:id/terminate - Terminate contract
  router.patch('/:id/terminate', authorize('contract:finalize'), contractController.terminateContract);

  // DELETE /api/contracts/:id - Delete contract
  router.delete('/:id', authorize('contract:delete'), contractController.deleteContract);

  // Subcontract management routes (use same contract permissions)
  // POST /api/contracts/:id/subcontracts - Add a subcontract to a contract
  router.post('/:id/subcontracts', authorize('contract:update'), contractController.addSubcontract);

  // DELETE /api/contracts/:id/subcontracts/:subcontractId - Remove a subcontract from a contract
  router.delete('/:id/subcontracts/:subcontractId', authorize('contract:update'), contractController.removeSubcontract);

  // GET /api/contracts/:id/subcontracts - Get all subcontracts of a contract
  router.get('/:id/subcontracts', authorize('contract:read'), contractController.getSubcontracts);

  // GET /api/contracts/:id/parents - Get all parent contracts of a contract
  router.get('/:id/parents', authorize('contract:read'), contractController.getParentContracts);

  // Reviewer management routes
  // POST /api/contracts/:id/reviewers - Assign a reviewer to a contract
  router.post('/:id/reviewers', authorize('contract:assign:reviewer'), validateRequest(assignReviewerSchema, true), contractController.assignReviewer);

  // GET /api/contracts/:id/reviewers - Get all reviewers of a contract (query: ?activeOnly=true)
  router.get('/:id/reviewers', authorize('contract:read'), contractController.getReviewers);

  // GET /api/contracts/:id/document-structure - Get document structure (expected vs loaded) for a contract
  router.get('/:id/document-structure', authorize('contract:read'), contractController.getDocumentStructure);

  // PUT /api/contracts/:id/reviewers/:userId - Update a reviewer
  router.put('/:id/reviewers/:userId', authorize('contract:assign:reviewer'), validateRequest(updateReviewerSchema, true), contractController.updateReviewer);

  // DELETE /api/contracts/:id/reviewers/:userId - Remove a reviewer from a contract
  router.delete('/:id/reviewers/:userId', authorize('contract:assign:reviewer'), contractController.removeReviewer);

  // Colaborator management routes
  // POST /api/contracts/:id/colaborators - Add a colaborator to a contract
  router.post('/:id/colaborators', authorize('contract:update'), contractController.addColaborator);

  // DELETE /api/contracts/:id/colaborators/:colaboratorId - Remove a colaborator from a contract
  router.delete('/:id/colaborators/:colaboratorId', authorize('contract:update'), contractController.removeColaborator);

  // GET /api/contracts/:id/colaborators - Get all colaborators of a contract
  router.get('/:id/colaborators', authorize('contract:read'), contractController.getColaborators);

  return router;
};

