import { Repository, DataSource, Not } from 'typeorm';
import { CompanyRepository } from '@domains/company/repositories/company.repository';
import { Company } from '@domains/company/entities/company.entity';
import { CompanyEntity } from '../database/entities/company.entity';
import { AppDataSource } from '../database/typeorm.config';

export class TypeOrmCompanyRepository implements CompanyRepository {
  private repository: Repository<CompanyEntity>;

  constructor(dataSource?: DataSource) {
    this.repository = (dataSource || AppDataSource).getRepository(CompanyEntity);
  }

  async findById(id: string): Promise<Company | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? CompanyEntity.toDomain(entity) : null;
  }

  async findAll(groupId?: number): Promise<Company[]> {
    const where = groupId ? { groupId } : {};
    const entities = await this.repository.find({
      where,
      order: { createdAt: 'DESC' },
    });
    return entities.map(CompanyEntity.toDomain);
  }

  async save(company: Company): Promise<Company> {
    const entity = CompanyEntity.fromDomain(company);
    const savedEntity = await this.repository.save(entity);
    return CompanyEntity.toDomain(savedEntity);
  }

  async update(company: Company): Promise<Company> {
    const entity = CompanyEntity.fromDomain(company);
    const savedEntity = await this.repository.save(entity);
    return CompanyEntity.toDomain(savedEntity);
  }

  async delete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }

  async existsByTaxId(taxId: string, excludeId?: string): Promise<boolean> {
    const where: any = { taxId };
    if (excludeId) {
      where.id = Not(excludeId);
    }
    const count = await this.repository.count({ where });
    return count > 0;
  }
}
