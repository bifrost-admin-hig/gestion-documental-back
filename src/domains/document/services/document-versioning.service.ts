import { Document } from '../entities/document.entity';
import { DocumentHistoryProps } from '../entities/document-history.entity';
import { DocumentAction, DocumentStatus } from '../value-objects/document-enums';
import { DocumentRepository } from '../repositories/document.repository';
import { DocumentHistoryRepository } from '../repositories/document-history.repository';
import { DocumentFieldValueRepository } from '../repositories/document-field-value.repository';

/**
 * Archiva el estado de un documento antes de reemplazar su archivo, y registra el
 * reemplazo en el Historial — mismo patrón ya usado por `UpdateDocumentUseCase` cuando
 * se sube un archivo nuevo al editar un documento (ver `update-document.use-case.ts`).
 * Reutilizado por el proceso de firma para nunca sobrescribir el archivo original.
 */
export class DocumentVersioningService {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly documentHistoryRepository: DocumentHistoryRepository,
    private readonly documentFieldValueRepository?: DocumentFieldValueRepository,
  ) {}

  /**
   * Clona el estado actual del documento (con su documentUrl actual) en un documento
   * obsoleto aparte. No modifica el documento vivo — el llamador debe actualizar su
   * documentUrl y guardarlo después de archivar.
   */
  async archiveCurrentFileVersion(document: Document, archiveComment: string): Promise<Document | null> {
    if (!document.documentUrl) return null;

    const archived = await this.documentRepository.save(Document.create({
      documentModelId: document.documentModelId,
      colaboratorIds: [...document.colaboratorIds],
      name: document.name,
      issuedDate: document.issuedDate ?? undefined,
      expirationDate: document.expirationDate,
      contractId: document.contractId,
      description: document.description,
      documentUrl: document.documentUrl,
      status: DocumentStatus.OBSOLETE,
      isSuperseded: true,
      previousVersionId: document.previousVersionId,
      groupId: document.groupId,
      requiredColaboratorsCount: document.requiredColaboratorsCount,
      createdBy: document.createdBy ?? undefined,
      comment: archiveComment,
      templateId: document.templateId,
    }));

    if (this.documentFieldValueRepository) {
      try {
        const previousFieldValues = await this.documentFieldValueRepository.findByDocumentId(document.id);
        if (previousFieldValues.length > 0) {
          await this.documentFieldValueRepository.saveMany(archived.id, previousFieldValues);
        }
      } catch {
        // La copia de campos históricos no debe bloquear el archivado.
      }
    }

    return archived;
  }

  /**
   * Dos entradas de Historial para el reemplazo de archivo: una en el documento vivo
   * (con el diff antes/después que ya sabe leer `DocumentHistoryChangeCard`), y otra en
   * el documento archivado (con la referencia hacia adelante, igual que en la edición).
   */
  async recordFileReplacedHistory(params: {
    liveDocument: Document;
    archivedDocument: Document;
    previousDocumentUrl: string;
    action: DocumentAction;
    updatedBy?: string;
    updatedByName?: string;
    comment: string;
  }): Promise<void> {
    const { liveDocument, archivedDocument, previousDocumentUrl, action, updatedBy, updatedByName, comment } = params;

    const liveHistoryProps: DocumentHistoryProps = {
      documentId: liveDocument.id,
      documentModelId: liveDocument.documentModelId,
      name: liveDocument.name,
      issuedDate: liveDocument.issuedDate ?? undefined,
      expirationDate: liveDocument.expirationDate,
      contractId: liveDocument.contractId,
      description: liveDocument.description,
      documentUrl: liveDocument.documentUrl,
      status: liveDocument.status,
      comment,
      actionComment: JSON.stringify({
        changes: [{
          field: 'documentUrl',
          label: 'Archivo',
          before: 'Archivo anterior',
          after: 'Archivo firmado',
          beforeFileId: previousDocumentUrl,
          afterFileId: liveDocument.documentUrl,
        }],
        archivedVersionId: archivedDocument.id,
      }),
      action,
      updatedBy,
      updatedByName,
    };
    await this.documentHistoryRepository.save(liveHistoryProps).catch(() => {});

    const archivedHistoryProps: DocumentHistoryProps = {
      documentId: archivedDocument.id,
      documentModelId: archivedDocument.documentModelId,
      name: archivedDocument.name,
      issuedDate: archivedDocument.issuedDate ?? undefined,
      expirationDate: archivedDocument.expirationDate,
      contractId: archivedDocument.contractId,
      description: archivedDocument.description,
      documentUrl: archivedDocument.documentUrl,
      status: archivedDocument.status,
      comment: 'Versión anterior al estampado de firma.',
      actionComment: JSON.stringify({ supersededByDocumentId: liveDocument.id }),
      action: DocumentAction.ARCHIVED,
      updatedBy,
      updatedByName,
    };
    await this.documentHistoryRepository.save(archivedHistoryProps).catch(() => {});
  }
}
