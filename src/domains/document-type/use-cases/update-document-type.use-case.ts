import { DocumentTypeRepository } from '../repositories/document-type.repository';
import { DocumentType } from '../entities/document-type.entity';
import { NotFoundError, ConflictError } from '@shared/domain/errors';

export interface UpdateDocumentTypeRequest {
  name?: string;
}

export class UpdateDocumentTypeUseCase {
  constructor(private readonly documentTypeRepository: DocumentTypeRepository) {}

  public async execute(id: string, request: UpdateDocumentTypeRequest): Promise<DocumentType> {
    const documentType = await this.documentTypeRepository.findById(id);
    if (!documentType) {
      throw new NotFoundError('Tipo de documento', id);
    }

    // Check if name is being updated and if it's already in use
    if (request.name && request.name !== documentType.name) {
      const existingDocumentType = await this.documentTypeRepository.findByName(request.name);
      if (existingDocumentType) {
        throw new ConflictError('Ya existe un tipo de documento con este nombre');
      }
      documentType.updateName(request.name);
    }

    return await this.documentTypeRepository.update(documentType);
  }
}

export class DeleteDocumentTypeUseCase {
  constructor(private readonly documentTypeRepository: DocumentTypeRepository) {}

  public async execute(id: string): Promise<void> {
    const documentType = await this.documentTypeRepository.findById(id);
    if (!documentType) {
      throw new NotFoundError('Tipo de documento', id);
    }

    await this.documentTypeRepository.delete(id);
  }
}
