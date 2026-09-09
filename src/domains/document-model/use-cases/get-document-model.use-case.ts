import { IDocumentModelRepository } from '../repositories/document-model.repository.interface';
import { DocumentModel } from '../entities/document-model.entity';
import { NotFoundError } from '@shared/domain/errors';

export class GetDocumentModelByIdUseCase {
  constructor(private readonly documentModelRepository: IDocumentModelRepository) {}

  public async execute(id: string): Promise<DocumentModel> {
    const documentModel = await this.documentModelRepository.findById(id);
    if (!documentModel) {
      throw new NotFoundError('Modelo de documento no encontrado');
    }
    return documentModel;
  }
}

export class GetAllDocumentModelsUseCase {
  constructor(private readonly documentModelRepository: IDocumentModelRepository) {}

  public async execute(groupId?: number, familyId?: string): Promise<DocumentModel[]> {
    return await this.documentModelRepository.findAll(groupId, familyId);
  }
}

export class GetDocumentModelsByFamilyIdUseCase {
  constructor(private readonly documentModelRepository: IDocumentModelRepository) {}

  public async execute(familyId: string, groupId?: number): Promise<DocumentModel[]> {
    return await this.documentModelRepository.findByFamilyId(familyId, groupId);
  }
}
