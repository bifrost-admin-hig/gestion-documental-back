import { DocumentHistory, DocumentHistoryProps } from '../entities/document-history.entity';
import { DocumentAction } from '../value-objects/document-enums';

export interface DocumentHistoryRepository {
  findByDocumentId(documentId: string): Promise<DocumentHistory[]>;
  findByAction(action: DocumentAction): Promise<DocumentHistory[]>;
  findByUpdatedBy(updatedBy: string): Promise<DocumentHistory[]>;
  findByDocumentIdAndAction(documentId: string, action: DocumentAction): Promise<DocumentHistory[]>;
  findById(id: string): Promise<DocumentHistory | null>;
  findAll(): Promise<DocumentHistory[]>;
  save(history: DocumentHistoryProps): Promise<DocumentHistory>;
  delete(id: string): Promise<void>;
}
