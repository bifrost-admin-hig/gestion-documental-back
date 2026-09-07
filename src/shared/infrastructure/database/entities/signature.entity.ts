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
import { DocumentEntity } from './document.entity';
import { UserEntity } from './user.entity';

@Entity('signatures')
@Index('IDX_signatures_document_id', ['documentId'])
@Index('IDX_signatures_user_id', ['userId'])
@Index('IDX_signatures_status', ['status'])
export class SignatureEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'document_id', type: 'varchar', length: 36 })
  documentId!: string;

  @ManyToOne(() => DocumentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document!: DocumentEntity;

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ name: 'signature_type', type: 'varchar', length: 50, default: 'simple' })
  signatureType!: string;

  @Column({ name: 'signature_method', type: 'varchar', length: 50, default: 'email' })
  signatureMethod!: string;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status!: string;

  @Column({ name: 'token_hash', type: 'varchar', length: 255, nullable: true, unique: true })
  tokenHash?: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  @Column({ name: 'signer_timezone', type: 'varchar', length: 64, nullable: true })
  signerTimezone?: string;

  @Column({ name: 'signature_image_file_id', type: 'varchar', length: 36, nullable: true })
  signatureImageFileId?: string;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason?: string;

  @Column({ name: 'rejection_code', type: 'varchar', length: 50, nullable: true })
  rejectionCode?: string;

  @Column({ name: 'signed_at', type: 'timestamp', nullable: true })
  signedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
