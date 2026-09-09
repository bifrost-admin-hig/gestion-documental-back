import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Role } from '@domains/role/entities/role.entity';
import { UserEntity } from '@shared/infrastructure/database/entities/user.entity';
import { EntityProps } from '@shared/infrastructure/entity-props';
import { PermissionEntity } from './permission.entity';

type RoleProps = EntityProps<Role, 'permissions' | 'parents' | 'children'>;

@Entity('roles')
export class RoleEntity implements RoleProps {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToMany(() => PermissionEntity, (permission) => permission.roles)
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions!: PermissionEntity[];

  @ManyToMany(() => UserEntity, (user) => user.roles)
  users!: UserEntity[];

  @ManyToMany(() => RoleEntity, (role) => role.parents)
  @JoinTable({
    name: 'role_hierarchy',
    joinColumn: { name: 'parent_role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'child_role_id', referencedColumnName: 'id' },
  })
  children?: RoleEntity[];

  @ManyToMany(() => RoleEntity, (role) => role.children)
  parents?: RoleEntity[];

  static fromDomain(role: Role): RoleEntity {
    return Object.assign(new RoleEntity(), {
      id: role.id!,
      name: role.name,
      description: role.description,
      permissions: role.permissions?.map((p) => PermissionEntity.fromDomain(p)) ?? [],
      parents: role.parents?.map((p) => RoleEntity.fromDomain(p)) ?? [],
      children: role.children?.map((c) => RoleEntity.fromDomain(c)) ?? [],
    });
  }

  static toDomain(entity: RoleEntity): Role {
    return new Role({
      id: entity.id,
      name: entity.name,
      description: entity.description,
      permissions: (entity.permissions || []).map((p) => PermissionEntity.toDomain(p)),
      parents: entity.parents?.map((p) => RoleEntity.toDomain(p)) ?? [],
      children: entity.children?.map((c) => RoleEntity.toDomain(c)) ?? [],
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
