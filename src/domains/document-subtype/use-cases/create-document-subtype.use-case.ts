import { DocumentSubtypeRepository } from '../repositories/document-subtype.repository';
import { DocumentSubtype, DocumentSubtypeProps } from '../entities/document-subtype.entity';
import { ConflictError } from '@shared/domain/errors';

export interface CreateDocumentSubtypeRequest {
  name: string;
  documentTypeId: string;
}

export class CreateDocumentSubtypeUseCase {
  constructor(private readonly documentSubtypeRepository: DocumentSubtypeRepository) {}

  public async execute(request: CreateDocumentSubtypeRequest): Promise<DocumentSubtype> {
    // Check if document subtype already exists with the same name for this document type
    const existingDocumentSubtype = await this.documentSubtypeRepository.existsByNameAndDocumentTypeId(
      request.name,
      request.documentTypeId,
    );
    if (existingDocumentSubtype) {
      throw new ConflictError('Ya existe un subtipo de documento con este nombre para este tipo de documento');
    }

    // Create document subtype
    const documentSubtypeProps: DocumentSubtypeProps = {
      name: request.name,
      documentTypeId: request.documentTypeId,
    };

    const documentSubtype = DocumentSubtype.create(documentSubtypeProps);

    return await this.documentSubtypeRepository.save(documentSubtype);
  }
}
