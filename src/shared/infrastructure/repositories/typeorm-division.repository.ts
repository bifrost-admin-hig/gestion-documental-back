import { Repository, DataSource } from 'typeorm';
import { DivisionRepository } from '@domains/division/repositories/division.repository';
import { Division } from '@domains/division/entities/division.entity';
import { DivisionEntity } from '../database/entities/division.entity';
import { AppDataSource } from '../database/typeorm.config';
import { NotFoundError } from '@shared/domain/errors';

export class TypeOrmDivisionRepository implements DivisionRepository {
  private repository: Repository<DivisionEntity>;

  constructor(dataSource?: DataSource) {
    const ds = dataSource || AppDataSource;
    this.repository = ds.getRepository(DivisionEntity);
  }

  async findAll(groupId?: number): Promise<Division[]> {
    const entities = await this.repository.find({
      where: groupId ? { groupId } : undefined,
      relations: ['group', 'area'],
      order: { createdAt: 'DESC' },
    });
    return entities.map(DivisionEntity.toDomain);
  }

  async findById(id: string): Promise<Division | null> {
    const entity = await this.repository.findOne({
      where: { id },
      relations: ['group', 'area'],
    });
    return entity ? DivisionEntity.toDomain(entity) : null;
  }

  async create(division: Division): Promise<Division> {
    const entity = new DivisionEntity();
    entity.name = division.name;
    entity.description = division.description;
    entity.groupId = division.groupId;
    entity.areaId = division.areaId;
    entity.createdAt = new Date();
    entity.updatedAt = new Date();

    const savedEntity = await this.repository.save(entity);
    const reloaded = await this.repository.findOne({
      where: { id: savedEntity.id },
      relations: ['group', 'area'],
    });
    return DivisionEntity.toDomain(reloaded!);
  }

  async update(division: Division): Promise<Division> {
    const entity = await this.repository.findOne({
      where: { id: division.id },
    });
    if (!entity) {
      throw new NotFoundError('Division', division.id?.toString() || 'unknown');
    }

    entity.name = division.name;
    entity.description = division.description;
    entity.groupId = division.groupId;
    entity.areaId = division.areaId;
    entity.updatedAt = new Date();

    const savedEntity = await this.repository.save(entity);
    const reloaded = await this.repository.findOne({
      where: { id: savedEntity.id },
      relations: ['group', 'area'],
    });
    return DivisionEntity.toDomain(reloaded!);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
