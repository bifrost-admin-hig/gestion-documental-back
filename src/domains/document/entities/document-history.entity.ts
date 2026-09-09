import { EntityUtils } from '@shared/utils/common';
import { ValidationError } from '@shared/domain/errors';
import { DateTimeUtils, DateUtils } from '@shared/utils/date';
import { parseEnum } from '@shared/utils/objects';
import { DocumentStatus, DocumentAction } from '../value-objects/document-enums';

export interface DocumentHistoryProps {
  id?: string;
  documentId: string;
  documentModelId: string;
  name: string;
  issuedDate?: Date | null;
  expirationDate?: Date | null;
  contractId?: string | null;
  description?: string;
  documentUrl?: string;
  status?: string;
  comment?: string | null;
  action: string;
  updatedBy?: string;
  updatedByName?: string;
  updatedByLastName?: string;
  updatedAt?: Date;
  flowParticipantId?: string | null;
  actionComment?: string | null;
}

export class DocumentHistory {
  id: string;
  documentId: string;
  documentModelId: string;
  name: string;
  issuedDate: Date | null;
  expirationDate: Date | null;
  contractId: string | null;
  description?: string;
  documentUrl?: string;
  status: DocumentStatus;
  comment: string | null;
  action: DocumentAction;
  updatedBy: string;
  updatedByName?: string;
  updatedByLastName?: string;
  updatedAt: Date;
  flowParticipantId: string | null;
  actionComment: string | null;

  constructor(props: DocumentHistoryProps) {
    DocumentHistory.validateRequired(props);

    EntityUtils.assign(this as DocumentHistory, props, {
      id: 'uuid',
      issuedDate: 'dateNullable',
      expirationDate: 'dateNullable',
      contractId: (contractId?: string | null) => contractId || null,
      status: (status?: string) => parseEnum(status, DocumentStatus) ?? DocumentStatus.DRAFT,
      comment: (comment?: string | null) => comment || null,
      action: (action: string) => parseEnum(action, DocumentAction) ?? DocumentAction.CREATED,
      updatedAt: 'datetime',
      flowParticipantId: (v?: string | null) => v || null,
      actionComment: (v?: string | null) => v || null,
    });
  }

  public static create(props: DocumentHistoryProps): DocumentHistory {
    return new DocumentHistory(props);
  }

  private static validateRequired(props: DocumentHistoryProps): void {
    if (!props.documentId || props.documentId.trim().length === 0) {
      throw new ValidationError('El ID del documento es requerido');
    }

    if (!props.documentModelId || props.documentModelId.trim().length === 0) {
      throw new ValidationError('El ID del modelo de documento es requerido');
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

    // La fecha de emisión es opcional para documentos en DRAFT
    // Se valida en Document.validateRequired si documentUrl está presente

    if (!props.action || props.action.trim().length === 0) {
      throw new ValidationError('La acción es requerida');
    }

    // updatedBy optional (system changes)

    if (props.description && props.description.trim().length > 1000) {
      throw new ValidationError('La descripción no puede exceder 1000 caracteres');
    }

    if (props.comment && props.comment.trim().length > 1000) {
      throw new ValidationError('El comentario no puede exceder 1000 caracteres');
    }
  }

  public get isExpired(): boolean {
    if (!this.expirationDate) return false;
    return DateUtils.isAfter(new Date(), this.expirationDate);
  }

  public get daysUntilExpiration(): number | null {
    if (!this.expirationDate) return null;
    return DateUtils.daysBetween(new Date(), this.expirationDate);
  }

  public toJSON() {
    return {
      id: this.id,
      documentId: this.documentId,
      documentModelId: this.documentModelId,
      name: this.name,
      issuedDate: DateUtils.toString(this.issuedDate),
      expirationDate: DateUtils.toString(this.expirationDate),
      contractId: this.contractId,
      description: this.description,
      documentUrl: this.documentUrl,
      status: this.status,
      comment: this.comment,
      action: this.action,
      updatedBy: this.updatedBy,
      updatedByName: this.updatedByName,
      updatedByLastName: this.updatedByLastName,
      flowParticipantId: this.flowParticipantId,
      actionComment: this.actionComment,
      isExpired: this.isExpired,
      daysUntilExpiration: this.daysUntilExpiration,
      updatedAt: DateTimeUtils.toString(this.updatedAt),
    };
  }
}
