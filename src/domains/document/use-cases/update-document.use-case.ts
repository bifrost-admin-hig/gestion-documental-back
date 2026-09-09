import { DocumentRepository } from '../repositories/document.repository';
import { DocumentHistoryRepository } from '../repositories/document-history.repository';
import { DocumentFieldValueRepository } from '../repositories/document-field-value.repository';
import { Document, DocumentFieldValue } from '../entities/document.entity';
import { DocumentHistoryProps } from '../entities/document-history.entity';
import { DocumentAction, DocumentStatus } from '../value-objects/document-enums';
import { NotFoundError, ValidationError } from '@shared/domain/errors';
import { GroupRepository } from '@domains/group/repositories/group.repository';
import { IDocumentModelRepository } from '@domains/document-model/repositories/document-model.repository.interface';
import { ColaboratorRepository } from '@domains/colaborators/repositories/colaborator.repository';
import { ContractRepository } from '@domains/contract/repositories/contract.repository';
import { AreaRepository } from '@domains/area/repositories/area.repository';

export interface UpdateDocumentRequest {
  documentModelId?: string;
  colaboratorIds?: string[];
  name?: string;
  issuedDate?: Date;
  expirationDate?: Date;
  contractId?: string;
  description?: string;
  documentUrl?: string;
  groupId?: number;
  requiredColaboratorsCount?: number;
  updatedBy?: string;
  comment?: string;
  templateId?: string;
  fieldValues?: DocumentFieldValue[];
  code?: string | null;
  reviewDate?: Date | null;
  responsibleColaboratorId?: string | null;
  areaId?: string | null;
}

interface DocumentChangeDetail {
  field: string;
  label: string;
  before: string | null;
  after: string | null;
  beforeFileId?: string;
  afterFileId?: string;
}

