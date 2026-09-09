import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
  DeleteDateColumn,
} from 'typeorm';
import { EnumColumn } from '@shared/infrastructure/database/entities/utils/decorators';
import { RoleEntity } from './role.entity';
import { User } from '@domains/user/entities/user.entity';
import { GroupEntity } from './group.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName!: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName!: string;

  @Column({ type: 'varchar', length: 255 })
  password!: string;

  @EnumColumn({ enum: ['active', 'inactive', 'suspended', 'pending'] })
  status!: 'active' | 'inactive' | 'suspended' | 'pending';

  @Column({ name: 'password_nonce', type: 'varchar', length: 36, nullable: true })
  passwordNonce!: string | null;

  @Column({ type: 'varchar', length: 12, nullable: true })
  rut!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone!: string | null;

  @ManyToMany(() => RoleEntity, (role) => role.users)
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles?: RoleEntity[];

  @ManyToMany(() => GroupEntity, (group) => group.users)
  groups?: GroupEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  static fromDomain(user: User): UserEntity {
    const entity = new UserEntity();
    entity.id = user.id;
    entity.email = user.email.toString();
    entity.firstName = user.firstName;
    entity.lastName = user.lastName;
    entity.password = user.password;
    entity.status = user.status as any;
    entity.passwordNonce = user.passwordNonce ?? null;
    entity.rut = user.rut ?? null;
    entity.phone = user.phone ?? null;
    entity.roles = user.roles?.map(RoleEntity.fromDomain);
    return entity;
  }

  static toDomain(entity: UserEntity): User {
    return new User({
      id: entity.id,
      email: entity.email,
      firstName: entity.firstName,
      lastName: entity.lastName,
      password: entity.password,
      status: entity.status,
      passwordNonce: entity.passwordNonce ?? null,
      rut: entity.rut ?? null,
      phone: entity.phone ?? null,
      roles: entity.roles?.map(RoleEntity.toDomain) ?? [],
      groups: entity.groups?.map((g: any) => ({ id: g.id, name: g.name })) ?? [],
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt,
    });
  }
}
