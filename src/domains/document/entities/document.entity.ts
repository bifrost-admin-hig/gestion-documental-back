import { EntityUtils } from '@shared/utils/common';
import { ValidationError } from '@shared/domain/errors';
import { DateTimeUtils, DateUtils } from '@shared/utils/date';
import { parseEnum } from '@shared/utils/objects';
import { DocumentStatus } from '../value-objects/document-enums';
import { SignatureStatus } from '@domains/signature/value-objects/signature-enums';

export interface DocumentFieldValue {
  fieldName: string;
  fieldValue: string | null;
}

export interface DocumentProps {
  id?: string;
  documentModelId: string;
  colaboratorIds?: string[];
  name: string;
  issuedDate?: Date;
  expirationDate?: Date | null;
  contractId?: string | null;
  contractNumber?: string;
  contractProjectName?: string;
  description?: string;
  documentUrl?: string;
  status?: string;
  signatureStatus?: string | null;
  preFlowStatus?: string | null;
  signatureFlowId?: string | null;
  previousVersionId?: string | null;
  isSuperseded?: boolean;
  code?: string | null;
  reviewDate?: Date | null;
  responsibleColaboratorId?: string | null;
  responsibleColaboratorName?: string | null;
  areaId?: string | null;
  areaName?: string | null;
  groupId: number;
  requiredColaboratorsCount?: number;
  createdBy?: string;
  comment?: string | null;
  deletedAt?: Date | null;
  deletedBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  templateId?: string | null;
  fieldValues?: DocumentFieldValue[];

  // Read-only properties from DocumentModel (for display)
  familyId?: string;
  familyName?: string;
  documentTypeId?: string;
  documentSubtypeId?: string;
  documentTypeName?: string;
  documentSubtypeName?: string;
  requiredForContract?: boolean;
  requiredForColaborator?: boolean;
  requiredExpirationDate?: boolean;
}

export class Document {
  id: string;
  documentModelId: string;
  colaboratorIds: string[];
  name: string;
  issuedDate: Date | null;
  expirationDate: Date | null;
  contractId: string | null;
  contractNumber?: string;
  contractProjectName?: string;
  description?: string;
  documentUrl?: string;
  status: DocumentStatus;
  signatureStatus: SignatureStatus | null;
  preFlowStatus: DocumentStatus | null;
  signatureFlowId: string | null;
  previousVersionId: string | null;
  isSuperseded: boolean;
  code: string | null;
  reviewDate: Date | null;
  responsibleColaboratorId: string | null;
  responsibleColaboratorName?: string | null;
  areaId: string | null;
  areaName?: string | null;
  groupId: number;
  requiredColaboratorsCount: number;
  createdBy: string | null;
  comment: string | null;
  deletedAt: Date | null;
  deletedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  templateId: string | null;
  fieldValues: DocumentFieldValue[];

  // Read-only properties
  familyId?: string;
  familyName?: string;
  documentTypeId?: string;
  documentSubtypeId?: string;
  documentTypeName?: string;
  documentSubtypeName?: string;
  requiredForContract?: boolean;
  requiredForColaborator?: boolean;
  requiredExpirationDate?: boolean;

