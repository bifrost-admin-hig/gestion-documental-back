import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Division } from '@domains/division/entities/division.entity';
import { GroupEntity } from './group.entity';
import { AreaEntity } from './area.entity';

@Entity('divisions')
export class DivisionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'int' })
  groupId!: number;

  @ManyToOne(() => GroupEntity)
  @JoinColumn({ name: 'groupId' })
  group?: GroupEntity;

  @Column({ type: 'varchar', length: 36 })
  areaId!: string;

  @ManyToOne(() => AreaEntity)
  @JoinColumn({ name: 'areaId' })
  area?: AreaEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  static fromDomain(division: Division): DivisionEntity {
    const entity = new DivisionEntity();
    entity.id = division.id!;
    entity.name = division.name;
    entity.description = division.description;
    entity.groupId = division.groupId;
    entity.areaId = division.areaId;
    entity.createdAt = division.createdAt;
    entity.updatedAt = division.updatedAt;
    return entity;
  }

  static toDomain(entity: DivisionEntity): Division {
    return new Division({
      id: entity.id,
      name: entity.name,
      description: entity.description,
      groupId: entity.groupId,
      groupName: entity.group?.name,
      areaId: entity.areaId,
      areaName: entity.area?.name,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
