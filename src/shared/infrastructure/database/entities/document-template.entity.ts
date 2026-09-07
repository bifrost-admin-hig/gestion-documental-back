import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { GroupEntity } from './group.entity';
import { UserEntity } from './user.entity';

@Entity('document_templates')
@Index('IDX_document_templates_code', ['code'])
@Index('IDX_document_templates_group_code_version', ['groupId', 'code', 'version'])
@Index('IDX_document_templates_group_id', ['groupId'])
@Index('IDX_document_templates_deleted_at', ['deletedAt'])
export class DocumentTemplateEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 20 })
  code!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'int', default: 1 })
  version!: number;

  @Column({ name: 'document_date', type: 'date' })
  documentDate!: Date;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'file_url', type: 'varchar', length: 500, nullable: true })
  fileUrl?: string;

  @Column({ name: 'group_id', type: 'int' })
  groupId!: number;

  @Column({ type: 'text', nullable: true, name: 'fields_json' })
  fieldsJson?: string;

  @Column({ name: 'created_by', type: 'varchar', length: 36, nullable: true })
  createdBy?: string;

  @ManyToOne(() => GroupEntity)
  @JoinColumn({ name: 'group_id' })
  group?: GroupEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  creator?: UserEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;
}
