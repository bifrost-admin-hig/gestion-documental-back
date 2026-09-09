import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Group } from '@domains/group/entities/group.entity';
import { UserEntity } from './user.entity';

@Entity('groups')
export class GroupEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string;

  @ManyToMany(() => UserEntity, (user) => user.groups)
  @JoinTable({
    name: 'group_users',
    joinColumn: { name: 'group_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  users!: UserEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  static fromDomain(group: Group): GroupEntity {
    const entity = new GroupEntity();
    entity.id = group.id!;
    entity.name = group.name;
    entity.description = group.description;
    entity.users = group.users?.map(UserEntity.fromDomain) ?? [];
    return entity;
  }

  static toDomain(entity: GroupEntity): Group {
    return new Group({
      id: entity.id,
      name: entity.name,
      description: entity.description,
      users: entity.users?.map(UserEntity.toDomain) ?? [],
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
