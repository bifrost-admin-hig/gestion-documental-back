import { DocumentModel } from '../entities/document-model.entity';

export interface DocumentModelContractFilters {
  familyId?: string;
  documentTypeId?: string;
  documentSubtypeId?: string;
}

export interface IDocumentModelRepository {
  findAll(groupId?: number, familyId?: string): Promise<DocumentModel[]>;
  findById(id: string): Promise<DocumentModel | null>;
  findByFamilyId(familyId: string, groupId?: number): Promise<DocumentModel[]>;
  findByContractId(contractId: string, groupId: number, filters?: DocumentModelContractFilters): Promise<DocumentModel[]>;
  findByFamilyTypeSubtype(
    familyId: string,
    documentTypeId: string,
    documentSubtypeId: string,
    groupId?: number,
  ): Promise<DocumentModel | null>;
  create(documentModel: DocumentModel): Promise<DocumentModel>;
  update(documentModel: DocumentModel): Promise<DocumentModel>;
  delete(id: string): Promise<void>;
  softDelete(id: string): Promise<void>;
  restore(id: string): Promise<void>;
}
