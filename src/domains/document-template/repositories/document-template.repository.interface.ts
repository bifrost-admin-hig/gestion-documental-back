import { DocumentTemplate } from '../entities/document-template.entity';

export interface IDocumentTemplateRepository {
  save(template: DocumentTemplate): Promise<DocumentTemplate>;
  /**
   * Persists a new template, resolving its `code` atomically (locked per group) to
   * prevent race conditions between concurrent creations. If `requestedCode` is
   * provided, it is validated as unique among active templates of the group instead
   * of being auto-generated.
   */
  createWithCode(template: DocumentTemplate, requestedCode?: string): Promise<DocumentTemplate>;
  findById(id: string): Promise<DocumentTemplate | null>;
  findAll(groupId?: number): Promise<DocumentTemplate[]>;
  findByCode(code: string): Promise<DocumentTemplate[]>;
  findLatestByCode(code: string, groupId: number): Promise<DocumentTemplate | null>;
  delete(id: string): Promise<void>;
  getNextCode(groupId: number): Promise<string>;
}
