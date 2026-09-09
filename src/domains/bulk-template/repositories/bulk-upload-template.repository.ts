import { BulkUploadTemplate } from '../entities/bulk-upload-template.entity';
import { BulkTemplateType } from '../value-objects/bulk-template-type';

export interface BulkUploadTemplateRepository {
  findActiveByType(type: BulkTemplateType): Promise<BulkUploadTemplate | null>;
  findAllByType(type: BulkTemplateType): Promise<BulkUploadTemplate[]>;
  deactivateAllByType(type: BulkTemplateType): Promise<void>;
  save(template: BulkUploadTemplate): Promise<BulkUploadTemplate>;
}
