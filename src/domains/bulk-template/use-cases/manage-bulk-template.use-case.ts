import { BulkUploadTemplate } from '../entities/bulk-upload-template.entity';
import { BulkUploadTemplateRepository } from '../repositories/bulk-upload-template.repository';
import { BulkTemplateType } from '../value-objects/bulk-template-type';
import { NotFoundError } from '@shared/domain/errors';

export interface SaveBulkTemplateRequest {
  type: BulkTemplateType;
  fileId: string;
  uploadedBy: string;
}

export class ManageBulkTemplateUseCase {
  constructor(private readonly bulkUploadTemplateRepository: BulkUploadTemplateRepository) {}

  async save(request: SaveBulkTemplateRequest): Promise<BulkUploadTemplate> {
    const { type, fileId, uploadedBy } = request;

    await this.bulkUploadTemplateRepository.deactivateAllByType(type);

    const template = new BulkUploadTemplate({
      type,
      fileId,
      uploadedBy,
      isActive: true,
    });

    return this.bulkUploadTemplateRepository.save(template);
  }

  async getActive(type: BulkTemplateType): Promise<BulkUploadTemplate> {
    const template = await this.bulkUploadTemplateRepository.findActiveByType(type);
    if (!template) {
      throw new NotFoundError(`No active template found for type: ${type}`);
    }
    return template;
  }

  async getHistory(type: BulkTemplateType): Promise<BulkUploadTemplate[]> {
    return this.bulkUploadTemplateRepository.findAllByType(type);
  }
}
