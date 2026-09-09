import { Repository } from 'typeorm';
import { type DocumentTypeRepository } from '@domains/document-type/repositories/document-type.repository';
import { DocumentType, type DocumentTypeProps } from '@domains/document-type/entities/document-type.entity';
import { DocumentTypeEntity } from '../database/entities/document-type.entity';
import { AppDataSource } from '../database/typeorm.config';

export class TypeOrmDocumentTypeRepository implements DocumentTypeRepository {
  private repository: Repository<DocumentTypeEntity>;

  constructor() {
    this.repository = AppDataSource.getRepository(DocumentTypeEntity);
  }

  async findById(id: string): Promise<DocumentType | null> {
    const documentTypeEntity = await this.repository.findOne({ where: { id } });
    if (!documentTypeEntity) return null;
    return this.toDomain(documentTypeEntity);
  }

  async findAll(): Promise<DocumentType[]> {
    const documentTypeEntities = await this.repository.find({
      order: { name: 'ASC' },
    });
    return documentTypeEntities.map(entity => this.toDomain(entity));
  }

  async save(documentType: DocumentType): Promise<DocumentType> {
    const documentTypeEntity = this.toEntity(documentType);
    const savedEntity = await this.repository.save(documentTypeEntity);
    return this.toDomain(savedEntity);
  }

  async update(documentType: DocumentType): Promise<DocumentType> {
    const documentTypeEntity = this.toEntity(documentType);
    await this.repository.update(documentType.id, documentTypeEntity);
    const updatedEntity = await this.repository.findOne({ where: { id: documentType.id } });
    return this.toDomain(updatedEntity!);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async findByName(name: string): Promise<DocumentType | null> {
    const documentTypeEntity = await this.repository.findOne({ where: { name } });
    if (!documentTypeEntity) return null;
    return this.toDomain(documentTypeEntity);
  }

  async existsByName(name: string): Promise<boolean> {
    const count = await this.repository.count({ where: { name } });
    return count > 0;
  }

  private toDomain(entity: DocumentTypeEntity): DocumentType {
    const props: DocumentTypeProps = {
      id: entity.id,
      name: entity.name,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
    return DocumentType.create(props);
  }

  private toEntity(documentType: DocumentType): Partial<DocumentTypeEntity> {
    return {
      id: documentType.id,
      name: documentType.name,
      createdAt: documentType.createdAt,
      updatedAt: documentType.updatedAt,
    };
  }
}
