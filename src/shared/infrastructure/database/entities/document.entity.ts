import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
  Index,
  type Relation,
} from 'typeorm';
import { DocumentModelEntity } from './document-model.entity';
import { ColaboratorEntity } from './colaborators.entity';
import { ContractEntity } from './contract.entity';
import { UserEntity } from './user.entity';
import { DocumentTemplateEntity } from './document-template.entity';
import { SignatureFlowEntity } from './signature-flow.entity';
import { AreaEntity } from './area.entity';

@Entity('documents')
@Index('IDX_documents_status', ['status'])
@Index('IDX_documents_deleted_at', ['deletedAt'])
@Index('IDX_documents_group_id', ['groupId'])
@Index('IDX_documents_contract_id', ['contractId'])
@Index('IDX_documents_signature_flow_id', ['signatureFlowId'])
@Index('IDX_documents_is_superseded', ['isSuperseded'])
@Index('IDX_documents_group_id_code', ['groupId', 'code'], { unique: true })
export class DocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'document_model_id', type: 'varchar', length: 36 })
  documentModelId!: string;

  @ManyToOne(() => DocumentModelEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'document_model_id' })
  documentModel!: DocumentModelEntity;

  @Column({ name: 'contract_id', type: 'varchar', length: 36, nullable: true })
  contractId?: string;

  @ManyToOne(() => ContractEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'contract_id' })
  contract?: ContractEntity;

  @ManyToMany(() => ColaboratorEntity)
  @JoinTable({
    name: 'document_colaborators',
    joinColumn: { name: 'document_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'colaborator_id', referencedColumnName: 'id' },
  })
  colaborators!: ColaboratorEntity[];

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'issued_date', type: 'date', nullable: true })
  issuedDate?: Date;

  @Column({ name: 'expiration_date', type: 'date', nullable: true })
  expirationDate?: Date;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'document_url', type: 'varchar', length: 500, nullable: true })
  documentUrl?: string;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  status!: string;

  @Column({ name: 'signature_status', type: 'varchar', length: 50, nullable: true })
  signatureStatus?: string;

  @Column({ name: 'pre_flow_status', type: 'varchar', length: 50, nullable: true })
  preFlowStatus?: string | null;

  @Column({ name: 'signature_flow_id', type: 'varchar', length: 36, nullable: true })
  signatureFlowId?: string;

  @ManyToOne(() => SignatureFlowEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'signature_flow_id' })
  signatureFlow?: SignatureFlowEntity;

  @Column({ name: 'previous_version_id', type: 'varchar', length: 36, nullable: true })
  previousVersionId?: string;

  @Column({ name: 'is_superseded', type: 'boolean', default: false })
  isSuperseded!: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  code?: string;

  @Column({ name: 'review_date', type: 'date', nullable: true })
  reviewDate?: Date;

  @Column({ name: 'responsible_colaborator_id', type: 'varchar', length: 36, nullable: true })
  responsibleColaboratorId?: string;

  @ManyToOne(() => ColaboratorEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'responsible_colaborator_id' })
  responsibleColaborator?: Relation<ColaboratorEntity>;

  @Column({ name: 'area_id', type: 'varchar', length: 36, nullable: true })
  areaId?: string;

  @ManyToOne(() => AreaEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'area_id' })
  area?: AreaEntity;

  @Column({ name: 'group_id', type: 'integer' })
  groupId!: number;

  @Column({ name: 'required_colaborators_count', type: 'int', default: 0 })
  requiredColaboratorsCount!: number;

  @Column({ name: 'created_by', type: 'varchar', length: 36, nullable: true })
  createdBy?: string;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  creator?: UserEntity;

  @Column({ name: 'template_id', type: 'varchar', length: 36, nullable: true })
  templateId?: string;

  @ManyToOne(() => DocumentTemplateEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'template_id' })
  template?: DocumentTemplateEntity;

  @Column({ type: 'text', nullable: true })
  comment?: string;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  @Column({ name: 'deleted_by', type: 'varchar', length: 36, nullable: true })
  deletedBy?: string;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'deleted_by' })
  deleter?: UserEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