export class UpdateDocumentUseCase {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly documentHistoryRepository: DocumentHistoryRepository,
    private readonly groupRepository: GroupRepository,
    private readonly documentModelRepository: IDocumentModelRepository,
    private readonly documentFieldValueRepository?: DocumentFieldValueRepository,
    private readonly colaboratorRepository?: ColaboratorRepository,
    private readonly contractRepository?: ContractRepository,
    private readonly areaRepository?: AreaRepository,
  ) {}

  public async execute(id: string, request: UpdateDocumentRequest): Promise<Document> {
    const document = await this.documentRepository.findById(id);
    if (!document) {
      throw new NotFoundError('Documento', id);
    }

    const previousStatus = document.status;
    const previousState = {
      name: document.name,
      documentModelId: document.documentModelId,
      issuedDate: document.issuedDate,
      expirationDate: document.expirationDate,
      contractId: document.contractId,
      description: document.description || null,
      documentUrl: document.documentUrl || null,
      groupId: document.groupId,
      requiredColaboratorsCount: document.requiredColaboratorsCount,
      colaboratorIds: [...document.colaboratorIds].sort(),
      templateId: document.templateId,
      createdBy: document.createdBy,
      previousVersionId: document.previousVersionId,
      code: document.code,
      reviewDate: document.reviewDate,
      responsibleColaboratorId: document.responsibleColaboratorId,
      areaId: document.areaId,
    };

    // Update fields
    if (request.name !== undefined) {
      document.updateName(request.name);
    }

    if (request.documentModelId !== undefined) {
      // Validate new model exists
      const model = await this.documentModelRepository.findById(request.documentModelId);
      if (!model) {
        throw new ValidationError('Document Model not found', 'documentModelId');
      }
      document.updateDocumentModelId(request.documentModelId);
    }

    if (request.colaboratorIds !== undefined) {
      document.updateColaborators(request.colaboratorIds);
    }

    // Load model to check validation rules (either new model or existing one)
    const currentModelId = request.documentModelId || document.documentModelId;
    const documentModel = await this.documentModelRepository.findById(currentModelId);
    if (!documentModel) {
      throw new ValidationError('Document Model not found for the document', 'documentModelId');
    }

    const datesChanging = request.issuedDate !== undefined || request.expirationDate !== undefined;
    if (datesChanging) {
      document.updateDates(
        request.issuedDate || document.issuedDate,
        request.expirationDate !== undefined ? request.expirationDate : (document.expirationDate || undefined),
        documentModel.requiredExpirationDate,
      );
    }

    // Identificación única y metadatos obligatorios
    if (request.code !== undefined) {
      const code = request.code?.trim() || null;
      if (code) {
        const codeExists = await this.documentRepository.existsByCode(code, document.groupId, document.id);
        if (codeExists) {
          throw new ValidationError('Ya existe un documento con ese código en este grupo', 'code');
        }
      }
      document.updateCode(code);
    }

    if (request.responsibleColaboratorId !== undefined) {
      if (request.responsibleColaboratorId && this.colaboratorRepository) {
        const responsible = await this.colaboratorRepository.findById(request.responsibleColaboratorId);
        if (!responsible) {
          throw new ValidationError('El colaborador responsable indicado no existe', 'responsibleColaboratorId');
        }
      }
      document.updateResponsibleColaboratorId(request.responsibleColaboratorId);
    }

    if (request.areaId !== undefined) {
      if (request.areaId && this.areaRepository) {
        const area = await this.areaRepository.findById(request.areaId);
        if (!area) {
          throw new ValidationError('El área indicada no existe', 'areaId');
        }
      }
      document.updateAreaId(request.areaId);
    }

    // Fecha de próxima revisión: si se indica explícitamente (incluyendo null, para
    // limpiarla y que vuelva a calcularse), se respeta; si no, solo se recalcula
    // automáticamente cuando cambia el vencimiento (la fecha de creación, que es la
    // otra variable de la fórmula, no cambia una vez creado el documento).
    if (request.reviewDate !== undefined) {
      document.updateReviewDate(
        request.reviewDate ?? Document.calculateDefaultReviewDate(document.createdAt, document.expirationDate),
      );
    } else if (request.expirationDate !== undefined) {
      document.updateReviewDate(Document.calculateDefaultReviewDate(document.createdAt, document.expirationDate));
    }

    if (request.description !== undefined) {
      document.updateDescription(request.description);
    }

    if (request.documentUrl !== undefined) {
      // Keep old file available for history preview when replacing it.
      document.updateDocumentUrl(request.documentUrl);
    }

    if (request.contractId !== undefined) {
      document.updateContractId(request.contractId);
    }

    // Update group if provided
    if (request.groupId !== undefined && request.groupId !== document.groupId) {
      const group = await this.groupRepository.findById(request.groupId);
      if (!group) {
        throw new ValidationError('Group not found', 'groupId');
      }
      document.changeGroup(request.groupId);
    }

    // Update required colaborators count if provided
    if (request.requiredColaboratorsCount !== undefined) {
      document.updateRequiredColaboratorsCount(request.requiredColaboratorsCount);
    }

    // Verificar que no haya documentos duplicados
    const finalDocumentModelId = document.documentModelId;
    const finalContractId = document.contractId;
    const finalColaboratorIds = document.colaboratorIds;

    if (finalColaboratorIds && finalColaboratorIds.length > 0) {
      let exists = false;
      if (finalContractId) {
        exists = await this.documentRepository.existsByModelContractColaborator(
          finalDocumentModelId,
          finalContractId,
          finalColaboratorIds,
          document.name,
          document.id,
        );
      } else {
        exists = await this.documentRepository.existsByModelAndColaborator(
          finalDocumentModelId,
          finalColaboratorIds,
          document.name,
          document.id,
        );
      }

      if (exists) {
        throw new ValidationError(`Ya existe un documento con el mismo nombre, modelo y colaboradores${finalContractId ? ' en este contrato' : ''}.`);
      }
    }

    // Al editar un documento, vuelve a borrador (o a "cargado" si el modelo no requiere aprobación).
    // Si venía de un estado rechazado por flujo de firma y se cambia el archivo,
    // se desvincula el flujo anterior para permitir iniciar uno nuevo.
    const wasRejectedByFlow = previousStatus === DocumentStatus.REJECTED
      || previousStatus === DocumentStatus.REJECTED_WITH_COMMENTS
      || previousStatus === DocumentStatus.REJECTED_FOR_SIGN;
    const fileWillChange = request.documentUrl !== undefined
      && (request.documentUrl || null) !== previousState.documentUrl;

    if (wasRejectedByFlow && fileWillChange) {
      document.signatureFlowId = null;
    }

    if (documentModel.requiresApproval === false) {
      document.setToUploaded();
    } else {
      document.setToDraft();
    }

    // Control de documentos obsoletos: al reemplazar el archivo de un documento que ya
    // tenía uno cargado, la versión anterior se archiva automáticamente (nunca se elimina)
    // con estado "obsolete" y queda enlazada mediante previousVersionId. Esa versión
    // archivada no puede volver a circular: no aparece en los listados por defecto ni
    // puede usarse para iniciar un flujo de firma (ver ALLOWED_START_STATUSES).
    let archivedVersion: Document | null = null;
    const shouldArchivePreviousVersion = fileWillChange
      && !!previousState.documentUrl
      && !!previousState.issuedDate;

    if (shouldArchivePreviousVersion) {
      archivedVersion = await this.documentRepository.save(Document.create({
        documentModelId: previousState.documentModelId,
        colaboratorIds: [...previousState.colaboratorIds],
        name: previousState.name,
        issuedDate: previousState.issuedDate ?? undefined,
        expirationDate: previousState.expirationDate,
        contractId: previousState.contractId,
        description: previousState.description ?? undefined,
        documentUrl: previousState.documentUrl ?? undefined,
        status: DocumentStatus.OBSOLETE,
        isSuperseded: true,
        previousVersionId: previousState.previousVersionId,
        groupId: previousState.groupId,
        requiredColaboratorsCount: previousState.requiredColaboratorsCount,
        createdBy: previousState.createdBy ?? undefined,
        comment: 'Versión reemplazada automáticamente al subir un nuevo archivo.',
        templateId: previousState.templateId ?? undefined,
      }));

      // Preservar los valores de campos de plantilla de la versión archivada, si los tenía.
      if (this.documentFieldValueRepository) {
        try {
          const previousFieldValues = await this.documentFieldValueRepository.findByDocumentId(document.id);
          if (previousFieldValues.length > 0) {
            await this.documentFieldValueRepository.saveMany(archivedVersion.id, previousFieldValues);
          }
        } catch {
          // La copia de campos históricos no debe bloquear la actualización del documento.
        }
      }

      document.previousVersionId = archivedVersion.id;
    }

    // Actualizar documento
    const updatedDocument = await this.documentRepository.update(document);

    // Actualizar valores de campos de plantilla si se proporcionaron
    if (this.documentFieldValueRepository && request.fieldValues !== undefined) {
      await this.documentFieldValueRepository.deleteByDocumentId(updatedDocument.id);
      if (request.fieldValues.length > 0) {
        await this.documentFieldValueRepository.saveMany(updatedDocument.id, request.fieldValues);
      }
    }

    // Crear entrada de historial
    const changeDetails: DocumentChangeDetail[] = [];

    const pushChange = (field: string, label: string, before: string | null, after: string | null) => {
      if (before === after) return;
      changeDetails.push({ field, label, before, after });
    };

    const formatDate = (date?: Date | null): string | null => (date ? date.toISOString().slice(0, 10) : null);

    // Resolve model names for human-readable history
    const resolveModelName = async (id: string | null): Promise<string | null> => {
      if (!id) return null;
      try {
        const model = await this.documentModelRepository.findById(id);
        if (!model) return id;
        return [model.documentTypeName, model.documentSubtypeName].filter(Boolean).join(' / ') || id;
      } catch { return id; }
    };

    const resolveGroupName = async (id: number | null): Promise<string | null> => {
      if (!id) return null;
      try {
        const group = await this.groupRepository.findById(id);
        return (group as { name?: string })?.name ?? String(id);
      } catch { return String(id); }
    };

    const resolveColaboratorNames = async (ids: string[]): Promise<string | null> => {
      if (!ids.length) return null;
      if (!this.colaboratorRepository) return ids.join(', ');
      try {
        const colabs = await this.colaboratorRepository.findIn(ids);
        const nameMap = new Map(colabs.map((c) => [c.id, c.getNombreCompleto()]));
        return ids.map((id) => nameMap.get(id) ?? id).join(', ');
      } catch { return ids.join(', '); }
    };

    const resolveContractLabel = async (id: string | null): Promise<string | null> => {
      if (!id) return null;
      if (!this.contractRepository) return id;
      try {
        const contract = await this.contractRepository.findById(id);
        return contract ? `${contract.contractNumber}${contract.nombreProyecto ? ` — ${contract.nombreProyecto}` : ''}` : id;
      } catch { return id; }
    };

    const resolveResponsibleLabel = async (id: string | null): Promise<string | null> => {
      if (!id) return null;
      if (!this.colaboratorRepository) return id;
      try {
        const colaborator = await this.colaboratorRepository.findById(id);
        return colaborator ? colaborator.getNombreCompleto() : id;
      } catch { return id; }
    };

    const resolveAreaLabel = async (id: string | null): Promise<string | null> => {
      if (!id) return null;
      if (!this.areaRepository) return id;
      try {
        const area = await this.areaRepository.findById(id);
        return area?.name ?? id;
      } catch { return id; }
    };

    const [prevModelName, currModelName] = await Promise.all([
      resolveModelName(previousState.documentModelId),
      resolveModelName(updatedDocument.documentModelId),
    ]);
    const [prevGroupName, currGroupName] = await Promise.all([
      resolveGroupName(previousState.groupId),
      resolveGroupName(updatedDocument.groupId),
    ]);
    const [prevColabNames, currColabNames] = await Promise.all([
      resolveColaboratorNames(previousState.colaboratorIds),
      resolveColaboratorNames([...updatedDocument.colaboratorIds].sort()),
    ]);
    const [prevContractLabel, currContractLabel] = await Promise.all([
      resolveContractLabel(previousState.contractId),
      resolveContractLabel(updatedDocument.contractId),
    ]);
    const [prevResponsibleLabel, currResponsibleLabel] = await Promise.all([
      resolveResponsibleLabel(previousState.responsibleColaboratorId),
      resolveResponsibleLabel(updatedDocument.responsibleColaboratorId),
    ]);
    const [prevAreaLabel, currAreaLabel] = await Promise.all([
      resolveAreaLabel(previousState.areaId),
      resolveAreaLabel(updatedDocument.areaId),
    ]);

    pushChange('name', 'Nombre', previousState.name, updatedDocument.name);
    pushChange('documentModelId', 'Modelo de documento', prevModelName, currModelName);
    pushChange('issuedDate', 'Fecha de emision', formatDate(previousState.issuedDate), formatDate(updatedDocument.issuedDate));
    pushChange('expirationDate', 'Fecha de vencimiento', formatDate(previousState.expirationDate), formatDate(updatedDocument.expirationDate));
    pushChange('contractId', 'Contrato', prevContractLabel, currContractLabel);
    pushChange('description', 'Descripcion', previousState.description, updatedDocument.description || null);
    pushChange('groupId', 'Grupo', prevGroupName, currGroupName);
    pushChange(
      'requiredColaboratorsCount',
      'Cantidad requerida de colaboradores',
      String(previousState.requiredColaboratorsCount),
      String(updatedDocument.requiredColaboratorsCount),
    );

    pushChange('colaboratorIds', 'Colaboradores', prevColabNames, currColabNames);
    pushChange('code', 'Código', previousState.code, updatedDocument.code);
    pushChange('reviewDate', 'Fecha de próxima revisión', formatDate(previousState.reviewDate), formatDate(updatedDocument.reviewDate));
    pushChange('responsibleColaboratorId', 'Responsable', prevResponsibleLabel, currResponsibleLabel);
    pushChange('areaId', 'Área', prevAreaLabel, currAreaLabel);

    if (previousState.documentUrl !== (updatedDocument.documentUrl || null)) {
      changeDetails.push({
        field: 'documentUrl',
        label: 'Archivo',
        before: previousState.documentUrl ? 'Archivo anterior' : null,
        after: updatedDocument.documentUrl ? 'Archivo reemplazado' : null,
        beforeFileId: previousState.documentUrl || undefined,
        afterFileId: updatedDocument.documentUrl || undefined,
      });
    }

    const fileChanged = previousState.documentUrl !== (updatedDocument.documentUrl || null);
    const historyAction = fileChanged
      ? DocumentAction.VERSION_SUPERSEDED
      : DocumentAction.UPDATED;

    const actionCommentPayload: { changes?: DocumentChangeDetail[]; archivedVersionId?: string } = {};
    if (changeDetails.length > 0) actionCommentPayload.changes = changeDetails;
    if (archivedVersion) actionCommentPayload.archivedVersionId = archivedVersion.id;

    const historyProps: DocumentHistoryProps = {
      documentId: updatedDocument.id,
      documentModelId: updatedDocument.documentModelId || document.documentModelId,
      name: updatedDocument.name,
      issuedDate: updatedDocument.issuedDate,
      expirationDate: updatedDocument.expirationDate,
      contractId: updatedDocument.contractId,
      description: updatedDocument.description,
      documentUrl: updatedDocument.documentUrl,
      status: updatedDocument.status,
      comment: request.comment || null,
      actionComment: Object.keys(actionCommentPayload).length > 0 ? JSON.stringify(actionCommentPayload) : null,
      action: historyAction,
      updatedBy: request.updatedBy || 'system',
    };

    await this.documentHistoryRepository.save(historyProps).catch(() => {});

    // Historial propio de la versión archivada: queda registrado con qué documento la reemplazó.
    if (archivedVersion) {
      const archivedHistoryProps: DocumentHistoryProps = {
        documentId: archivedVersion.id,
        documentModelId: archivedVersion.documentModelId,
        name: archivedVersion.name,
        issuedDate: archivedVersion.issuedDate,
        expirationDate: archivedVersion.expirationDate,
        contractId: archivedVersion.contractId,
        description: archivedVersion.description,
        documentUrl: archivedVersion.documentUrl,
        status: archivedVersion.status,
        comment: 'Versión reemplazada por un archivo nuevo.',
        actionComment: JSON.stringify({ supersededByDocumentId: updatedDocument.id }),
        action: DocumentAction.ARCHIVED,
        updatedBy: request.updatedBy || 'system',
      };
      await this.documentHistoryRepository.save(archivedHistoryProps).catch(() => {});
    }

    return updatedDocument;
  }
}

export class DeleteDocumentUseCase {
  constructor(private readonly documentRepository: DocumentRepository) {}

  public async execute(id: string): Promise<void> {
    const document = await this.documentRepository.findById(id);
    if (!document) {
      throw new NotFoundError('Documento', id);
    }

    await this.documentRepository.delete(id);
  }
}
