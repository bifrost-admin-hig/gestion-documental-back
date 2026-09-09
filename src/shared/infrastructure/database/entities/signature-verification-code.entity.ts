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

@Entity('signature_verification_codes')
@Index('IDX_signature_verification_codes_signature_id', ['signatureId'])
@Index('IDX_signature_verification_codes_expires_at', ['expiresAt'])
export class SignatureVerificationCodeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'signature_id', type: 'varchar', length: 36 })
  signatureId!: string;

  @ManyToOne(() => SignatureEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'signature_id' })
  signature!: SignatureEntity;

  @Column({ name: 'code_hash', type: 'varchar', length: 255 })
  codeHash!: string;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ name: 'max_attempts', type: 'int', default: 3 })
  maxAttempts!: number;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt!: Date;

  @Column({ name: 'used_at', type: 'timestamp', nullable: true })
  usedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
