import { AppDataSource } from '@shared/infrastructure/database/typeorm.config';
import { RoleEntity } from '@shared/infrastructure/database/entities/role.entity';
import { CreateRoleProps, Role, UpdateRoleProps } from '@domains/role/entities/role.entity';
import { RoleRepository } from '@domains/role/repositories/role.repository';
import { In, Repository, DataSource } from 'typeorm';
import { PermissionEntity } from '@shared/infrastructure/database/entities/permission.entity';
import { NotFoundError } from '@shared/domain/errors';

export class TypeOrmRoleRepository implements RoleRepository {
  private repository: Repository<RoleEntity>;
  private permissionRepository: Repository<PermissionEntity>;

  constructor(dataSource?: DataSource) {
    const ds = dataSource || AppDataSource;
    this.repository = ds.getRepository(RoleEntity);
    this.permissionRepository = ds.getRepository(PermissionEntity);
  }

  async assignPermissionsToRole(roleId: number, permissionIds: number[]): Promise<void> {
    const role = await this.repository.findOne({ where: { id: roleId } });
    if (!role) throw new NotFoundError('Role not found');
    role.permissions = await this.permissionRepository.findBy({ id: In(permissionIds) });
    await this.repository.save(role);
  }

  async findAll(): Promise<Role[]> {
    const entities = await this.repository.find({ relations: ['permissions', 'parents', 'children'] });
    return entities.map(RoleEntity.toDomain);
  }

  async findById(id: number): Promise<Role | null> {
    const entity = await this.repository.findOne({ where: { id }, relations: ['permissions', 'parents'] });
    return entity ? RoleEntity.toDomain(entity) : null;
  }

  async findByName(name: string): Promise<Role | null> {
    const entity = await this.repository.findOne({ where: { name } });
    return entity ? RoleEntity.toDomain(entity) : null;
  }

  async findIn(ids: number[]): Promise<Role[]> {
    const entities = await this.repository.find({ where: { id: In(ids) }, relations: ['permissions', 'parents'] });
    return entities.map(RoleEntity.toDomain);
  }

  async save(props: CreateRoleProps): Promise<Role> {
    const domain = new Role(props);
    const entity = RoleEntity.fromDomain(domain);

    if (props.permissions) {
      entity.permissions = await this.permissionRepository.findBy({ id: In(props.permissions.map(p => p.id!)) });
    }

    const savedEntity = await this.repository.save(entity);
    return RoleEntity.toDomain(savedEntity);
  }

  async update(props: UpdateRoleProps): Promise<Role> {
    const entity = await this.repository.findOne({ where: { id: props.id } });
    if (!entity) {
      throw new NotFoundError('Role not found');
    }

    entity.name = props.name;
    if (props.description !== undefined) {
      entity.description = props.description;
    }

    if (props.permissions !== undefined) {
      entity.permissions = await this.permissionRepository.findBy({ id: In(props.permissions.map(p => p.id!)) });
    }

    const savedEntity = await this.repository.save(entity);
    const reloadedEntity = await this.repository.findOne({ where: { id: savedEntity.id }, relations: ['permissions', 'parents'] });
    return RoleEntity.toDomain(reloadedEntity!);
  }

  async delete(id: number): Promise<void> {
    const result = await this.repository.delete(id);
    if (result.affected === 0) {
      throw new Error('Role not found');
    }
  }
}
