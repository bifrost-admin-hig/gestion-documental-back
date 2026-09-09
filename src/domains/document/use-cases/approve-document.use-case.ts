import { DocumentRepository } from '../repositories/document.repository';
import { DocumentHistoryRepository } from '../repositories/document-history.repository';
import { DocumentHistoryProps } from '../entities/document-history.entity';
import { DocumentAction } from '../value-objects/document-enums';
import { NotFoundError } from '@shared/domain/errors';

export class ApproveDocumentUseCase {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly documentHistoryRepository: DocumentHistoryRepository,
  ) {}

  async execute(documentId: string, userId: string): Promise<void> {
    // Buscar el documento
    const document = await this.documentRepository.findById(documentId);
    if (!document) {
      throw new NotFoundError('Documento no encontrado');
    }

    // Cambiar estado a aprobado
    document.approve();

    // Guardar el documento
    await this.documentRepository.save(document);

    // Crear registro en historial
    const historyProps: DocumentHistoryProps = {
      documentId: document.id,
      documentModelId: document.documentModelId,
      action: DocumentAction.APPROVED,
      updatedBy: userId === 'system' ? undefined : userId,
      name: document.name,
      issuedDate: document.issuedDate,
      expirationDate: document.expirationDate,
      contractId: document.contractId,
      description: document.description,
      documentUrl: document.documentUrl,
      status: document.status,
      comment: document.comment,
    };

    await this.documentHistoryRepository.save(historyProps);
  }
}
