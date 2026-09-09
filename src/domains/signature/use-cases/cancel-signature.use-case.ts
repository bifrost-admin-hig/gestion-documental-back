import { DocumentRepository } from '@domains/document/repositories/document.repository';
import { DocumentHistoryRepository } from '@domains/document/repositories/document-history.repository';
import { DocumentAction } from '@domains/document/value-objects/document-enums';
import { SignatureRepository } from '../repositories/signature.repository';
import { SignatureVerificationCodeRepository } from '../repositories/signature-verification-code.repository';
import { SignatureStatus } from '../value-objects/signature-enums';
import { ProcessFlowParticipantActionUseCase } from '@domains/signature-flow/use-cases/progress-signature-flow.use-case';
import { ForbiddenError, NotFoundError, ValidationError } from '@shared/domain/errors';

export interface CancelSignatureParams {
  signatureId: string;
  userId: string;
}

export class CancelSignatureUseCase {
  constructor(
    private readonly signatureRepository: SignatureRepository,
    private readonly signatureCodeRepository: SignatureVerificationCodeRepository,
    private readonly documentRepository: DocumentRepository,
    private readonly documentHistoryRepository: DocumentHistoryRepository,
    private readonly processFlowParticipantActionUseCase?: ProcessFlowParticipantActionUseCase,
  ) {}

  async execute(params: CancelSignatureParams): Promise<void> {
    const { signatureId, userId } = params;

    const signature = await this.signatureRepository.findById(signatureId);
    if (!signature) {
      throw new NotFoundError('Proceso de firma no encontrado');
    }

    if (signature.userId !== userId) {
      throw new ForbiddenError('No tienes permiso para cancelar este proceso de firma');
    }

    if (signature.status !== SignatureStatus.PENDING) {
      throw new ValidationError('Solo se pueden cancelar procesos de firma en estado pendiente');
    }

    const activeCode = await this.signatureCodeRepository.findActiveBySignatureId(signatureId);
    const errorReason = activeCode?.isExpired
      ? 'Error en proceso de firma: codigo expirado'
      : 'Error en proceso de firma: firma cancelada por el usuario';

    // Cancela solo el codigo activo; el flujo y el documento deben permanecer en firma pendiente.
    if (activeCode) {
      activeCode.usedAt = new Date();
      await this.signatureCodeRepository.update(activeCode);
    }

    signature.status = SignatureStatus.PENDING;
    signature.rejectionCode = null;
    signature.rejectionReason = null;
    signature.updatedAt = new Date();
    await this.signatureRepository.update(signature);

    const document = await this.documentRepository.findById(signature.documentId);
    if (document) {
      document.updateSignatureStatus(SignatureStatus.PENDING);
      await this.documentRepository.save(document);

      await this.documentHistoryRepository.save({
        documentId: document.id,
        documentModelId: document.documentModelId,
        name: document.name,
        issuedDate: document.issuedDate ?? undefined,
        expirationDate: document.expirationDate,
        contractId: document.contractId,
        description: document.description,
        documentUrl: document.documentUrl,
        status: document.status,
        action: DocumentAction.SIGNATURE_ERROR,
        updatedBy: userId,
        comment: errorReason,
      });
    }
  }
}
