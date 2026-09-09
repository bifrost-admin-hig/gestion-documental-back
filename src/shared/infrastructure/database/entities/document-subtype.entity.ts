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
import { DocumentTypeEntity } from './document-type.entity';

@Entity('document_subtypes')
@Index('IDX_document_subtypes_document_type', ['documentTypeId'])
export class DocumentSubtypeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ name: 'document_type_id', type: 'varchar', length: 36 })
  documentTypeId!: string;

  @ManyToOne(() => DocumentTypeEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_type_id' })
  documentType!: DocumentTypeEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
