import { IDocumentTemplateRepository } from '../repositories/document-template.repository.interface';
import { DocumentTemplate } from '../entities/document-template.entity';
import { NotFoundError } from '@shared/domain/errors';

export class GetDocumentTemplateByIdUseCase {
  constructor(private readonly documentTemplateRepository: IDocumentTemplateRepository) {}

  public async execute(id: string): Promise<DocumentTemplate> {
    const template = await this.documentTemplateRepository.findById(id);
    if (!template) {
      throw new NotFoundError('Plantilla de documento no encontrada');
    }
    return template;
  }
}

export class GetAllDocumentTemplatesUseCase {
  constructor(private readonly documentTemplateRepository: IDocumentTemplateRepository) {}

  public async execute(groupId?: number): Promise<DocumentTemplate[]> {
    return this.documentTemplateRepository.findAll(groupId);
  }
}

export class GetDocumentTemplateVersionsUseCase {
  constructor(private readonly documentTemplateRepository: IDocumentTemplateRepository) {}

  public async execute(code: string): Promise<DocumentTemplate[]> {
    return this.documentTemplateRepository.findByCode(code);
  }
}

export class GetNextDocumentTemplateCodeUseCase {
  constructor(private readonly documentTemplateRepository: IDocumentTemplateRepository) {}

  public async execute(groupId: number): Promise<string> {
    return this.documentTemplateRepository.getNextCode(groupId);
  }
}
