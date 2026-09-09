import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Area } from '@domains/area/entities/area.entity';
import { GroupEntity } from './group.entity';

@Entity('areas')
export class AreaEntity {
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

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  static fromDomain(area: Area): AreaEntity {
    const entity = new AreaEntity();
    entity.id = area.id!;
    entity.name = area.name;
    entity.description = area.description;
    entity.groupId = area.groupId;
    entity.createdAt = area.createdAt;
    entity.updatedAt = area.updatedAt;
    return entity;
  }

  static toDomain(entity: AreaEntity): Area {
    return new Area({
      id: entity.id,
      name: entity.name,
      description: entity.description,
      groupId: entity.groupId,
      groupName: entity.group?.name,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
