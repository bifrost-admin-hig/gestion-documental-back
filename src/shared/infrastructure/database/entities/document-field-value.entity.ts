import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { DocumentEntity } from './document.entity';

@Entity('document_field_values')
@Index('IDX_document_field_values_document_id', ['documentId'])
@Index('IDX_document_field_values_field_name', ['fieldName'])
@Index('IDX_document_field_values_document_field', ['documentId', 'fieldName'], { unique: true })
export class DocumentFieldValueEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'document_id', type: 'varchar', length: 36 })
  documentId!: string;

  @ManyToOne(() => DocumentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document!: DocumentEntity;

  @Column({ name: 'field_name', type: 'varchar', length: 100 })
  fieldName!: string;

  @Column({ name: 'field_value', type: 'text', nullable: true })
  fieldValue?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
