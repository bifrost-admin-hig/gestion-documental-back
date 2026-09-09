import { IDocumentModelRepository, DocumentModelContractFilters } from '@domains/document-model/repositories/document-model.repository.interface';
import { DocumentRepository } from '@domains/document/repositories/document.repository';
import { NotFoundError } from '@shared/domain/errors';
import { ContractRepository } from '../repositories/contract.repository';

export interface ContractDocumentStructureItem {
  documentModelId: string;
  familyId: string;
  familyName: string;
  documentTypeId: string;
  documentTypeName: string;
  documentSubtypeId: string;
  documentSubtypeName: string;
  isComplete: boolean;
  requiredForContract: boolean;
}

export interface ContractDocumentStructureFilters extends DocumentModelContractFilters {
  status?: 'complete' | 'incomplete';
}

export class GetContractDocumentStructureUseCase {
  constructor(
    private readonly contractRepository: ContractRepository,
    private readonly documentModelRepository: IDocumentModelRepository,
    private readonly documentRepository: DocumentRepository,
  ) {}

  async execute(
    contractId: string,
    filters?: ContractDocumentStructureFilters,
  ): Promise<ContractDocumentStructureItem[]> {
    const contract = await this.contractRepository.findById(contractId);
    if (!contract) {
      throw new NotFoundError('Contrato no encontrado');
    }

    const groupId = contract.groupId;
    const { status, ...modelFilters } = filters ?? {};

    const documentModels = await this.documentModelRepository.findByContractId(
      contractId,
      groupId,
      modelFilters,
    );

    const documents = await this.documentRepository.findAll(groupId, { contractId });
    const completedModelIds = new Set(documents.map(d => d.documentModelId));

    const items: ContractDocumentStructureItem[] = documentModels.map(model => ({
      documentModelId: model.id,
      familyId: model.familyId,
      familyName: model.familyName ?? '',
      documentTypeId: model.documentTypeId,
      documentTypeName: model.documentTypeName ?? '',
      documentSubtypeId: model.documentSubtypeId,
      documentSubtypeName: model.documentSubtypeName ?? '',
      isComplete: completedModelIds.has(model.id),
      requiredForContract: model.requiredForContract,
    }));

    if (status === 'complete') {
      return items.filter(item => item.isComplete);
    }
    if (status === 'incomplete') {
      return items.filter(item => !item.isComplete);
    }

    return items;
  }
}
