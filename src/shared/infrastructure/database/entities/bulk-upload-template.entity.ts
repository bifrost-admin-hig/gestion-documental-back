import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { BulkUploadTemplate } from '@domains/bulk-template/entities/bulk-upload-template.entity';
import { BulkTemplateType } from '@domains/bulk-template/value-objects/bulk-template-type';

@Entity('bulk_upload_templates')
export class BulkUploadTemplateEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50 })
  type!: string;

  @Column({ name: 'file_id', type: 'varchar', length: 36 })
  fileId!: string;

  @Column({ name: 'uploaded_by', type: 'varchar', length: 36 })
  uploadedBy!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  static fromDomain(template: BulkUploadTemplate): BulkUploadTemplateEntity {
    const entity = new BulkUploadTemplateEntity();
    if (template.id) entity.id = template.id;
    entity.type = template.type;
    entity.fileId = template.fileId;
    entity.uploadedBy = template.uploadedBy;
    entity.isActive = template.isActive;
    return entity;
  }

  static toDomain(entity: BulkUploadTemplateEntity): BulkUploadTemplate {
    return new BulkUploadTemplate({
      id: entity.id,
      type: entity.type as BulkTemplateType,
      fileId: entity.fileId,
      uploadedBy: entity.uploadedBy,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