  constructor(props: DocumentProps) {
    Document.validateRequired(props);
    Document.validateDates(props.issuedDate, props.expirationDate || undefined);

    EntityUtils.assign(this as Document, props, {
      id: 'uuid',
      issuedDate: 'dateNullable',
      expirationDate: 'dateNullable',
      contractId: (contractId?: string | null) => contractId || null,
      status: (status?: string) => parseEnum(status, DocumentStatus) ?? DocumentStatus.DRAFT,
      signatureStatus: (ss?: string | null) => parseEnum(ss, SignatureStatus) ?? null,
      preFlowStatus: (v?: string | null) => parseEnum(v, DocumentStatus) ?? null,
      signatureFlowId: (v?: string | null) => v || null,
      previousVersionId: (v?: string | null) => v || null,
      isSuperseded: (v?: boolean) => v ?? false,
      code: (v?: string | null) => (v ? v.trim() : null),
      reviewDate: 'dateNullable',
      responsibleColaboratorId: (v?: string | null) => v || null,
      areaId: (v?: string | null) => v || null,
      requiredColaboratorsCount: (value?: number) => value ?? 0,
      createdBy: (createdBy?: string) => createdBy || null,
      comment: (comment?: string | null) => comment || null,
      deletedAt: 'dateNullable',
      deletedBy: (deletedBy?: string | null) => deletedBy || null,
      createdAt: 'datetime',
      updatedAt: 'datetime',
      colaboratorIds: (ids?: string[]) => ids ?? [],
      templateId: (id?: string | null) => id || null,
      fieldValues: (vals?: DocumentFieldValue[]) => vals ?? [],
    });

    // Assign read-only props
    this.familyId = props.familyId;
    this.familyName = props.familyName;
    this.documentTypeId = props.documentTypeId;
    this.documentSubtypeId = props.documentSubtypeId;
    this.documentTypeName = props.documentTypeName;
    this.documentSubtypeName = props.documentSubtypeName;
    this.requiredForContract = props.requiredForContract;
    this.requiredForColaborator = props.requiredForColaborator;
    this.requiredExpirationDate = props.requiredExpirationDate;
  }

  public static create(props: DocumentProps): Document {
    return new Document(props);
  }

  private static validateRequired(props: DocumentProps): void {
    // console.log('Validating props:', props);
    if (!props.documentModelId || props.documentModelId.trim().length === 0) {
      throw new ValidationError('El ID del modelo de documento es requerido');
    }

    // Los colaboradores son opcionales en la creación, se pueden asignar después
    if (props.colaboratorIds && props.colaboratorIds.some((id) => !id || id.trim().length === 0)) {
      throw new ValidationError('Los IDs de colaboradores no pueden estar vacíos');
    }

    if (!props.name || props.name.trim().length === 0) {
      throw new ValidationError('El nombre del documento es requerido');
    }

    if (props.name.trim().length < 2) {
      throw new ValidationError('El nombre del documento debe tener al menos 2 caracteres');
    }

    if (props.name.trim().length > 255) {
      throw new ValidationError('El nombre del documento no puede exceder 255 caracteres');
    }

    if (props.documentUrl && props.documentUrl.trim().length > 0) {
      if (!props.issuedDate) {
        throw new ValidationError('La fecha de emisión es requerida cuando se suministra el archivo');
      }
      if (props.requiredExpirationDate && !props.expirationDate) {
        throw new ValidationError('La fecha de expiración es requerida para este documento');
      }
    }

    if (props.description && props.description.trim().length > 1000) {
      throw new ValidationError('La descripción no puede exceder 1000 caracteres');
    }

    if (props.comment && props.comment.trim().length > 1000) {
      throw new ValidationError('El comentario no puede exceder 1000 caracteres');
    }

    if (!props.groupId) {
      throw new ValidationError('Group ID is required', 'groupId');
    }
  }

  private static validateDates(issuedDate?: Date | null, expirationDate?: Date | null): void {
    if (issuedDate && expirationDate && expirationDate <= issuedDate) {
      throw new ValidationError('La fecha de vencimiento debe ser posterior a la fecha de emisión');
    }
  }

