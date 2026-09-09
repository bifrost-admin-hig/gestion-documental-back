import { EntityUtils } from '@shared/utils/common';
import { ValidationError } from '@shared/domain/errors';

export interface DocumentSubtypeProps {
  id?: string;
  name: string;
  documentTypeId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class DocumentSubtype {
  id: string;
  name: string;
  documentTypeId: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(props: DocumentSubtypeProps) {
    DocumentSubtype.validateRequired(props);

    EntityUtils.assign(this as DocumentSubtype, props, {
      id: 'uuid',
      createdAt: 'date',
      updatedAt: 'date',
    });
  }

  public static create(props: DocumentSubtypeProps): DocumentSubtype {
    return new DocumentSubtype(props);
  }

  private static validateRequired(props: DocumentSubtypeProps): void {
    if (!props.name || props.name.trim().length === 0) {
      throw new ValidationError('El nombre del subtipo de documento es requerido');
    }

    if (props.name.trim().length < 2) {
      throw new ValidationError('El nombre del subtipo de documento debe tener al menos 2 caracteres');
    }

    if (props.name.trim().length > 100) {
      throw new ValidationError('El nombre del subtipo de documento no puede exceder 100 caracteres');
    }

    if (!props.documentTypeId || props.documentTypeId.trim().length === 0) {
      throw new ValidationError('El ID del tipo de documento es requerido');
    }
  }

  public updateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new ValidationError('El nombre del subtipo de documento es requerido');
    }

    if (name.trim().length < 2) {
      throw new ValidationError('El nombre del subtipo de documento debe tener al menos 2 caracteres');
    }

    if (name.trim().length > 100) {
      throw new ValidationError('El nombre del subtipo de documento no puede exceder 100 caracteres');
    }

    this.name = name.trim();
    this.updatedAt = new Date();
  }

  public updateDocumentTypeId(documentTypeId: string): void {
    if (!documentTypeId || documentTypeId.trim().length === 0) {
      throw new ValidationError('El ID del tipo de documento es requerido');
    }

    this.documentTypeId = documentTypeId;
    this.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      name: this.name,
      documentTypeId: this.documentTypeId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
