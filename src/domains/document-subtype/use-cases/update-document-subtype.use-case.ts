import { DocumentSubtypeRepository } from '../repositories/document-subtype.repository';
import { DocumentSubtype } from '../entities/document-subtype.entity';
import { NotFoundError, ConflictError } from '@shared/domain/errors';

export interface UpdateDocumentSubtypeRequest {
  name?: string;
  documentTypeId?: string;
}

export class UpdateDocumentSubtypeUseCase {
  constructor(private readonly documentSubtypeRepository: DocumentSubtypeRepository) {}

  public async execute(id: string, request: UpdateDocumentSubtypeRequest): Promise<DocumentSubtype> {
    const documentSubtype = await this.documentSubtypeRepository.findById(id);
    if (!documentSubtype) {
      throw new NotFoundError('Subtipo de documento', id);
    }

    // Check if name is being updated and if it's already in use for the same document type
    if (request.name && request.name !== documentSubtype.name) {
      const targetDocumentTypeId = request.documentTypeId || documentSubtype.documentTypeId;
      const existingDocumentSubtype = await this.documentSubtypeRepository.existsByNameAndDocumentTypeId(
        request.name,
        targetDocumentTypeId,
      );
      if (existingDocumentSubtype) {
        throw new ConflictError('Ya existe un subtipo de documento con este nombre para este tipo de documento');
      }
      documentSubtype.updateName(request.name);
    }

    // Update document type ID if provided
    if (request.documentTypeId && request.documentTypeId !== documentSubtype.documentTypeId) {
      documentSubtype.updateDocumentTypeId(request.documentTypeId);
    }

    return await this.documentSubtypeRepository.update(documentSubtype);
  }
}

export class DeleteDocumentSubtypeUseCase {
  constructor(private readonly documentSubtypeRepository: DocumentSubtypeRepository) {}

  public async execute(id: string): Promise<void> {
    const documentSubtype = await this.documentSubtypeRepository.findById(id);
    if (!documentSubtype) {
      throw new NotFoundError('Subtipo de documento', id);
    }

    await this.documentSubtypeRepository.delete(id);
  }
}
