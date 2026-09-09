import { EntityUtils } from '@shared/utils/common';
import { ValidationError } from '@shared/domain/errors';

export interface DocumentTypeProps {
  id?: string;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class DocumentType {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(props: DocumentTypeProps) {
    DocumentType.validateRequired(props);

    EntityUtils.assign(this as DocumentType, props, {
      id: 'uuid',
      createdAt: 'date',
      updatedAt: 'date',
    });
  }

  public static create(props: DocumentTypeProps): DocumentType {
    return new DocumentType(props);
  }

  private static validateRequired(props: DocumentTypeProps): void {
    if (!props.name || props.name.trim().length === 0) {
      throw new ValidationError('El nombre del tipo de documento es requerido');
    }

    if (props.name.trim().length < 2) {
      throw new ValidationError('El nombre del tipo de documento debe tener al menos 2 caracteres');
    }

    if (props.name.trim().length > 100) {
      throw new ValidationError('El nombre del tipo de documento no puede exceder 100 caracteres');
    }
  }

  public updateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new ValidationError('El nombre del tipo de documento es requerido');
    }

    if (name.trim().length < 2) {
      throw new ValidationError('El nombre del tipo de documento debe tener al menos 2 caracteres');
    }

    if (name.trim().length > 100) {
      throw new ValidationError('El nombre del tipo de documento no puede exceder 100 caracteres');
    }

    this.name = name.trim();
    this.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      name: this.name,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
