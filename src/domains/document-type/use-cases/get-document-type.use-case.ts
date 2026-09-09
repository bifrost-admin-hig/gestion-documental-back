import { DocumentTypeRepository } from '../repositories/document-type.repository';
import { DocumentType } from '../entities/document-type.entity';
import { NotFoundError } from '@shared/domain/errors';

export class GetDocumentTypeByIdUseCase {
  constructor(private readonly documentTypeRepository: DocumentTypeRepository) {}

  public async execute(id: string): Promise<DocumentType> {
    const documentType = await this.documentTypeRepository.findById(id);
    if (!documentType) {
      throw new NotFoundError('Tipo de documento', id);
    }
    return documentType;
  }
}

export class GetAllDocumentTypesUseCase {
  constructor(private readonly documentTypeRepository: DocumentTypeRepository) {}

  public async execute(): Promise<DocumentType[]> {
    return await this.documentTypeRepository.findAll();
  }
}

export class GetDocumentTypeByNameUseCase {
  constructor(private readonly documentTypeRepository: DocumentTypeRepository) {}

  public async execute(name: string): Promise<DocumentType> {
    const documentType = await this.documentTypeRepository.findByName(name);
    if (!documentType) {
      throw new NotFoundError('Tipo de documento con nombre ' + name);
    }
    return documentType;
  }
}
