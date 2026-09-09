import { DocumentType } from '../entities/document-type.entity';

export interface DocumentTypeRepository {
  findById(id: string): Promise<DocumentType | null>;
  findAll(): Promise<DocumentType[]>;
  save(request: Partial<Omit<DocumentType, 'id'>>): Promise<DocumentType>;
  update(request: DocumentType & { id: string }): Promise<DocumentType>;
  delete(id: string): Promise<void>;
  findByName(name: string): Promise<DocumentType | null>;
  existsByName(name: string): Promise<boolean>;
}
