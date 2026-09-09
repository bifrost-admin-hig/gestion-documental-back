import { Request, Response, NextFunction } from 'express';
import { CheckUserCanReviewContractUseCase } from '@domains/contract/use-cases/check-user-can-review-contract.use-case';
import { DocumentRepository } from '@domains/document/repositories/document.repository';
import { ForbiddenError, NotFoundError, ServerError, UnauthorizedError, ValidationError } from '@shared/domain/errors';

export function createContractReviewerMiddleware(
  checkUserCanReviewContractUseCase: CheckUserCanReviewContractUseCase,
  documentRepository?: DocumentRepository,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.auth.user;
    if (!user) throw new UnauthorizedError();

    try {
      // Obtener contractId según el tipo de endpoint
      let contractId: string | undefined;

      // Si viene de params directamente (rutas de contrato)
      contractId = req.params.contractId || req.body.contractId;

      // Si no hay contractId y tenemos documentRepository y params.id, obtenerlo del documento
      if (!contractId && documentRepository && req.params.id) {
        const document = await documentRepository.findById(req.params.id);
        if (!document) throw new NotFoundError('Document');

        if (!document.contractId) throw new NotFoundError('Document contract');

        contractId = document.contractId;
      }

      if (!contractId) throw new ValidationError('Contract ID is required', 'contractId');

      // Usuarios con permiso global no requieren ser revisores activos del contrato
      if (user.can('document:review:any')) {
        req.auth.contractId = contractId;
        return next();
      }

      // Verificar si el usuario tiene permiso para revisar documentos
      if (!user.can('document:review')) throw new ForbiddenError('User can\'t review documents');

      // Verificar si el usuario es un revisor activo del contrato
      const reviewCheck = await checkUserCanReviewContractUseCase.execute(contractId, user.id);

      if (!reviewCheck.canReview) {
        // Caso 1: El contrato no tiene revisores asignados
        if (!reviewCheck.hasReviewers) {
          throw new ForbiddenError('Contract has no reviewers assigned. Please assign reviewers before reviewing documents.');
        }

        // Caso 2: El contrato tiene revisores, pero el usuario no es uno de ellos
        throw new ForbiddenError('User is not an active reviewer for this contract');
      }

      // Guardar el contractId en el request para uso posterior
      req.auth.contractId = contractId;
      next();
    } catch (_error) {
      throw new ServerError('Error checking reviewer status');
    }
  };
}
