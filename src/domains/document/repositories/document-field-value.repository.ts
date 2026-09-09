import { DocumentFieldValue } from '../entities/document.entity';

export interface DocumentFieldValueRepository {
  saveMany(documentId: string, fieldValues: DocumentFieldValue[]): Promise<void>;
  findByDocumentId(documentId: string): Promise<DocumentFieldValue[]>;
  deleteByDocumentId(documentId: string): Promise<void>;
}
