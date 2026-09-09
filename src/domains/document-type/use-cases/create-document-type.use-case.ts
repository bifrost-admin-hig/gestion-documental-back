import { DocumentTypeRepository } from '../repositories/document-type.repository';
import { DocumentType, DocumentTypeProps } from '../entities/document-type.entity';
import { ConflictError } from '@shared/domain/errors';

export interface CreateDocumentTypeRequest {
  name: string;
}

export class CreateDocumentTypeUseCase {
  constructor(private readonly documentTypeRepository: DocumentTypeRepository) {}

  public async execute(request: CreateDocumentTypeRequest): Promise<DocumentType> {
    // Check if document type already exists with the same name
    const existingDocumentType = await this.documentTypeRepository.findByName(request.name);
    if (existingDocumentType) {
      throw new ConflictError('Ya existe un tipo de documento con este nombre');
    }

    // Create document type
    const documentTypeProps: DocumentTypeProps = {
      name: request.name,
    };

    const documentType = DocumentType.create(documentTypeProps);

    return await this.documentTypeRepository.save(documentType);
  }
}
