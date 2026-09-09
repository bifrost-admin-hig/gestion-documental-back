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
import { ColaboratorEntity } from './colaborators.entity';
import { SignatureFlowEntity } from './signature-flow.entity';
import { EnumColumn } from './utils/decorators';
import {
  SignatureFlowParticipantRole,
  SignatureFlowParticipantStatus,
} from '@domains/signature-flow/value-objects/signature-flow-enums';

@Entity('signature_flow_participants')
@Index('IDX_signature_flow_participants_flow_id', ['flowId'])
@Index('IDX_signature_flow_participants_user_id', ['userId'])
@Index('IDX_signature_flow_participants_colaborator_id', ['colaboratorId'])
@Index('IDX_signature_flow_participants_status', ['status'])
export class SignatureFlowParticipantEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'flow_id', type: 'varchar', length: 36 })
  flowId!: string;

  @ManyToOne(() => SignatureFlowEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'flow_id' })
  flow!: SignatureFlowEntity;

  @Column({ name: 'user_id', type: 'varchar', length: 36, nullable: true })
  userId?: string;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @Column({ name: 'colaborator_id', type: 'varchar', length: 36, nullable: true })
  colaboratorId?: string;

  @ManyToOne(() => ColaboratorEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'colaborator_id' })
  colaborator?: ColaboratorEntity;

  @Column({ name: 'external_name', type: 'varchar', length: 255, nullable: true })
  externalName?: string;

  @Column({ name: 'external_email', type: 'varchar', length: 255, nullable: true })
  externalEmail?: string;

  @EnumColumn({
    name: 'role',
    enum: Object.values(SignatureFlowParticipantRole),
    default: SignatureFlowParticipantRole.SIGNER,
  })
  role!: string;

  @Column({ name: 'order', type: 'int', nullable: true })
  order?: number;

  @EnumColumn({
    name: 'status',
    enum: Object.values(SignatureFlowParticipantStatus),
    default: SignatureFlowParticipantStatus.PENDING,
  })
  status!: string;

  @Column({ name: 'action_at', type: 'timestamp', nullable: true })
  actionAt?: Date;

  @Column({ name: 'rejection_comment', type: 'text', nullable: true })
  rejectionComment?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
