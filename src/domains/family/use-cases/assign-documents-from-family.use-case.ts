import { DocumentRepository } from '@domains/document/repositories/document.repository';
import { DocumentHistoryRepository } from '@domains/document/repositories/document-history.repository';
import { IDocumentModelRepository } from '@domains/document-model/repositories/document-model.repository.interface';
import { ContractRepository } from '@domains/contract/repositories/contract.repository';
import { ColaboratorRepository } from '@domains/colaborators/repositories/colaborator.repository';
import { IFamilyRepository } from '../repositories/family.repository.interface';
import { Document, DocumentProps } from '@domains/document/entities/document.entity';
import { DocumentHistoryProps } from '@domains/document/entities/document-history.entity';
import { DocumentAction } from '@domains/document/value-objects/document-enums';
import { ValidationError } from '@shared/domain/errors';

export interface AssignDocumentsFromFamilyRequest {
  familyId: string;
  colaboratorIds: string[];
  createdBy?: string;
  comment?: string;
}

export interface AssignDocumentsFromFamilyResult {
  created: Document[];
  skipped: string[];
}

export class AssignDocumentsFromFamilyUseCase {
  constructor(
    private readonly familyRepository: IFamilyRepository,
    private readonly documentModelRepository: IDocumentModelRepository,
    private readonly documentRepository: DocumentRepository,
    private readonly documentHistoryRepository: DocumentHistoryRepository,
    private readonly contractRepository: ContractRepository,
    private readonly colaboratorRepository: ColaboratorRepository,
  ) {}

  public async execute(request: AssignDocumentsFromFamilyRequest): Promise<AssignDocumentsFromFamilyResult> {
    // Validar que exista la familia
    const family = await this.familyRepository.findById(request.familyId);
    if (!family) {
      throw new ValidationError('Familia no encontrada');
    }

    // Obtener el contrato de la familia
    const contractId = family.contractId;

    // Validar que exista el contrato
    const contract = await this.contractRepository.findById(contractId);
    if (!contract) {
      throw new ValidationError('Contrato asociado a la familia no encontrado');
    }

    // Validar colaboradores
    if (!request.colaboratorIds || request.colaboratorIds.length === 0) {
      throw new ValidationError('Debe proporcionar al menos un colaborador');
    }

    // Obtener todos los modelos de documento de la familia
    const models = await this.documentModelRepository.findByFamilyId(request.familyId);
    if (models.length === 0) {
      throw new ValidationError('La familia no tiene modelos de documento asociados');
    }

    const created: Document[] = [];
    const skipped: string[] = [];

    // Para cada colaborador, crear un documento por cada modelo
    for (const colaboratorId of request.colaboratorIds) {
      const colaborator = await this.colaboratorRepository.findById(colaboratorId);
      if (!colaborator) {
        skipped.push(colaboratorId);
        continue;
      }

      for (const model of models) {
        // Crear el documento
        const typeName = model.documentTypeName || model.documentTypeId;
        const subtypeName = model.documentSubtypeName || model.documentSubtypeId;
        const docName = `${typeName} - ${subtypeName}`;

        // Verificar si ya existe un documento con esta combinación
        const exists = await this.documentRepository.existsByModelContractColaborator(
          model.id,
          contractId,
          [colaboratorId],
          docName,
        );

        if (exists) {
          skipped.push(`${colaboratorId}-${model.id}`);
          continue;
        }

        const props: DocumentProps = {
          documentModelId: model.id,
          colaboratorIds: [colaboratorId],
          name: docName,
          contractId: contractId,
          createdBy: request.createdBy,
          groupId: colaborator.groupId,

          // Read-only props
          requiredForContract: model.requiredForContract,
          requiredForColaborator: model.requiredForColaborator,
          requiredExpirationDate: model.requiredExpirationDate,
        };

        const doc = Document.create(props);
        const saved = await this.documentRepository.save(doc);
        created.push(saved);

        // Crear historial si es necesario
        if (request.createdBy && request.createdBy !== 'system' && saved.issuedDate) {
          const history: DocumentHistoryProps = {
            documentId: saved.id,
            documentModelId: saved.documentModelId,
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
    }

    return { created, skipped };
  }
}
