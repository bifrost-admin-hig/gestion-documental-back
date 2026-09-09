import { DocumentTypeRepository } from '../repositories/document-type.repository';
import { DocumentType } from '../entities/document-type.entity';
import { DocumentSubtype } from '@domains/document-subtype/entities/document-subtype.entity';
import { DocumentSubtypeRepository } from '@domains/document-subtype/repositories/document-subtype.repository';
import { NotFoundError } from '@shared/domain/errors';

export interface DocumentTypeWithSubtypes {
  documentType: DocumentType;
  subtypes: DocumentSubtype[];
}

export class GetDocumentTypeWithSubtypesUseCase {
  constructor(
    private readonly documentTypeRepository: DocumentTypeRepository,
    private readonly documentSubtypeRepository: DocumentSubtypeRepository,
  ) {}

  public async execute(id: string): Promise<DocumentTypeWithSubtypes> {
    const documentType = await this.documentTypeRepository.findById(id);
    if (!documentType) {
      throw new NotFoundError('Tipo de documento', id);
    }

    const subtypes = await this.documentSubtypeRepository.findByDocumentTypeId(id);

    return {
      documentType,
      subtypes,
    };
  }
}

export class GetAllDocumentTypesWithSubtypesUseCase {
  constructor(
    private readonly documentTypeRepository: DocumentTypeRepository,
    private readonly documentSubtypeRepository: DocumentSubtypeRepository,
  ) {}

  public async execute(): Promise<DocumentTypeWithSubtypes[]> {
    const documentTypes = await this.documentTypeRepository.findAll();

    // Get subtypes for each document type
    const results = await Promise.all(
      documentTypes.map(async (documentType) => {
        const subtypes = await this.documentSubtypeRepository.findByDocumentTypeId(documentType.id);
        return {
          documentType,
          subtypes,
        };
      }),
    );

    return results;
  }
}