  // Business methods
  public updateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new ValidationError('El nombre del documento es requerido');
    }

    if (name.trim().length < 2) {
      throw new ValidationError('El nombre del documento debe tener al menos 2 caracteres');
    }

    if (name.trim().length > 255) {
      throw new ValidationError('El nombre del documento no puede exceder 255 caracteres');
    }

    this.name = name.trim();
    this.updatedAt = new Date();
  }

  public updateDates(issuedDate?: Date | null, expirationDate?: Date | null, requiredExpirationDate?: boolean): void {
    const isRequired = requiredExpirationDate !== undefined ? requiredExpirationDate : this.requiredExpirationDate;

    Document.validateDates(issuedDate, expirationDate);

    if (this.documentUrl && this.documentUrl.trim().length > 0) {
      if (!issuedDate) {
        throw new ValidationError('La fecha de emisión es requerida cuando se suministra el archivo');
      }
      if (isRequired && !expirationDate) {
        throw new ValidationError('La fecha de expiración es requerida para este documento');
      }
    }

    this.issuedDate = issuedDate || null;
    this.expirationDate = expirationDate || null;
    this.updatedAt = new Date();
  }

  public updateDescription(description?: string): void {
    if (description && description.trim().length > 1000) {
      throw new ValidationError('La descripción no puede exceder 1000 caracteres');
    }

    this.description = description?.trim();
    this.updatedAt = new Date();
  }

  public updateDocumentUrl(documentUrl?: string): void {
    this.documentUrl = documentUrl?.trim();
    this.updatedAt = new Date();
  }

  public updateDocumentModelId(documentModelId: string): void {
    if (!documentModelId || documentModelId.trim().length === 0) {
      throw new ValidationError('El ID del modelo de documento es requerido');
    }

    this.documentModelId = documentModelId;
    this.updatedAt = new Date();
  }

  public updateColaborators(colaboratorIds: string[]): void {
    if (colaboratorIds && colaboratorIds.some((id) => !id || id.trim().length === 0)) {
      throw new ValidationError('Los IDs de colaboradores no pueden estar vacíos');
    }

    this.colaboratorIds = colaboratorIds || [];
    this.updatedAt = new Date();
  }

  public updateContractId(contractId?: string | null): void {
    this.contractId = contractId || null;
    this.updatedAt = new Date();
  }

  public updateCode(code?: string | null): void {
    const trimmed = code?.trim();
    if (trimmed && trimmed.length > 100) {
      throw new ValidationError('El código del documento no puede exceder 100 caracteres');
    }
    this.code = trimmed || null;
    this.updatedAt = new Date();
  }

  public updateReviewDate(reviewDate?: Date | null): void {
    this.reviewDate = reviewDate || null;
    this.updatedAt = new Date();
  }

  public updateResponsibleColaboratorId(responsibleColaboratorId?: string | null): void {
    this.responsibleColaboratorId = responsibleColaboratorId || null;
    this.updatedAt = new Date();
  }

  public updateAreaId(areaId?: string | null): void {
    this.areaId = areaId || null;
    this.updatedAt = new Date();
  }

  /**
   * Calcula la fecha de próxima revisión por defecto cuando no se indica una manualmente:
   * 1. Por defecto, 30 días después de la fecha en que el documento se creó en la plataforma
   *    (no la fecha de emisión, que puede ser muy anterior a la carga del documento).
   * 2. Si esa fecha (creación + 30) cae en la fecha de vencimiento o después, no queda margen
   *    de revisión: se deja 10 días antes del vencimiento en su lugar.
   */
  public static calculateDefaultReviewDate(createdAt?: Date | null, expirationDate?: Date | null): Date | null {
    if (!createdAt) return null;

    const defaultReviewDate = DateUtils.addDays(createdAt, 30);

    if (expirationDate && !DateUtils.isBefore(defaultReviewDate, expirationDate)) {
      return DateUtils.addDays(expirationDate, -10);
    }

    return defaultReviewDate;
  }

  public updateStatus(status: DocumentStatus, comment?: string | null): void {
    this.status = status;
    this.comment = comment ? comment.trim() : null;
    this.updatedAt = new Date();
  }

  public updateComment(comment: string | null): void {
    if (comment && comment.trim().length > 1000) {
      throw new ValidationError('El comentario no puede exceder 1000 caracteres');
    }

    this.comment = comment ? comment.trim() : null;
    this.updatedAt = new Date();
  }

  public changeGroup(groupId: number): void {
    if (!groupId) throw new ValidationError('Group ID is required', 'groupId');
    this.groupId = groupId;
    this.updatedAt = new Date();
  }

  public updateRequiredColaboratorsCount(count: number): void {
    if (count < 0) {
      throw new ValidationError('La cantidad de colaboradores requeridos no puede ser negativa');
    }
    this.requiredColaboratorsCount = count;
    this.updatedAt = new Date();
  }

  public softDelete(deletedBy: string): void {
    this.deletedAt = new Date();
    this.deletedBy = deletedBy;
    this.updatedAt = new Date();
  }

  public restore(): void {
    this.deletedAt = null;
    this.deletedBy = null;
    this.updatedAt = new Date();
  }

  public get isExpired(): boolean {
    if (!this.expirationDate) return false;
    return DateUtils.isAfter(new Date(), this.expirationDate);
  }

  public get daysUntilExpiration(): number | null {
    if (!this.expirationDate) return null;
    return DateUtils.daysBetween(new Date(), this.expirationDate);
  }

  public sendToReview(): void {
    if (this.status !== DocumentStatus.DRAFT) {
      throw new ValidationError('Solo los documentos en borrador pueden enviarse a revisión');
    }
    this.status = DocumentStatus.IN_REVIEW;
    this.comment = null;
    this.updatedAt = new Date();
  }

  public approve(): void {
    if (this.status !== DocumentStatus.IN_REVIEW) {
      throw new ValidationError('Solo los documentos en revisión pueden aprobarse');
    }
    this.status = DocumentStatus.APPROVED;
    this.comment = null;
    this.updatedAt = new Date();
  }

  public approveDirectly(): void {
    if (this.status !== DocumentStatus.DRAFT && this.status !== DocumentStatus.IN_REVIEW) {
      throw new ValidationError('Solo los documentos en borrador o revisión pueden aprobarse directamente');
    }
    this.status = DocumentStatus.APPROVED;
    this.comment = null;
    this.updatedAt = new Date();
  }

  public reject(): void {
    if (this.status !== DocumentStatus.IN_REVIEW) {
      throw new ValidationError('Solo los documentos en revisión pueden rechazarse');
    }
    this.status = DocumentStatus.REJECTED;
    this.comment = null;
    this.updatedAt = new Date();
  }

  public rejectWithComments(comment: string): void {
    if (this.status !== DocumentStatus.IN_REVIEW) {
      throw new ValidationError('Solo los documentos en revisión pueden rechazarse');
    }
    this.status = DocumentStatus.REJECTED_WITH_COMMENTS;
    this.comment = comment;
    this.updatedAt = new Date();
  }

  public setToDraft(): void {
    this.status = DocumentStatus.DRAFT;
    this.comment = null;
    this.updatedAt = new Date();
  }

  public setToUploaded(): void {
    this.status = DocumentStatus.UPLOADED;
    this.comment = null;
    this.updatedAt = new Date();
  }

  public setPendingNotification(): void {
    this.status = DocumentStatus.PENDING_NOTIFICATION;
    this.comment = null;
    this.updatedAt = new Date();
  }

  public updateSignatureStatus(status: SignatureStatus | null): void {
    this.signatureStatus = status;
    this.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      documentModelId: this.documentModelId,
      colaboratorIds: this.colaboratorIds,
      name: this.name,
      issuedDate: DateUtils.toString(this.issuedDate, true),
      expirationDate: DateUtils.toString(this.expirationDate, true),
      contractId: this.contractId,
      contractNumber: this.contractNumber,
      contractProjectName: this.contractProjectName,
      description: this.description,
      documentUrl: this.documentUrl,
      status: this.status,
      signatureStatus: this.signatureStatus,
      code: this.code,
      reviewDate: DateUtils.toString(this.reviewDate, true),
      responsibleColaboratorId: this.responsibleColaboratorId,
      responsibleColaboratorName: this.responsibleColaboratorName,
      areaId: this.areaId,
      areaName: this.areaName,
      groupId: this.groupId,
      requiredColaboratorsCount: this.requiredColaboratorsCount,
      createdBy: this.createdBy,
      comment: this.comment,
      deletedAt: DateTimeUtils.toString(this.deletedAt, true),
      deletedBy: this.deletedBy,
      isExpired: this.isExpired,
      daysUntilExpiration: this.daysUntilExpiration,
      createdAt: DateTimeUtils.toString(this.createdAt),
      updatedAt: DateTimeUtils.toString(this.updatedAt),

      // Read-only properties
      familyId: this.familyId,
      familyName: this.familyName,
      documentTypeId: this.documentTypeId,
      documentSubtypeId: this.documentSubtypeId,
      documentTypeName: this.documentTypeName,
      documentSubtypeName: this.documentSubtypeName,
      requiredForContract: this.requiredForContract,
      requiredForColaborator: this.requiredForColaborator,
      requiredExpirationDate: this.requiredExpirationDate,
    };
  }
}
