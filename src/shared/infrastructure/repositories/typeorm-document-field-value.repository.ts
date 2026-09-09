import { Repository } from 'typeorm';
import { DocumentFieldValueRepository } from '@domains/document/repositories/document-field-value.repository';
import { DocumentFieldValue } from '@domains/document/entities/document.entity';
import { DocumentFieldValueEntity } from '../database/entities/document-field-value.entity';
import { AppDataSource } from '../database/typeorm.config';

export class TypeOrmDocumentFieldValueRepository implements DocumentFieldValueRepository {
  private repository: Repository<DocumentFieldValueEntity>;

  constructor() {
    this.repository = AppDataSource.getRepository(DocumentFieldValueEntity);
  }

  async saveMany(documentId: string, fieldValues: DocumentFieldValue[]): Promise<void> {
    if (fieldValues.length === 0) return;

    const entities = fieldValues.map(fv => {
      const entity = this.repository.create({
        documentId,
        fieldName: fv.fieldName,
        fieldValue: fv.fieldValue ?? undefined,
      });
      return entity;
    });

    await this.repository.save(entities);
  }

  async findByDocumentId(documentId: string): Promise<DocumentFieldValue[]> {
    const entities = await this.repository.find({ where: { documentId } });
    return entities.map(e => ({ fieldName: e.fieldName, fieldValue: e.fieldValue ?? null }));
  }

  async deleteByDocumentId(documentId: string): Promise<void> {
    await this.repository.delete({ documentId });
  }
}
