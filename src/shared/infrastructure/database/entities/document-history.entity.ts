import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ContractEntity } from './contract.entity';
import { DocumentEntity } from './document.entity';
import { DocumentModelEntity } from './document-model.entity';
import { UserEntity } from './user.entity';

@Entity('documents_history')
@Index('IDX_documents_history_document', ['documentId'])
@Index('IDX_documents_history_action', ['action'])
@Index('IDX_documents_history_updated_by', ['updatedBy'])
@Index('IDX_documents_history_status', ['status'])
@Index('IDX_documents_history_flow_participant_id', ['flowParticipantId'])
export class DocumentHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'document_id', type: 'varchar', length: 36 })
  documentId!: string;

  @ManyToOne(() => DocumentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document!: DocumentEntity;

  @Column({ name: 'document_model_id', type: 'varchar', length: 36 })
  documentModelId!: string;

  @ManyToOne(() => DocumentModelEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'document_model_id' })
  documentModel!: DocumentModelEntity;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'issued_date', type: 'date', nullable: true })
  issuedDate?: Date;

  @Column({ name: 'expiration_date', type: 'date', nullable: true })
  expirationDate?: Date;

  @Column({ name: 'contract_id', type: 'varchar', length: 36, nullable: true })
  contractId?: string;

  @ManyToOne(() => ContractEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'contract_id' })
  contract?: ContractEntity;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'document_url', type: 'varchar', length: 500, nullable: true })
  documentUrl?: string;

  @Column({ type: 'varchar', length: 50 })
  status!: string;

  @Column({ type: 'text', nullable: true })
  comment?: string;

  @Column({ type: 'varchar', length: 50 })
  action!: string;

  @Column({ name: 'updated_by', type: 'varchar', length: 36, nullable: true })
  updatedBy?: string;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updated_by' })
  updater?: UserEntity;

  @Column({ name: 'updated_by_name', type: 'varchar', length: 255, nullable: true })
  updatedByName?: string;

  @Column({ name: 'flow_participant_id', type: 'varchar', length: 36, nullable: true })
  flowParticipantId?: string;

  @Column({ name: 'action_comment', type: 'text', nullable: true })
  actionComment?: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
