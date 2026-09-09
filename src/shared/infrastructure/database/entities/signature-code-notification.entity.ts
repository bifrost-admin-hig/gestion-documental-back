import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { SignatureEntity } from './signature.entity';
import { SignatureFlowParticipantEntity } from './signature-flow-participant.entity';

@Entity('signature_code_notifications')
@Index('IDX_signature_code_notifications_signature_id', ['signatureId'])
@Index('IDX_signature_code_notifications_participant_id', ['participantId'])
export class SignatureCodeNotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'signature_id', type: 'varchar', length: 36, nullable: true })
  signatureId?: string;

  @ManyToOne(() => SignatureEntity, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'signature_id' })
  signature?: SignatureEntity;

  @Column({ name: 'participant_id', type: 'varchar', length: 36, nullable: true })
  participantId?: string;

  @ManyToOne(() => SignatureFlowParticipantEntity, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participant_id' })
  participant?: SignatureFlowParticipantEntity;

  @Column({ type: 'varchar', length: 10 })
  channel!: string;

  @Column({ type: 'varchar', length: 255 })
  recipient!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  subject?: string;

  @Column({ name: 'html_content', type: 'text', nullable: true })
  htmlContent?: string;

  @Column({ name: 'text_content', type: 'text', nullable: true })
  textContent?: string;

  @Column({ name: 'sent_at', type: 'timestamp' })
  sentAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
