import { AppDataSource } from '@shared/infrastructure/database/typeorm.config';
import { ContractReviewerEntity } from '@shared/infrastructure/database/entities/contract-reviewer.entity';
import { ContractReviewer, CreateContractReviewerProps, UpdateContractReviewerProps } from '@domains/contract/entities/contract-reviewer.entity';
import { ContractReviewerRepository } from '@domains/contract/repositories/contract-reviewer.repository';
import { Repository } from 'typeorm';
import { NotFoundError } from '@shared/domain/errors';

export class TypeOrmContractReviewerRepository implements ContractReviewerRepository {
  private repository: Repository<ContractReviewerEntity>;

  constructor() {
    this.repository = AppDataSource.getRepository(ContractReviewerEntity);
  }

  async findById(id: string): Promise<ContractReviewer | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? ContractReviewerEntity.toDomain(entity) : null;
  }

  async findByContractAndUser(contractId: string, userId: string): Promise<ContractReviewer | null> {
    const entity = await this.repository.findOne({
      where: { contractId, userId },
    });
    return entity ? ContractReviewerEntity.toDomain(entity) : null;
  }

  async findByContract(contractId: string): Promise<ContractReviewer[]> {
    const entities = await this.repository.find({
      where: { contractId },
      relations: ['user'],
    });
    return entities.map(ContractReviewerEntity.toDomain);
  }

  async findByUser(userId: string): Promise<ContractReviewer[]> {
    const entities = await this.repository.find({
      where: { userId },
      relations: ['contract'],
    });
    return entities.map(ContractReviewerEntity.toDomain);
  }

  async findActiveByContract(contractId: string): Promise<ContractReviewer[]> {
    const now = new Date();
    const entities = await this.repository
      .createQueryBuilder('reviewer')
      .leftJoinAndSelect('reviewer.user', 'user')
      .where('reviewer.contractId = :contractId', { contractId })
      .andWhere(
        '(reviewer.isPrimary = true OR (reviewer.isPrimary = false AND reviewer.validUntil > :now))',
        { now },
      )
      .getMany();

    return entities.map(ContractReviewerEntity.toDomain);
  }

  async save(props: CreateContractReviewerProps): Promise<ContractReviewer> {
    const domain = new ContractReviewer(props);
    const entity = ContractReviewerEntity.fromDomain(domain);
    const savedEntity = await this.repository.save(entity);
    return ContractReviewerEntity.toDomain(savedEntity);
  }

  async update(props: UpdateContractReviewerProps): Promise<ContractReviewer> {
    const entity = await this.repository.findOne({ where: { id: props.id } });
    if (!entity) {
      throw new NotFoundError('Contract reviewer not found');
    }

    if (props.isPrimary !== undefined) {
      entity.isPrimary = props.isPrimary;
    }
    if (props.validUntil !== undefined) {
      entity.validUntil = props.validUntil as Date | null;
    }

    const savedEntity = await this.repository.save(entity);
    return ContractReviewerEntity.toDomain(savedEntity);
  }

  async delete(id: string): Promise<void> {
    const result = await this.repository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundError('Contract reviewer not found');
    }
  }

  async deleteByContractAndUser(contractId: string, userId: string): Promise<void> {
    const result = await this.repository.delete({ contractId, userId });
    if (result.affected === 0) {
      throw new NotFoundError('Contract reviewer not found');
    }
  }

  async findByContractIds(contractIds: string[]): Promise<Map<string, ContractReviewer[]>> {
    if (contractIds.length === 0) {
      return new Map();
    }

    const entities = await this.repository
      .createQueryBuilder('reviewer')
      .leftJoinAndSelect('reviewer.user', 'user')
      .where('reviewer.contractId IN (:...contractIds)', { contractIds })
      .orderBy('reviewer.createdAt', 'ASC')
      .getMany();

    const grouped = new Map<string, ContractReviewer[]>();

    for (const entity of entities) {
      const reviewer = ContractReviewerEntity.toDomain(entity);
      const contractId = entity.contractId;

      if (!grouped.has(contractId)) {
        grouped.set(contractId, []);
      }
      grouped.get(contractId)!.push(reviewer);
    }

    return grouped;
  }
}
