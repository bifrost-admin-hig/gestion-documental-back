import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { SignatureFlowParticipantEntity } from './signature-flow-participant.entity';

@Entity('signature_flow_external_tokens')
@Index('IDX_sfet_token', ['token'], { unique: true })
@Index('IDX_sfet_participant_id', ['participantId'], { unique: true })
export class ExternalParticipantTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'participant_id', type: 'varchar', length: 36 })
  participantId!: string;

  @ManyToOne(() => SignatureFlowParticipantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participant_id' })
  participant!: SignatureFlowParticipantEntity;

  @Column({ type: 'varchar', length: 64 })
  token!: string;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt!: Date;

  @Column({ name: 'otp_hash', type: 'varchar', length: 255, nullable: true })
  otpHash?: string;

  @Column({ name: 'otp_expires_at', type: 'timestamp', nullable: true })
  otpExpiresAt?: Date;

  @Column({ name: 'otp_attempts', type: 'int', default: 0 })
  otpAttempts!: number;

  @Column({ name: 'otp_method', type: 'varchar', length: 10, nullable: true })
  otpMethod?: string;

  @Column({ name: 'used_at', type: 'timestamp', nullable: true })
  usedAt?: Date;

  @Column({ name: 'signature_token_hash', type: 'varchar', length: 255, nullable: true })
  signatureTokenHash?: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 100, nullable: true })
  ipAddress?: string;

  @Column({ name: 'document_number', type: 'varchar', length: 50, nullable: true })
  documentNumber?: string;

  @Column({ name: 'timezone', type: 'varchar', length: 64, nullable: true })
  timezone?: string;

  @Column({ name: 'signature_image_file_id', type: 'varchar', length: 36, nullable: true })
  signatureImageFileId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
