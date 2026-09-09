import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { SignatureFlowEntity } from './signature-flow.entity';
import { SignatureFlowParticipantEntity } from './signature-flow-participant.entity';
import { EmailJobEntity } from './email-job.entity';
import { UserEntity } from './user.entity';
import { EnumColumn } from './utils/decorators';
import { SignatureFlowNotificationType } from '@domains/signature-flow/value-objects/signature-flow-enums';

@Entity('signature_flow_notifications')
@Index('IDX_signature_flow_notifications_participant_id', ['participantId'])
@Index('IDX_signature_flow_notifications_flow_id', ['flowId'])
export class SignatureFlowNotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'participant_id', type: 'varchar', length: 36 })
  participantId!: string;

  @ManyToOne(() => SignatureFlowParticipantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participant_id' })
  participant!: SignatureFlowParticipantEntity;

  @Column({ name: 'flow_id', type: 'varchar', length: 36 })
  flowId!: string;

  @ManyToOne(() => SignatureFlowEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'flow_id' })
  flow!: SignatureFlowEntity;

  @Column({ name: 'email_job_id', type: 'varchar', length: 36, nullable: true })
  emailJobId?: string;

  @ManyToOne(() => EmailJobEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'email_job_id' })
  emailJob?: EmailJobEntity;

  @EnumColumn({
    name: 'type',
    enum: Object.values(SignatureFlowNotificationType),
    default: SignatureFlowNotificationType.INITIAL,
  })
  type!: string;

  @Column({ name: 'triggered_by', type: 'varchar', length: 36, nullable: true })
  triggeredBy?: string;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'triggered_by' })
  triggeredByUser?: UserEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
