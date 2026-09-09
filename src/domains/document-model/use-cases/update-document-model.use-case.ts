import { IDocumentModelRepository } from '../repositories/document-model.repository.interface';
import { DocumentModel } from '../entities/document-model.entity';
import { NotFoundError, ValidationError } from '@shared/domain/errors';

export interface UpdateDocumentModelRequest {
  groupId?: number;
  documentTypeId?: string;
  documentSubtypeId?: string;
  requiredForContract?: boolean;
  requiredForColaborator?: boolean;
  requiredExpirationDate?: boolean;
  requiresApproval?: boolean;
  requiresSignature?: boolean;
}

export class UpdateDocumentModelUseCase {
  constructor(private readonly documentModelRepository: IDocumentModelRepository) {}

  public async execute(id: string, request: UpdateDocumentModelRequest): Promise<DocumentModel> {
    const documentModel = await this.documentModelRepository.findById(id);
    if (!documentModel) {
      throw new NotFoundError('Modelo de documento no encontrado');
    }

    // If updating type, subtype or group, check for duplicates
    if (request.documentTypeId || request.documentSubtypeId || request.groupId) {
      const newTypeId = request.documentTypeId || documentModel.documentTypeId;
      const newSubtypeId = request.documentSubtypeId || documentModel.documentSubtypeId;
      const newGroupId = request.groupId || documentModel.groupId;

      // Only check if any of the key fields is changing
      if (
        newTypeId !== documentModel.documentTypeId ||
        newSubtypeId !== documentModel.documentSubtypeId ||
        newGroupId !== documentModel.groupId
      ) {
        const existing = await this.documentModelRepository.findByFamilyTypeSubtype(
          documentModel.familyId,
          newTypeId,
          newSubtypeId,
          newGroupId,
        );

        if (existing && existing.id !== id) {
          throw new ValidationError(
            'Ya existe un modelo de documento con esta combinación de familia, tipo y subtipo en el grupo seleccionado',
          );
        }
      }
    }

    documentModel.update(request);

    return await this.documentModelRepository.update(documentModel);
  }
}

export class DeleteDocumentModelUseCase {
  constructor(private readonly documentModelRepository: IDocumentModelRepository) {}

  public async execute(id: string): Promise<void> {
    const documentModel = await this.documentModelRepository.findById(id);
    if (!documentModel) {
      throw new NotFoundError('Modelo de documento no encontrado');
    }

    await this.documentModelRepository.softDelete(id);
  }
}
