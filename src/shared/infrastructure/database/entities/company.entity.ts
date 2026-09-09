import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Company } from '@domains/company/entities/company.entity';
import { GroupEntity } from './group.entity';

@Entity('companies')
export class CompanyEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 50, unique: true, name: 'tax_id' })
  @Index('IDX_companies_tax_id')
  taxId!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  @Column({ type: 'int', name: 'group_id' })
  groupId!: number;

  @ManyToOne(() => GroupEntity)
  @JoinColumn({ name: 'group_id' })
  group?: GroupEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt!: Date | null;

  static fromDomain(company: Company): CompanyEntity {
    const entity = new CompanyEntity();
    entity.id = company.id;
    entity.name = company.name;
    entity.taxId = company.taxId;
    entity.address = company.address;
    entity.phone = company.phone;
    entity.email = company.email;
    entity.groupId = company.groupId;
    entity.createdAt = company.createdAt;
    entity.updatedAt = company.updatedAt;
    entity.deletedAt = company.deletedAt;
    return entity;
  }

  static toDomain(entity: CompanyEntity): Company {
    return new Company({
      id: entity.id,
      name: entity.name,
      taxId: entity.taxId,
      address: entity.address,
      phone: entity.phone,
      email: entity.email,
      groupId: entity.groupId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt,
    });
  }
}
