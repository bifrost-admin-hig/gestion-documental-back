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
import { FileEntity } from './file.entity';

@Entity('user_signatures')
@Index('IDX_user_signatures_user_id', ['userId'], { unique: true })
@Index('IDX_user_signatures_colaborator_id', ['colaboratorId'], { unique: true })
export class UserSignatureEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'varchar', length: 36, nullable: true })
  userId?: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @Column({ name: 'colaborator_id', type: 'varchar', length: 36, nullable: true })
  colaboratorId?: string;

  @ManyToOne(() => ColaboratorEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'colaborator_id' })
  colaborator?: ColaboratorEntity;

  @Column({ name: 'file_id', type: 'varchar', length: 36 })
  fileId!: string;

  @ManyToOne(() => FileEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'file_id' })
  file!: FileEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
