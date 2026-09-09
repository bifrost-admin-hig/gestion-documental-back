import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ContractEntity } from './contract.entity';

@Entity('contract_subcontracts')
@Index('UQ_contract_subcontracts_contract_subcontract', ['contractId', 'subcontractId'], { unique: true })
export class ContractSubcontractEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'contract_id', type: 'uuid' })
  contractId!: string;

  @ManyToOne(() => ContractEntity)
  @JoinColumn({ name: 'contract_id' })
  contract!: ContractEntity;

  @Column({ name: 'subcontract_id', type: 'uuid' })
  subcontractId!: string;

  @ManyToOne(() => ContractEntity)
  @JoinColumn({ name: 'subcontract_id' })
  subcontract!: ContractEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
