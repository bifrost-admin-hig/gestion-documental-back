import { DocumentRepository } from '../repositories/document.repository';
import { DocumentHistoryRepository } from '../repositories/document-history.repository';
import { DocumentFieldValueRepository } from '../repositories/document-field-value.repository';
import { Document, DocumentProps, DocumentFieldValue } from '../entities/document.entity';
import { DocumentHistoryProps } from '../entities/document-history.entity';
import { DocumentAction, DocumentStatus } from '../value-objects/document-enums';
import { ValidationError } from '@shared/domain/errors';
import { GroupRepository } from '@domains/group/repositories/group.repository';
import { IFamilyRepository } from '@domains/family/repositories/family.repository.interface';
import { IDocumentModelRepository } from '@domains/document-model/repositories/document-model.repository.interface';
import { ColaboratorRepository } from '@domains/colaborators/repositories/colaborator.repository';
import { AreaRepository } from '@domains/area/repositories/area.repository';

export interface CreateDocumentRequest {
  documentModelId: string;
  colaboratorIds?: string[];
  name: string;
  issuedDate?: Date;
  expirationDate?: Date;
  description?: string;
  documentUrl?: string;
  groupId: number;
  requiredColaboratorsCount?: number;
  createdBy?: string;
  comment?: string;
  templateId?: string;
  fieldValues?: DocumentFieldValue[];
  code?: string;
  reviewDate?: Date | null;
  responsibleColaboratorId?: string;
  areaId?: string;
}

export class CreateDocumentUseCase {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly documentHistoryRepository: DocumentHistoryRepository,
    private readonly groupRepository: GroupRepository,
    private readonly documentModelRepository: IDocumentModelRepository,
    private readonly familyRepository: IFamilyRepository,
    private readonly documentFieldValueRepository?: DocumentFieldValueRepository,
    private readonly colaboratorRepository?: ColaboratorRepository,
    private readonly areaRepository?: AreaRepository,
  ) {}

  public async execute(request: CreateDocumentRequest): Promise<Document> {
    // Validate group exists
    const group = await this.groupRepository.findById(request.groupId);
    if (!group) {
      throw new ValidationError('Group not found', 'groupId');
    }

    // Validate Document Model exists
    const documentModel = await this.documentModelRepository.findById(request.documentModelId);
    if (!documentModel) {
      throw new ValidationError('Document Model not found', 'documentModelId');
    }

    // Get Family and Contract
    const family = await this.familyRepository.findById(documentModel.familyId);
    if (!family) {
      throw new ValidationError('Family associated with model not found');
    }
    const contractId = family.contractId;

    // Verificando que no haya documentos duplicados
    if (request.colaboratorIds && request.colaboratorIds.length > 0) {
      const exists = await this.documentRepository.existsByModelContractColaborator(
        request.documentModelId,
        contractId,
        request.colaboratorIds,
        request.name,
      );

      if (exists) {
        throw new ValidationError('Ya existe un documento con el mismo nombre, modelo y colaboradores en este contrato.');
      }
    }

    // Validate required expiration date based on model
    if (request.documentUrl && request.documentUrl.trim().length > 0) {
      if (documentModel.requiredExpirationDate && !request.expirationDate) {
        throw new ValidationError('La fecha de expiración es requerida para este documento');
      }
    }

    // Identificación única: el código, si se indica, no puede repetirse dentro del grupo
    const code = request.code?.trim() || undefined;
    if (code) {
      const codeExists = await this.documentRepository.existsByCode(code, request.groupId);
      if (codeExists) {
        throw new ValidationError('Ya existe un documento con ese código en este grupo', 'code');
      }
    }

    if (request.responsibleColaboratorId && this.colaboratorRepository) {
      const responsible = await this.colaboratorRepository.findById(request.responsibleColaboratorId);
      if (!responsible) {
        throw new ValidationError('El colaborador responsable indicado no existe', 'responsibleColaboratorId');
      }
    }

    if (request.areaId && this.areaRepository) {
      const area = await this.areaRepository.findById(request.areaId);
      if (!area) {
        throw new ValidationError('El área indicada no existe', 'areaId');
      }
    }

    // Fecha de próxima revisión: si no se indica, se calcula automáticamente
    // (creación + 30 días, ajustada a vencimiento - 10 días cuando no queda margen).
    const reviewDate = request.reviewDate !== undefined
      ? request.reviewDate
      : Document.calculateDefaultReviewDate(new Date(), request.expirationDate);

    // Creando documento
    const documentProps: DocumentProps = {
      documentModelId: request.documentModelId,
      colaboratorIds: request.colaboratorIds,
      name: request.name,
      issuedDate: request.issuedDate,
      expirationDate: request.expirationDate,
      contractId: contractId,
      description: request.description,
      documentUrl: request.documentUrl,
      groupId: request.groupId,
      requiredColaboratorsCount: request.requiredColaboratorsCount,
      createdBy: request.createdBy,
      templateId: request.templateId,
      status: documentModel.requiresApproval === false ? DocumentStatus.UPLOADED : undefined,
      code,
      reviewDate,
      responsibleColaboratorId: request.responsibleColaboratorId,
      areaId: request.areaId,
    };

    const document = Document.create(documentProps);

    // Guardando documento
    const savedDocument = await this.documentRepository.save(document);

    // Guardando valores de campos de plantilla
    if (this.documentFieldValueRepository && request.fieldValues && request.fieldValues.length > 0) {
      await this.documentFieldValueRepository.saveMany(savedDocument.id, request.fieldValues);
    }

    // Creando entrada de historial cuando el contexto del usuario está disponible
    if (request.createdBy && request.createdBy !== 'system') {
      const historyProps: DocumentHistoryProps = {
        documentId: savedDocument.id,
        documentModelId: savedDocument.documentModelId || request.documentModelId,
        name: savedDocument.name,
        issuedDate: savedDocument.issuedDate,
        expirationDate: savedDocument.expirationDate,
        contractId: savedDocument.contractId,
        description: savedDocument.description,
        documentUrl: savedDocument.documentUrl,
        status: savedDocument.status,
        comment: request.comment || null,
        action: DocumentAction.CREATED,
        updatedBy: request.createdBy,
        updatedAt: new Date(),
      };

      await this.documentHistoryRepository.save(historyProps);
    }

    return savedDocument;
  }
}
