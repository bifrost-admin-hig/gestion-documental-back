import { DocumentRepository } from '../repositories/document.repository';
import { DocumentHistoryRepository } from '../repositories/document-history.repository';
import { Document, DocumentProps } from '../entities/document.entity';
import { DocumentHistoryProps } from '../entities/document-history.entity';
import { DocumentAction } from '../value-objects/document-enums';
import { ContractRepository } from '@domains/contract/repositories/contract.repository';
import { ColaboratorRepository } from '@domains/colaborators/repositories/colaborator.repository';
import { IDocumentModelRepository } from '@domains/document-model/repositories/document-model.repository.interface';
import { IFamilyRepository } from '@domains/family/repositories/family.repository.interface';
import { ValidationError, NotFoundError } from '@shared/domain/errors';

export interface AssignDocumentsToGroupRequest {
  documentModelId: string;
  colaboratorIds: string[];
  issuedDate?: Date;
  expirationDate?: Date;
  name?: string;
  createdBy?: string;
  comment?: string;
}

export interface AssignDocumentsToGroupResult {
  created: Document[];
  skipped: string[];
}

export class AssignDocumentsToGroupUseCase {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly documentHistoryRepository: DocumentHistoryRepository,
    private readonly contractRepository: ContractRepository,
    private readonly colaboratorRepository: ColaboratorRepository,
    private readonly documentModelRepository: IDocumentModelRepository,
    private readonly familyRepository: IFamilyRepository,
  ) {}

  public async execute(request: AssignDocumentsToGroupRequest): Promise<AssignDocumentsToGroupResult> {
    const documentModel = await this.documentModelRepository.findById(request.documentModelId);
    if (!documentModel) {
      throw new ValidationError('Modelo de documento no encontrado');
    }

    const family = await this.familyRepository.findById(documentModel.familyId);
    if (!family) {
      throw new NotFoundError('Familia asociada al modelo no encontrada');
    }
    const contractId = family.contractId;

    const contract = await this.contractRepository.findById(contractId);
    if (!contract) {
      throw new ValidationError('Contrato asociado a la familia no encontrado');
    }

    if (!request.colaboratorIds || request.colaboratorIds.length === 0) {
      throw new ValidationError('Debe proporcionar al menos un colaborador');
    }

    const created: Document[] = [];
    const skipped: string[] = [];

    for (const colaboratorId of request.colaboratorIds) {
      const colaborator = await this.colaboratorRepository.findById(colaboratorId);
      if (!colaborator) {
        skipped.push(colaboratorId);
        continue;
      }

      const docName = request.name?.trim() || `${documentModel.documentTypeId} ${documentModel.documentSubtypeId}`;

      const exists = await this.documentRepository.existsByModelContractColaborator(
        request.documentModelId,
        contractId,
        [colaboratorId],
        docName,
      );
      if (exists) {
        skipped.push(colaboratorId);
        continue;
      }

      const props: DocumentProps = {
        documentModelId: request.documentModelId,
        colaboratorIds: [colaboratorId],
        name: docName,
        issuedDate: request.issuedDate,
        expirationDate: request.expirationDate,
        contractId: contractId,
        createdBy: request.createdBy,
        groupId: colaborator.groupId,
        reviewDate: Document.calculateDefaultReviewDate(new Date(), request.expirationDate),

        // Read-only properties populated for completeness if needed immediately
        documentTypeId: documentModel.documentTypeId,
        documentSubtypeId: documentModel.documentSubtypeId,
        requiredForContract: documentModel.requiredForContract,
        requiredForColaborator: documentModel.requiredForColaborator,
        requiredExpirationDate: documentModel.requiredExpirationDate,
      };
      const doc = Document.create(props);
      const saved = await this.documentRepository.save(doc);
      created.push(saved);

      if (request.createdBy && request.createdBy !== 'system' && saved.issuedDate) {
        const history: DocumentHistoryProps = {
          documentId: saved.id,
          documentModelId: saved.documentModelId || request.documentModelId,
          name: saved.name,
          issuedDate: saved.issuedDate,
          expirationDate: saved.expirationDate || undefined,
          contractId: saved.contractId || undefined,
          description: saved.description,
          documentUrl: saved.documentUrl,
          status: saved.status,
          comment: request.comment || null,
          action: DocumentAction.CREATED,
          updatedBy: request.createdBy,
        };
        await this.documentHistoryRepository.save(history);
      }
    }

    return { created, skipped };
  }
}
