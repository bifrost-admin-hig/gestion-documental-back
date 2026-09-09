import { Repository, IsNull } from 'typeorm';
import { type IFamilyRepository } from '@domains/family/repositories/family.repository.interface';
import { Family, type FamilyProps } from '@domains/family/entities/family.entity';
import { FamilyEntity } from '../database/entities/family.entity';
import { AppDataSource } from '../database/typeorm.config';
import { NotFoundError } from '@shared/domain/errors';

export class TypeOrmFamilyRepository implements IFamilyRepository {
  private repository: Repository<FamilyEntity>;

  constructor() {
    this.repository = AppDataSource.getRepository(FamilyEntity);
  }

  async findAll(groupId?: number): Promise<Family[]> {
    const where: any = { deletedAt: IsNull() };
    if (groupId) {
      where.groupId = groupId;
    }
    const entities = await this.repository.find({
      where,
      order: { name: 'ASC' },
    });
    return entities.map(entity => this.toDomain(entity));
  }

  async findByContractId(contractId: string, groupId?: number): Promise<Family[]> {
    const where: any = { contractId, deletedAt: IsNull() };
    if (groupId !== undefined) {
      where.groupId = groupId;
    }
    const entities = await this.repository.find({
      where,
      order: { name: 'ASC' },
    });
    return entities.map(entity => this.toDomain(entity));
  }

  async findById(id: string): Promise<Family | null> {
    const entity = await this.repository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!entity) return null;
    return this.toDomain(entity);
  }

  async findByName(name: string): Promise<Family | null> {
    const entity = await this.repository.findOne({
      where: { name, deletedAt: IsNull() },
    });
    if (!entity) return null;
    return this.toDomain(entity);
  }

  async create(family: Family): Promise<Family> {
    const entity = this.toEntity(family);
    const savedEntity = await this.repository.save(entity);
    return this.toDomain(savedEntity);
  }

  async update(family: Family): Promise<Family> {
    const entity = this.toEntity(family);
    await this.repository.update(family.id, entity);
    const updatedEntity = await this.repository.findOne({ where: { id: family.id } });
    if (!updatedEntity) {
      throw new NotFoundError('Familia no encontrada');
    }
    return this.toDomain(updatedEntity);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }

  async restore(id: string): Promise<void> {
    await this.repository.restore(id);
  }

  private toDomain(entity: FamilyEntity): Family {
    const props: FamilyProps = {
      id: entity.id,
      name: entity.name,
      groupId: entity.groupId,
      contractId: entity.contractId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt,
    };
    return Family.create(props);
  }

  private toEntity(family: Family): Partial<FamilyEntity> {
    return {
      id: family.id,
      name: family.name,
      groupId: family.groupId,
      contractId: family.contractId,
      createdAt: family.createdAt,
      updatedAt: family.updatedAt,
      deletedAt: family.deletedAt,
    };
  }
}
