import { IDocumentTemplateRepository } from '../repositories/document-template.repository.interface';
import { DocumentTemplate, DocumentTemplateField, DocumentTemplateProps } from '../entities/document-template.entity';
import { ValidationError } from '@shared/domain/errors';
import { GroupRepository } from '@domains/group/repositories/group.repository';

export interface CreateDocumentTemplateRequest {
  title: string;
  documentDate: Date;
  description?: string;
  fileUrl?: string;
  groupId: number;
  fields?: DocumentTemplateField[];
  createdBy?: string;
  /** Code elegido manualmente por el usuario. Si se omite, se autogenera. */
  code?: string;
}

export class CreateDocumentTemplateUseCase {
  constructor(
    private readonly documentTemplateRepository: IDocumentTemplateRepository,
    private readonly groupRepository: GroupRepository,
  ) {}

  public async execute(request: CreateDocumentTemplateRequest): Promise<DocumentTemplate> {
    const group = await this.groupRepository.findById(request.groupId);
    if (!group) {
      throw new ValidationError('Grupo no encontrado', 'groupId');
    }

    const props: DocumentTemplateProps = {
      title: request.title,
      version: 1,
      documentDate: request.documentDate,
      description: request.description,
      fileUrl: request.fileUrl,
      groupId: request.groupId,
      fields: request.fields ?? [],
      createdBy: request.createdBy,
    };

    const template = DocumentTemplate.create(props);
    return this.documentTemplateRepository.createWithCode(template, request.code);
  }
}
