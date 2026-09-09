import { AppDataSource } from '@shared/infrastructure/database/typeorm.config';
import { ColaboratorGroupEntity } from '@shared/infrastructure/database/entities/colaborator-group.entity';
import { CreateColaboratorGroupProps, ColaboratorGroup, UpdateColaboratorGroupProps } from '@domains/colaborator-group/entities/colaborator-group.entity';
import { ColaboratorGroupRepository } from '@domains/colaborator-group/repositories/colaborator-group.repository';
import { In, Repository } from 'typeorm';
import { ColaboratorEntity } from '@shared/infrastructure/database/entities/colaborators.entity';
import { NotFoundError } from '@shared/domain/errors';

export class TypeOrmColaboratorGroupRepository implements ColaboratorGroupRepository {
  private repository: Repository<ColaboratorGroupEntity>;
  private colaboratorRepository: Repository<ColaboratorEntity>;

  constructor() {
    this.repository = AppDataSource.getRepository(ColaboratorGroupEntity);
    this.colaboratorRepository = AppDataSource.getRepository(ColaboratorEntity);
  }

  async assignColaboratorsToGroup(groupId: number, colaboratorIds: string[]): Promise<void> {
    const entity = await this.repository.findOne({ where: { id: groupId } });
    if (!entity) {
      throw new NotFoundError('Colaborator group not found');
    }

    entity.colaborators = await this.colaboratorRepository.findBy({ id: In(colaboratorIds) });
    await this.repository.save(entity);
  }

  async findAll(groupId?: number): Promise<ColaboratorGroup[]> {
    const qb = this.repository.createQueryBuilder('cg')
      .leftJoinAndSelect('cg.colaborators', 'colaborators');

    if (groupId !== undefined) {
      qb.innerJoin('cg.contract', 'contract')
        .where('contract.groupId = :groupId', { groupId });
    }

    const entities = await qb.getMany();
    return entities.map(ColaboratorGroupEntity.toDomain);
  }

  async findById(id: number): Promise<ColaboratorGroup | null> {
    const entity = await this.repository.findOne({ where: { id }, relations: ['colaborators', 'colaborators.contracts'] });
    return entity ? ColaboratorGroupEntity.toDomain(entity) : null;
  }

  async findByName(name: string): Promise<ColaboratorGroup | null> {
    const entity = await this.repository.findOne({ where: { name } });
    return entity ? ColaboratorGroupEntity.toDomain(entity) : null;
  }

  async findIn(ids: number[]): Promise<ColaboratorGroup[]> {
    const entities = await this.repository.find({ where: { id: In(ids) }, relations: ['colaborators'] });
    return entities.map(ColaboratorGroupEntity.toDomain);
  }

  async save(props: CreateColaboratorGroupProps): Promise<ColaboratorGroup> {
    const domain = new ColaboratorGroup(props);
    const entity = ColaboratorGroupEntity.fromDomain(domain);

    if (props.colaborators && props.colaborators.length > 0) {
      const colaboratorIds = props.colaborators.map(c => c.id);
      entity.colaborators = await this.colaboratorRepository.findBy({ id: In(colaboratorIds) });
    }

    const savedEntity = await this.repository.save(entity);
    return ColaboratorGroupEntity.toDomain(savedEntity);
  }

  async update(props: UpdateColaboratorGroupProps): Promise<ColaboratorGroup> {
    const entity = await this.repository.findOne({ where: { id: props.id } });
    if (!entity) {
      throw new NotFoundError('Colaborator group not found');
    }

    entity.name = props.name ?? entity.name;
    if (props.contractId) {
      entity.contractId = props.contractId;
    }
    if (props.description !== undefined) {
      entity.description = props.description;
    }

    if (props.colaborators) {
      const colaboratorIds = props.colaborators.map(c => c.id);
      entity.colaborators = await this.colaboratorRepository.findBy({ id: In(colaboratorIds) });
    }


    const savedEntity = await this.repository.save(entity);
    const reloadedEntity = await this.repository.findOne({ where: { id: savedEntity.id }, relations: ['colaborators'] });
    return ColaboratorGroupEntity.toDomain(reloadedEntity!);
  }

  async delete(id: number): Promise<void> {
    const result = await this.repository.delete(id);
    if (result.affected === 0) {
      throw new Error('Colaborator group not found');
    }
  }
}
