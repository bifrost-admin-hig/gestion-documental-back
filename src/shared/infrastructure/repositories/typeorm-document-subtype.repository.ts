import { Repository } from 'typeorm';
import { type DocumentSubtypeRepository } from '@domains/document-subtype/repositories/document-subtype.repository';
import { DocumentSubtype, type DocumentSubtypeProps } from '@domains/document-subtype/entities/document-subtype.entity';
import { DocumentSubtypeEntity } from '../database/entities/document-subtype.entity';
import { AppDataSource } from '../database/typeorm.config';

export class TypeOrmDocumentSubtypeRepository implements DocumentSubtypeRepository {
  private repository: Repository<DocumentSubtypeEntity>;

  constructor() {
    this.repository = AppDataSource.getRepository(DocumentSubtypeEntity);
  }

  async findById(id: string): Promise<DocumentSubtype | null> {
    const documentSubtypeEntity = await this.repository.findOne({ where: { id } });
    if (!documentSubtypeEntity) return null;
    return this.toDomain(documentSubtypeEntity);
  }

  async findAll(): Promise<DocumentSubtype[]> {
    const documentSubtypeEntities = await this.repository.find({
      order: { name: 'ASC' },
    });
    return documentSubtypeEntities.map(entity => this.toDomain(entity));
  }

  async save(documentSubtype: DocumentSubtype): Promise<DocumentSubtype> {
    const documentSubtypeEntity = this.toEntity(documentSubtype);
    const savedEntity = await this.repository.save(documentSubtypeEntity);
    return this.toDomain(savedEntity);
  }

  async update(documentSubtype: DocumentSubtype): Promise<DocumentSubtype> {
    const documentSubtypeEntity = this.toEntity(documentSubtype);
    await this.repository.update(documentSubtype.id, documentSubtypeEntity);
    const updatedEntity = await this.repository.findOne({ where: { id: documentSubtype.id } });
    return this.toDomain(updatedEntity!);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async findByName(name: string): Promise<DocumentSubtype | null> {
    const documentSubtypeEntity = await this.repository.findOne({ where: { name } });
    if (!documentSubtypeEntity) return null;
    return this.toDomain(documentSubtypeEntity);
  }

  async findByDocumentTypeId(documentTypeId: string): Promise<DocumentSubtype[]> {
    const documentSubtypeEntities = await this.repository.find({
      where: { documentTypeId },
      order: { name: 'ASC' },
    });
    return documentSubtypeEntities.map(entity => this.toDomain(entity));
  }

  async existsByName(name: string): Promise<boolean> {
    const count = await this.repository.count({ where: { name } });
    return count > 0;
  }

  async existsByNameAndDocumentTypeId(name: string, documentTypeId: string): Promise<boolean> {
    const count = await this.repository.count({ where: { name, documentTypeId } });
    return count > 0;
  }

  private toDomain(entity: DocumentSubtypeEntity): DocumentSubtype {
    const props: DocumentSubtypeProps = {
      id: entity.id,
      name: entity.name,
      documentTypeId: entity.documentTypeId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
    return DocumentSubtype.create(props);
  }

  private toEntity(documentSubtype: DocumentSubtype): Partial<DocumentSubtypeEntity> {
    return {
      id: documentSubtype.id,
      name: documentSubtype.name,
      documentTypeId: documentSubtype.documentTypeId,
      createdAt: documentSubtype.createdAt,
      updatedAt: documentSubtype.updatedAt,
    };
  }
}
