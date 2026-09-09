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
import { UserEntity } from './user.entity';
import { EnumColumn } from './utils/decorators';
import { SignatureFlowOrderType, SignatureFlowStatus } from '@domains/signature-flow/value-objects/signature-flow-enums';

@Entity('signature_flows')
@Index('IDX_signature_flows_document_id', ['documentId'])
@Index('IDX_signature_flows_status', ['status'])
export class SignatureFlowEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'document_id', type: 'varchar', length: 36 })
  documentId!: string;

  @EnumColumn({
    name: 'order_type',
    enum: Object.values(SignatureFlowOrderType),
    default: SignatureFlowOrderType.SEQUENTIAL,
  })
  orderType!: string;

  @EnumColumn({
    name: 'signer_order_type',
    enum: Object.values(SignatureFlowOrderType),
    default: SignatureFlowOrderType.PARALLEL,
  })
  signerOrderType!: string;

  @EnumColumn({
    name: 'status',
    enum: Object.values(SignatureFlowStatus),
    default: SignatureFlowStatus.DRAFT,
  })
  status!: string;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt?: Date;

  @Column({ name: 'sent_by', type: 'varchar', length: 36, nullable: true })
  sentBy?: string;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sent_by' })
  sentByUser?: UserEntity;

  @Column({ name: 'reminder_enabled', type: 'boolean', default: false })
  reminderEnabled!: boolean;

  @Column({ name: 'reminder_interval_minutes', type: 'int', default: 1440 })
  reminderIntervalMinutes!: number;

  @Column({ name: 'auto_close_enabled', type: 'boolean', default: false })
  autoCloseEnabled!: boolean;

  @Column({ name: 'auto_close_interval_minutes', type: 'int', default: 43200 })
  autoCloseIntervalMinutes!: number;

  /** Si es false, los firmantes solo validan con OTP: no dibujan firma ni se estampa el recuadro en el PDF. */
  @Column({ name: 'require_signature_drawing', type: 'boolean', default: true })
  requireSignatureDrawing!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
