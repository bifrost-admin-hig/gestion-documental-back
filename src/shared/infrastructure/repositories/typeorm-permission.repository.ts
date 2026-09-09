import { In, Repository } from 'typeorm';
import { AppDataSource } from '@shared/infrastructure/database/typeorm.config';
import { CreatePermissionProps, Permission, UpdatePermissionProps } from '@domains/permission/entities/permission.entity';
import { PermissionEntity } from '@shared/infrastructure/database/entities/permission.entity';
import { PermissionRepository } from '@domains/permission/repositories/permission.repository';
import { NotFoundError } from '@shared/domain/errors';

export class TypeOrmPermissionRepository implements PermissionRepository {
  private repository: Repository<PermissionEntity>;

  constructor() {
    this.repository = AppDataSource.getRepository(PermissionEntity);
  }

  async findAll(): Promise<Permission[]> {
    const entities = await this.repository.find();
    return entities.map(PermissionEntity.toDomain);
  }

  async findById(id: number): Promise<Permission | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? PermissionEntity.toDomain(entity) : null;
  }

  async findByName(name: string): Promise<Permission | null> {
    const entity = await this.repository.findOne({ where: { name } });
    return entity ? PermissionEntity.toDomain(entity) : null;
  }

  async findIn(ids: number[]): Promise<Permission[]> {
    const entities = await this.repository.findBy({ id: In(ids) });
    return entities.map(PermissionEntity.toDomain);
  }

  async save(props: CreatePermissionProps): Promise<Permission> {
    const domain = new Permission(props);
    const entity = PermissionEntity.fromDomain(domain);
    const savedEntity = await this.repository.save(entity);
    return PermissionEntity.toDomain(savedEntity);
  }

  async update(props: UpdatePermissionProps): Promise<Permission> {
    const entity = await this.repository.findOne({ where: { id: props.id } });
    if (!entity) {
      throw new NotFoundError('Permission not found');
    }
    const domain = PermissionEntity.toDomain(entity);
    Object.assign(domain, props);
    const updatedDomain = new Permission(domain);
    const updatedEntity = PermissionEntity.fromDomain(updatedDomain);
    const savedEntity = await this.repository.save(updatedEntity);
    return PermissionEntity.toDomain(savedEntity);
  }

  async delete(id: number): Promise<void> {
    await this.repository.delete(id);
  }
}
