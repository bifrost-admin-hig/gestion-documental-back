import { EntityUtils } from '@shared/utils/common';
import { ValidationError } from '@shared/domain/errors';

export type DocumentTemplateFieldType = 'text' | 'number' | 'date' | 'select' | 'textarea';

const VALID_FIELD_TYPES: DocumentTemplateFieldType[] = ['text', 'number', 'date', 'select', 'textarea'];

export class DocumentTemplateField {
  readonly id: string;
  readonly name: string;
  readonly label: string;
  readonly fieldType: DocumentTemplateFieldType;
  readonly required: boolean;
  readonly order: number;
  readonly options?: string[];

  constructor(props: {
    id: string;
    name: string;
    label: string;
    fieldType: DocumentTemplateFieldType;
    required: boolean;
    order: number;
    options?: string[];
  }) {
    this.id = props.id;
    this.name = props.name;
    this.label = props.label;
    this.fieldType = props.fieldType;
    this.required = props.required;
    this.order = props.order;
    this.options = props.options;
  }

  public static create(props: {
    id: string;
    name: string;
    label: string;
    fieldType: string;
    required: boolean;
    order: number;
    options?: string[];
  }): DocumentTemplateField {
    if (!props.id?.trim()) {
      throw new ValidationError('El id del campo es requerido');
    }
    if (!props.name?.trim()) {
      throw new ValidationError('El nombre del campo es requerido');
    }
    if (!props.label?.trim()) {
      throw new ValidationError('La etiqueta del campo es requerida');
    }
    if (!VALID_FIELD_TYPES.includes(props.fieldType as DocumentTemplateFieldType)) {
      throw new ValidationError(`Tipo de campo inválido: ${props.fieldType}`);
    }
    if (!Number.isInteger(props.order) || props.order < 0) {
      throw new ValidationError('El orden del campo debe ser un entero no negativo');
    }

    return new DocumentTemplateField({
      id: props.id,
      name: props.name,
      label: props.label,
      fieldType: props.fieldType as DocumentTemplateFieldType,
      required: props.required,
      order: props.order,
      options: props.options,
    });
  }
}

export interface DocumentTemplateProps {
  id?: string;
  code?: string;
  title: string;
  version?: number;
  documentDate: Date;
  description?: string;
  fileUrl?: string;
  groupId: number;
  fields?: DocumentTemplateField[];
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export class DocumentTemplate {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly version: number;
  readonly documentDate: Date;
  readonly description: string | null;
  readonly fileUrl: string | null;
  readonly groupId: number;
  readonly fields: DocumentTemplateField[];
  readonly createdBy: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;

  constructor(props: DocumentTemplateProps) {
    DocumentTemplate.validateRequired(props);

    EntityUtils.assign(this as DocumentTemplate, props, {
      id: 'uuid',
      version: (v?: number) => v ?? 1,
      documentDate: 'date',
      description: (v?: string) => v || null,
      fileUrl: (v?: string) => v || null,
      fields: (v?: DocumentTemplateField[]) => (v ?? []).map(f => DocumentTemplateField.create(f)),
      createdBy: (v?: string) => v || null,
      deletedAt: 'dateNullable',
      createdAt: 'datetime',
      updatedAt: 'datetime',
    });
  }

  public static create(props: DocumentTemplateProps): DocumentTemplate {
    return new DocumentTemplate(props);
  }

  private static validateRequired(props: DocumentTemplateProps): void {
    if (!props.title || props.title.trim().length === 0) {
      throw new ValidationError('El título de la plantilla es requerido');
    }
    if (props.title.trim().length < 2) {
      throw new ValidationError('El título debe tener al menos 2 caracteres');
    }
    if (!props.documentDate) {
      throw new ValidationError('La fecha del documento es requerida');
    }
    if (!props.groupId) {
      throw new ValidationError('El ID del grupo es requerido');
    }
  }

  public createNewVersion(props: Partial<DocumentTemplateProps>): DocumentTemplateProps {
    return {
      title: props.title ?? this.title,
      version: this.version + 1,
      documentDate: props.documentDate ?? this.documentDate,
      description: props.description ?? this.description ?? undefined,
      fileUrl: props.fileUrl ?? this.fileUrl ?? undefined,
      groupId: this.groupId,
      fields: props.fields ?? this.fields,
      createdBy: props.createdBy ?? this.createdBy ?? undefined,
      code: this.code,
    };
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      code: this.code,
      title: this.title,
      version: this.version,
      documentDate: this.documentDate,
      description: this.description,
      fileUrl: this.fileUrl,
      groupId: this.groupId,
      fields: this.fields,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
    };
  }
}
