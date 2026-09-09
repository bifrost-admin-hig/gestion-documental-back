import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
} from 'typeorm';
import { RoleEntity } from './role.entity';
import { EntityProps } from '@shared/infrastructure/entity-props';
import { Permission } from '@domains/permission/entities/permission.entity';

type PermissionProps = EntityProps<Permission>;

@Entity('permissions')
export class PermissionEntity implements PermissionProps {
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

  @ManyToMany(() => RoleEntity, (role) => role.permissions)
  roles!: RoleEntity[];

  static fromDomain(permission: Permission): PermissionEntity {
    const permissionEntity = new PermissionEntity();
    permissionEntity.id = permission.id!;
    permissionEntity.name = permission.name;
    permissionEntity.description = permission.description;
    return permissionEntity;
  }

  static toDomain(entity: PermissionEntity): Permission {
    return new Permission({
      id: entity.id,
      name: entity.name,
      description: entity.description,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
