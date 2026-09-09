import { Repository } from 'typeorm';
import { DocumentHistoryRepository } from '@domains/document/repositories/document-history.repository';
import { DocumentHistory, DocumentHistoryProps } from '@domains/document/entities/document-history.entity';
import { DocumentAction } from '@domains/document/value-objects/document-enums';
import { DocumentHistoryEntity } from '../database/entities/document-history.entity';
import { AppDataSource } from '../database/typeorm.config';
import { DateUtils } from '@shared/utils/date';

export class TypeOrmDocumentHistoryRepository implements DocumentHistoryRepository {
  private repository: Repository<DocumentHistoryEntity>;

  constructor() {
    this.repository = AppDataSource.getRepository(DocumentHistoryEntity);
  }

  async findById(id: string): Promise<DocumentHistory | null> {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) return null;
    return this.toDomain(entity);
  }

  async findAll(): Promise<DocumentHistory[]> {
    const entities = await this.repository.find({
      relations: ['updater'],
      order: { updatedAt: 'DESC' },
    });
    return entities.map(entity => this.toDomain(entity));
  }

  async findByDocumentId(documentId: string): Promise<DocumentHistory[]> {
    const entities = await this.repository.find({
      where: { documentId },
      relations: ['updater'],
      order: { updatedAt: 'DESC' },
    });
    return entities.map(entity => this.toDomain(entity));
  }

  async findByAction(action: DocumentAction): Promise<DocumentHistory[]> {
    const entities = await this.repository.find({
      where: { action },
      order: { updatedAt: 'DESC' },
    });
    return entities.map(entity => this.toDomain(entity));
  }

  async findByUpdatedBy(updatedBy: string): Promise<DocumentHistory[]> {
    const entities = await this.repository.find({
      where: { updatedBy },
      order: { updatedAt: 'DESC' },
    });
    return entities.map(entity => this.toDomain(entity));
  }

  async findByDocumentIdAndAction(documentId: string, action: DocumentAction): Promise<DocumentHistory[]> {
    const entities = await this.repository.find({
      where: { documentId, action },
      order: { updatedAt: 'DESC' },
    });
    return entities.map(entity => this.toDomain(entity));
  }

  async save(props: DocumentHistoryProps): Promise<DocumentHistory> {
    const domain = new DocumentHistory(props);
    const entity = this.toEntity(domain);
    const savedEntity = await this.repository.save(entity);

    const loadedEntity = await this.repository.findOne({
      where: { id: savedEntity.id },
      relations: ['documentModel', 'updater'],
    });

    if (!loadedEntity) {
      throw new Error('Could not load saved document history');
    }

    return this.toDomain(loadedEntity);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  private toDomain(entity: DocumentHistoryEntity): DocumentHistory {
    return new DocumentHistory({
      id: entity.id,
      documentId: entity.documentId,
      documentModelId: entity.documentModelId || entity.documentModel?.id,
      name: entity.name,
      issuedDate: DateUtils.parse(entity.issuedDate)!,
      expirationDate: DateUtils.parse(entity.expirationDate),
      contractId: entity.contractId,
      description: entity.description,
      documentUrl: entity.documentUrl,
      status: entity.status,
      comment: entity.comment,
      action: entity.action,
      updatedBy: entity.updatedBy,
      updatedByName: entity.updatedByName ?? entity.updater?.firstName,
      updatedByLastName: entity.updatedByName ? undefined : entity.updater?.lastName,
      updatedAt: entity.updatedAt,
      flowParticipantId: entity.flowParticipantId ?? null,
      actionComment: entity.actionComment ?? null,
    });
  }

  private toEntity(history: DocumentHistory): Partial<DocumentHistoryEntity> {
    return {
      id: history.id,
      documentId: history.documentId,
      documentModelId: history.documentModelId,
      name: history.name,
      issuedDate: DateUtils.toLocalDate(history.issuedDate)!,
      expirationDate: history.expirationDate ? DateUtils.toLocalDate(history.expirationDate) : undefined,
      contractId: history.contractId || undefined,
      description: history.description,
      documentUrl: history.documentUrl,
      status: history.status,
      comment: history.comment || undefined,
      action: history.action,
      updatedBy: history.updatedBy,
      updatedByName: history.updatedByName,
      updatedAt: history.updatedAt,
      flowParticipantId: history.flowParticipantId ?? undefined,
      actionComment: history.actionComment ?? undefined,
    };
  }
}
