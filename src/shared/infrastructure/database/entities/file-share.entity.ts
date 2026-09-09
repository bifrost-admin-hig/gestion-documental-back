import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FileShare } from '@domains/file-share/entities/file-share.entity';

@Entity('file_shares')
export class FileShareEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  token!: string;

  @Column({ name: 'file_id', type: 'varchar', length: 36 })
  fileId!: string;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt!: Date;

  @Column({ name: 'max_access', type: 'int', nullable: true })
  maxAccess!: number | null;

  @Column({ name: 'access_count', type: 'int', default: 0 })
  accessCount!: number;

  @Column({ name: 'created_by', type: 'varchar', length: 36 })
  createdBy!: string;

  @Column({ name: 'revoked_at', type: 'timestamp', nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  static fromDomain(fileShare: FileShare): FileShareEntity {
    const entity = new FileShareEntity();
    entity.id = fileShare.id;
    entity.token = fileShare.token;
    entity.fileId = fileShare.fileId;
    entity.expiresAt = fileShare.expiresAt;
    entity.maxAccess = fileShare.maxAccess;
    entity.accessCount = fileShare.accessCount;
    entity.createdBy = fileShare.createdBy;
    entity.revokedAt = fileShare.revokedAt;
    return entity;
  }

  static toDomain(entity: FileShareEntity): FileShare {
    return new FileShare({
      id: entity.id,
      token: entity.token,
      fileId: entity.fileId,
      expiresAt: entity.expiresAt,
      maxAccess: entity.maxAccess,
      accessCount: entity.accessCount,
      createdBy: entity.createdBy,
      revokedAt: entity.revokedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
