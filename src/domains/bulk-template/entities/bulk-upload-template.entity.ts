import { BulkTemplateType } from '../value-objects/bulk-template-type';

export interface BulkUploadTemplateJson {
  id: string;
  type: BulkTemplateType;
  fileId: string;
  uploadedBy: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class BulkUploadTemplate {
  public readonly id!: string;
  public readonly type!: BulkTemplateType;
  public readonly fileId!: string;
  public readonly uploadedBy!: string;
  public readonly isActive!: boolean;
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;

  constructor(props: Omit<BulkUploadTemplateJson, 'id'> & { id?: string }) {
    Object.assign(this, props);
  }

  toJSON(): BulkUploadTemplateJson {
    return {
      id: this.id,
      type: this.type,
      fileId: this.fileId,
      uploadedBy: this.uploadedBy,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
