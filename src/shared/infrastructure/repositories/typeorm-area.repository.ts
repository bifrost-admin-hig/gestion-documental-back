import { Repository, DataSource } from 'typeorm';
import { AreaRepository } from '@domains/area/repositories/area.repository';
import { Area } from '@domains/area/entities/area.entity';
import { AreaEntity } from '../database/entities/area.entity';
import { AppDataSource } from '../database/typeorm.config';
import { NotFoundError } from '@shared/domain/errors';

export class TypeOrmAreaRepository implements AreaRepository {
  private repository: Repository<AreaEntity>;

  constructor(dataSource?: DataSource) {
    const ds = dataSource || AppDataSource;
    this.repository = ds.getRepository(AreaEntity);
  }

  async findAll(groupId?: number): Promise<Area[]> {
    const entities = await this.repository.find({
      where: groupId ? { groupId } : undefined,
      relations: ['group'],
      order: { createdAt: 'DESC' },
    });
    return entities.map(AreaEntity.toDomain);
  }

  async findById(id: string): Promise<Area | null> {
    const entity = await this.repository.findOne({
      where: { id },
      relations: ['group'],
    });
    return entity ? AreaEntity.toDomain(entity) : null;
  }

  async create(area: Area): Promise<Area> {
    const entity = new AreaEntity();
    entity.name = area.name;
    entity.description = area.description;
    entity.groupId = area.groupId;
    entity.createdAt = new Date();
    entity.updatedAt = new Date();

    const savedEntity = await this.repository.save(entity);
    const reloaded = await this.repository.findOne({
      where: { id: savedEntity.id },
      relations: ['group'],
    });
    return AreaEntity.toDomain(reloaded!);
  }

  async update(area: Area): Promise<Area> {
    const entity = await this.repository.findOne({
      where: { id: area.id },
    });
    if (!entity) {
      throw new NotFoundError('Area', area.id?.toString() || 'unknown');
    }

    entity.name = area.name;
    entity.description = area.description;
    entity.groupId = area.groupId;
    entity.updatedAt = new Date();

    const savedEntity = await this.repository.save(entity);
    const reloaded = await this.repository.findOne({
      where: { id: savedEntity.id },
      relations: ['group'],
    });
    return AreaEntity.toDomain(reloaded!);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
