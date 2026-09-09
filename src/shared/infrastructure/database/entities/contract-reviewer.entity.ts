import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ContractReviewer } from '@domains/contract/entities/contract-reviewer.entity';
import { UserEntity } from './user.entity';
import { ContractEntity } from './contract.entity';

@Entity('contract_reviewers')
export class ContractReviewerEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'contract_id', type: 'uuid' })
  contractId!: string;

  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary!: boolean;

  @Column({ name: 'valid_until', type: 'date', nullable: true })
  validUntil!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @ManyToOne(() => ContractEntity)
  @JoinColumn({ name: 'contract_id' })
  contract?: ContractEntity;

  static fromDomain(reviewer: ContractReviewer): ContractReviewerEntity {
    const entity = new ContractReviewerEntity();
    entity.id = reviewer.id;
    entity.userId = reviewer.userId;
    entity.contractId = reviewer.contractId;
    entity.isPrimary = reviewer.isPrimary;
    entity.validUntil = reviewer.validUntil;
    entity.createdAt = reviewer.createdAt;
    return entity;
  }

  static toDomain(entity: ContractReviewerEntity): ContractReviewer {
    return new ContractReviewer({
      id: entity.id,
      userId: entity.userId,
      contractId: entity.contractId,
      isPrimary: entity.isPrimary,
      validUntil: entity.validUntil,
      createdAt: entity.createdAt,
      skipValidation: true, // Datos ya guardados en BD no necesitan validación de fecha futura
    });
  }
}
