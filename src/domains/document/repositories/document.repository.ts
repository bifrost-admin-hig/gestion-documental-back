import { Document } from '../entities/document.entity';
import { DocumentStatus } from '../value-objects/document-enums';

export interface DocumentRepository {
  findById(id: string): Promise<Document | null>;
  findByIds(ids: string[]): Promise<Document[]>;
  findAll(groupId?: number, filters?: {
    contractId?: string;
    colaboratorId?: string;
    requiredForContract?: boolean;
    requiredForColaborator?: boolean;
    status?: DocumentStatus | DocumentStatus[];
  }): Promise<Document[]>;
  findByContractId(contractId: string): Promise<Document[]>;
  save(request: Partial<Omit<Document, 'id'>>): Promise<Document>;
  update(request: Document & { id: string }): Promise<Document>;
  delete(id: string): Promise<void>;
  findByDocumentModelId(documentModelId: string): Promise<Document[]>;
  findByColaboratorIds(colaboratorIds: string[]): Promise<Document[]>;
  findExpiredDocuments(): Promise<Document[]>;
  findExpiringDocuments(days: number): Promise<Document[]>;
  existsByModelAndColaborator(documentModelId: string, colaboratorIds: string[], name: string, excludeId?: string): Promise<boolean>;
  existsByModelContractColaborator(documentModelId: string, contractId: string, colaboratorIds: string[], name: string, excludeId?: string): Promise<boolean>;
  existsByCode(code: string, groupId: number, excludeId?: string): Promise<boolean>;
  findByTypeAndSubtypeId(typeId: string, subtypeId: string): Promise<Document[]>;
}
