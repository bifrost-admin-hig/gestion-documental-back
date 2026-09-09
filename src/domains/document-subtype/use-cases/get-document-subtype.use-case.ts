import { DocumentSubtypeRepository } from '../repositories/document-subtype.repository';
import { DocumentSubtype } from '../entities/document-subtype.entity';
import { NotFoundError } from '@shared/domain/errors';

export class GetDocumentSubtypeByIdUseCase {
  constructor(private readonly documentSubtypeRepository: DocumentSubtypeRepository) {}

  public async execute(id: string): Promise<DocumentSubtype> {
    const documentSubtype = await this.documentSubtypeRepository.findById(id);
    if (!documentSubtype) {
      throw new NotFoundError('Subtipo de documento', id);
    }
    return documentSubtype;
  }
}

export class GetAllDocumentSubtypesUseCase {
  constructor(private readonly documentSubtypeRepository: DocumentSubtypeRepository) {}

  public async execute(): Promise<DocumentSubtype[]> {
    return await this.documentSubtypeRepository.findAll();
  }
}

export class GetDocumentSubtypeByNameUseCase {
  constructor(private readonly documentSubtypeRepository: DocumentSubtypeRepository) {}

  public async execute(name: string): Promise<DocumentSubtype> {
    const documentSubtype = await this.documentSubtypeRepository.findByName(name);
    if (!documentSubtype) {
      throw new NotFoundError('Subtipo de documento con nombre ' + name);
    }
    return documentSubtype;
  }
}

export class GetDocumentSubtypesByDocumentTypeIdUseCase {
  constructor(private readonly documentSubtypeRepository: DocumentSubtypeRepository) {}

  public async execute(documentTypeId: string): Promise<DocumentSubtype[]> {
    return await this.documentSubtypeRepository.findByDocumentTypeId(documentTypeId);
  }
}
