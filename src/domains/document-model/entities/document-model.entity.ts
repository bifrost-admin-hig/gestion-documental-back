import { EntityUtils } from '@shared/utils/common';
import { ValidationError } from '@shared/domain/errors';

export interface DocumentModelProps {
  id?: string;
  groupId: number;
  familyId: string;
  documentTypeId: string;
  documentSubtypeId: string;
  requiredForContract?: boolean;
  requiredForColaborator?: boolean;
  requiredExpirationDate?: boolean;
  requiresApproval?: boolean;
  requiresSignature?: boolean;
  familyName?: string;
  documentTypeName?: string;
  documentSubtypeName?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export class DocumentModel {
  id: string;
  groupId: number;
  familyId: string;
  documentTypeId: string;
  documentSubtypeId: string;
  requiredForContract: boolean;
  requiredForColaborator: boolean;
  requiredExpirationDate: boolean;
  requiresApproval: boolean;
  requiresSignature: boolean;
  familyName?: string;
  documentTypeName?: string;
  documentSubtypeName?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  constructor(props: DocumentModelProps) {
    DocumentModel.validateRequired(props);

    EntityUtils.assign(this as DocumentModel, props, {
      id: 'uuid',
      groupId: (value: number) => value,
      requiredForContract: (value?: boolean) => value ?? false,
      requiredForColaborator: (value?: boolean) => value ?? false,
      requiredExpirationDate: (value?: boolean) => value ?? false,
      requiresApproval: (value?: boolean) => value ?? true,
      requiresSignature: (value?: boolean) => value ?? false,
      createdAt: 'date',
      updatedAt: 'date',
      deletedAt: 'dateNullable',
    });
  }

  public static create(props: DocumentModelProps): DocumentModel {
    return new DocumentModel(props);
  }

  private static validateRequired(props: DocumentModelProps): void {
    if (!props.groupId) {
      throw new ValidationError('El ID del grupo es requerido');
    }

    if (!props.familyId || props.familyId.trim().length === 0) {
      throw new ValidationError('El ID de la familia es requerido');
    }

    if (!props.documentTypeId || props.documentTypeId.trim().length === 0) {
      throw new ValidationError('El ID del tipo de documento es requerido');
    }

    if (!props.documentSubtypeId || props.documentSubtypeId.trim().length === 0) {
      throw new ValidationError('El ID del subtipo de documento es requerido');
    }
  }

  public update(props: {
    groupId?: number;
    documentTypeId?: string;
    documentSubtypeId?: string;
    requiredForContract?: boolean;
    requiredForColaborator?: boolean;
    requiredExpirationDate?: boolean;
    requiresApproval?: boolean;
    requiresSignature?: boolean;
  }): void {
    if (props.groupId !== undefined) {
      if (!props.groupId) {
        throw new ValidationError('El ID del grupo es requerido');
      }
      this.groupId = props.groupId;
    }

    if (props.documentTypeId !== undefined) {
      if (!props.documentTypeId || props.documentTypeId.trim().length === 0) {
        throw new ValidationError('El ID del tipo de documento es requerido');
      }
      this.documentTypeId = props.documentTypeId;
    }

    if (props.documentSubtypeId !== undefined) {
      if (!props.documentSubtypeId || props.documentSubtypeId.trim().length === 0) {
        throw new ValidationError('El ID del subtipo de documento es requerido');
      }
      this.documentSubtypeId = props.documentSubtypeId;
    }

    if (props.requiredForContract !== undefined) {
      this.requiredForContract = props.requiredForContract;
    }

    if (props.requiredForColaborator !== undefined) {
      this.requiredForColaborator = props.requiredForColaborator;
    }

    if (props.requiredExpirationDate !== undefined) {
      this.requiredExpirationDate = props.requiredExpirationDate;
    }

    if (props.requiresApproval !== undefined) {
      this.requiresApproval = props.requiresApproval;
    }

    if (props.requiresSignature !== undefined) {
      this.requiresSignature = props.requiresSignature;
    }

    this.updatedAt = new Date();
  }

  public toJSON(): any {
    return {
      id: this.id,
      groupId: this.groupId,
      familyId: this.familyId,
      documentTypeId: this.documentTypeId,
      documentSubtypeId: this.documentSubtypeId,
      requiredForContract: this.requiredForContract,
      requiredForColaborator: this.requiredForColaborator,
      requiredExpirationDate: this.requiredExpirationDate,
      requiresApproval: this.requiresApproval,
      requiresSignature: this.requiresSignature,
      documentTypeName: this.documentTypeName,
      documentSubtypeName: this.documentSubtypeName,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
    };
  }
}
