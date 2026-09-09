import { Repository } from 'typeorm';
import { AppDataSource } from '@shared/infrastructure/database/typeorm.config';
import { BulkUploadTemplateEntity } from '@shared/infrastructure/database/entities/bulk-upload-template.entity';
import { BulkUploadTemplate } from '@domains/bulk-template/entities/bulk-upload-template.entity';
import { BulkUploadTemplateRepository } from '@domains/bulk-template/repositories/bulk-upload-template.repository';
import { BulkTemplateType } from '@domains/bulk-template/value-objects/bulk-template-type';

export class TypeOrmBulkUploadTemplateRepository implements BulkUploadTemplateRepository {
  private repository: Repository<BulkUploadTemplateEntity>;

  constructor() {
    this.repository = AppDataSource.getRepository(BulkUploadTemplateEntity);
  }

  async findActiveByType(type: BulkTemplateType): Promise<BulkUploadTemplate | null> {
    const entity = await this.repository.findOne({ where: { type, isActive: true } });
    if (!entity) return null;
    return BulkUploadTemplateEntity.toDomain(entity);
  }

  async findAllByType(type: BulkTemplateType): Promise<BulkUploadTemplate[]> {
    const entities = await this.repository.find({
      where: { type },
      order: { createdAt: 'DESC' },
    });
    return entities.map(BulkUploadTemplateEntity.toDomain);
  }

  async deactivateAllByType(type: BulkTemplateType): Promise<void> {
    await this.repository.update({ type, isActive: true }, { isActive: false });
  }

  async save(template: BulkUploadTemplate): Promise<BulkUploadTemplate> {
    const entity = BulkUploadTemplateEntity.fromDomain(template);
    const saved = await this.repository.save(entity);
    return BulkUploadTemplateEntity.toDomain(saved);
  }
}
