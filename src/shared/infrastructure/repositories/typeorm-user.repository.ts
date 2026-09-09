import { In, Repository, DataSource } from 'typeorm';
import { type UserRepository } from '@domains/user/repositories/user.repository';
import { CreateUserProps, UpdateUserProps, User } from '@domains/user/entities/user.entity';
import { UserStatus } from '@domains/user/value-objects/user-status';
import { UserEntity } from '../database/entities/user.entity';
import { AppDataSource } from '../database/typeorm.config';
import { RoleEntity } from '../database/entities/role.entity';
import { NotFoundError } from '@shared/domain/errors';
import { Email } from '@domains/user/value-objects/email';

export class TypeOrmUserRepository implements UserRepository {
  private repository: Repository<UserEntity>;
  private roleRepository: Repository<RoleEntity>;

  constructor(dataSource?: DataSource) {
    const ds = dataSource || AppDataSource;
    this.repository = ds.getRepository(UserEntity);
    this.roleRepository = ds.getRepository(RoleEntity);
  }

  async assignRoleToUser(userId: string, roleId: number): Promise<void> {
    const user = await this.repository.findOne({ where: { id: userId }, relations: ['roles'] });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundError('Role not found');
    }

    if (!user.roles?.find(r => r.id === role.id)) {
      (user.roles ??= []).push(role);
      await this.repository.save(user);
    }
  }

  async findAll(groupId?: number): Promise<User[]> {
    const query = this.repository.createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .leftJoinAndSelect('user.groups', 'group')
      .orderBy('user.createdAt', 'DESC');

    if (groupId) {
      query.innerJoin('group_users', 'gu', 'gu.user_id = user.id')
        .where('gu.group_id = :groupId', { groupId });
    }

    const userEntities = await query.getMany();
    return userEntities.map(UserEntity.toDomain);
  }

  async findById(id: string): Promise<User | null> {
    const userEntity = await this.repository.createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .leftJoinAndSelect('role.children', 'children')
      .leftJoinAndSelect('children.permissions', 'childrenPermissions')
      .leftJoinAndSelect('user.groups', 'group')
      .where('user.id = :id', { id })
      .getOne();

    if (!userEntity) return null;
    return UserEntity.toDomain(userEntity);
  }

  async findByRoleId(roleId: number): Promise<User[]> {
    const userEntities = await this.repository.createQueryBuilder('user')
      .innerJoinAndSelect('user.roles', 'role', 'role.id = :roleId', { roleId })
      .leftJoinAndSelect('role.permissions', 'permission')
      .leftJoinAndSelect('role.children', 'children')
      .leftJoinAndSelect('children.permissions', 'childrenPermissions')
      .leftJoinAndSelect('user.groups', 'group')
      .orderBy('user.createdAt', 'DESC')
      .getMany();
    return userEntities.map(UserEntity.toDomain);
  }

  async save(props: CreateUserProps): Promise<User> {
    const domain = new User(props);
    const entity = UserEntity.fromDomain(domain);

    if (props.roles && props.roles.length > 0) {
      const roleIds = props.roles.map(r => r.id).filter((id): id is number => id !== undefined);
      if (roleIds.length > 0) {
        entity.roles = await this.roleRepository.findBy({ id: In(roleIds) });
      } else {
        entity.roles = [];
      }
    } else {
      entity.roles = [];
    }

    const savedEntity = await this.repository.save(entity);
    const reloadedEntity = await this.repository.findOne({ where: { id: savedEntity.id }, relations: ['roles', 'roles.permissions', 'groups'] });
    return UserEntity.toDomain(reloadedEntity!);
  }

  async update(props: UpdateUserProps): Promise<User> {
    const entity = await this.repository.findOne({ where: { id: props.id } });
    if (!entity) {
      throw new NotFoundError('User not found');
    }

    if (props.email) {
      const emailValue = Email.create(props.email);
      entity.email = emailValue.toString();
    }
    if (props.firstName) {
      entity.firstName = props.firstName;
    }
    if (props.lastName) {
      entity.lastName = props.lastName;
    }
    if (props.password) {
      entity.password = props.password;
    }
    if (props.status) {
      entity.status = props.status as any;
    }

    if (props.passwordNonce !== undefined) {
      entity.passwordNonce = props.passwordNonce ?? null;
    }
    if (props.rut !== undefined) {
      entity.rut = props.rut;
    }
    if (props.phone !== undefined) {
      entity.phone = props.phone;
    }

    if (props.roles) {
      entity.roles = await this.roleRepository.findBy({ id: In(props.roles.map(r => r.id)) });
    }

    const savedEntity = await this.repository.save(entity);
    const reloadedEntity = await this.repository.findOne({ where: { id: savedEntity.id }, relations: ['roles', 'roles.permissions', 'groups'] });
    return UserEntity.toDomain(reloadedEntity!);
  }

  async delete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }

  async updatePasswordNonce(userId: string, nonce: string | null): Promise<void> {
    await this.repository.update({ id: userId }, { passwordNonce: nonce });
  }

  async findByEmail(email: string): Promise<User | null> {
    const userEntity = await this.repository.findOne({ where: { email }, relations: ['roles', 'roles.permissions', 'groups'] });
    if (!userEntity) return null;
    return UserEntity.toDomain(userEntity);
  }

  async findByStatus(status: UserStatus): Promise<User[]> {
    const userEntities = await this.repository.find({
      where: { status: status as any },
      order: { createdAt: 'DESC' },
      relations: ['roles', 'groups'],
    });
    return userEntities.map(UserEntity.toDomain);
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.repository.count({ where: { email } });
    return count > 0;
  }
}
