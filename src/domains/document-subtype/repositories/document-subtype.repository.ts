import { DocumentSubtype } from '../entities/document-subtype.entity';

export interface DocumentSubtypeRepository {
  findById(id: string): Promise<DocumentSubtype | null>;
  findAll(): Promise<DocumentSubtype[]>;
  save(request: Partial<Omit<DocumentSubtype, 'id'>>): Promise<DocumentSubtype>;
  update(request: DocumentSubtype & { id: string }): Promise<DocumentSubtype>;
  delete(id: string): Promise<void>;
  findByName(name: string): Promise<DocumentSubtype | null>;
  findByDocumentTypeId(documentTypeId: string): Promise<DocumentSubtype[]>;
  existsByName(name: string): Promise<boolean>;
  existsByNameAndDocumentTypeId(name: string, documentTypeId: string): Promise<boolean>;
}
