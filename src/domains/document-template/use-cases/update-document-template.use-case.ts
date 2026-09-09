import { IDocumentTemplateRepository } from '../repositories/document-template.repository.interface';
import { DocumentTemplate, DocumentTemplateField } from '../entities/document-template.entity';
import { NotFoundError } from '@shared/domain/errors';

export interface CreateNewVersionRequest {
  title?: string;
  documentDate?: Date;
  description?: string;
  fileUrl?: string;
  fields?: DocumentTemplateField[];
  createdBy?: string;
}

export class CreateNewDocumentTemplateVersionUseCase {
  constructor(private readonly documentTemplateRepository: IDocumentTemplateRepository) {}

  public async execute(id: string, request: CreateNewVersionRequest): Promise<DocumentTemplate> {
    const existing = await this.documentTemplateRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Plantilla de documento no encontrada');
    }

    // Get latest version for this code to compute next version number
    const latestVersion = await this.documentTemplateRepository.findLatestByCode(existing.code, existing.groupId);
    const nextVersion = (latestVersion?.version ?? existing.version) + 1;

    const newVersionProps = existing.createNewVersion(request);

    const newTemplate = DocumentTemplate.create({ ...newVersionProps, version: nextVersion });
    return this.documentTemplateRepository.save(newTemplate);
  }
}

export class DeleteDocumentTemplateUseCase {
  constructor(private readonly documentTemplateRepository: IDocumentTemplateRepository) {}

  public async execute(id: string): Promise<void> {
    const existing = await this.documentTemplateRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Plantilla de documento no encontrada');
    }
    await this.documentTemplateRepository.delete(id);
  }
}
