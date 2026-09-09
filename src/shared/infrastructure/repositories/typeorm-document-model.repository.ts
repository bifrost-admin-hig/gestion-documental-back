import { Repository, IsNull } from 'typeorm';
import { type IDocumentModelRepository, type DocumentModelContractFilters } from '@domains/document-model/repositories/document-model.repository.interface';
import { DocumentModel, type DocumentModelProps } from '@domains/document-model/entities/document-model.entity';
import { DocumentModelEntity } from '../database/entities/document-model.entity';
import { AppDataSource } from '../database/typeorm.config';
import { NotFoundError } from '@shared/domain/errors';

export class TypeOrmDocumentModelRepository implements IDocumentModelRepository {
  private repository: Repository<DocumentModelEntity>;

  constructor() {
    this.repository = AppDataSource.getRepository(DocumentModelEntity);
  }

  async findAll(groupId?: number, familyId?: string): Promise<DocumentModel[]> {
    const where: any = { deletedAt: IsNull() };
    if (groupId) where.groupId = groupId;
    if (familyId) where.familyId = familyId;

    const entities = await this.repository.find({
      where,
      relations: ['documentType', 'documentSubtype'],
      order: { createdAt: 'DESC' },
    });
    return entities.map(entity => this.toDomain(entity));
  }

  async findById(id: string): Promise<DocumentModel | null> {
    const entity = await this.repository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['documentType', 'documentSubtype'],
    });
    if (!entity) return null;
    return this.toDomain(entity);
  }

  async findByFamilyId(familyId: string, groupId?: number): Promise<DocumentModel[]> {
    const where: any = { familyId, deletedAt: IsNull() };
    if (groupId) where.groupId = groupId;

    const entities = await this.repository.find({
      where,
      relations: ['documentType', 'documentSubtype'],
      order: { createdAt: 'DESC' },
    });
    return entities.map(entity => this.toDomain(entity));
  }

  async findByContractId(contractId: string, groupId: number, filters?: DocumentModelContractFilters): Promise<DocumentModel[]> {
    const qb = this.repository
      .createQueryBuilder('dm')
      .innerJoin('families', 'f', 'f.id = dm.family_id AND f.contract_id = :contractId AND f.deleted_at IS NULL', { contractId })
      .leftJoin('dm.documentType', 'dt')
      .leftJoin('dm.documentSubtype', 'dst')
      .addSelect(['f.id', 'f.name', 'dt.id', 'dt.name', 'dst.id', 'dst.name'])
      .where('dm.group_id = :groupId', { groupId })
      .andWhere('dm.required_for_contract = :req', { req: true })
      .andWhere('dm.deleted_at IS NULL');

    if (filters?.familyId) {
      qb.andWhere('dm.family_id = :familyId', { familyId: filters.familyId });
    }
    if (filters?.documentTypeId) {
      qb.andWhere('dm.document_type_id = :documentTypeId', { documentTypeId: filters.documentTypeId });
    }
    if (filters?.documentSubtypeId) {
      qb.andWhere('dm.document_subtype_id = :documentSubtypeId', { documentSubtypeId: filters.documentSubtypeId });
    }

    const rawAndEntities = await qb.getRawAndEntities();

    return rawAndEntities.entities.map((entity, idx) => {
      const raw = rawAndEntities.raw[idx];
      return this.toDomain(entity, raw?.f_name as string | undefined);
    });
  }

  async findByFamilyTypeSubtype(
    familyId: string,
    documentTypeId: string,
    documentSubtypeId: string,
    groupId?: number,
  ): Promise<DocumentModel | null> {
    const where: any = {
      familyId,
      documentTypeId,
      documentSubtypeId,
      deletedAt: IsNull(),
    };
    if (groupId) where.groupId = groupId;

    const entity = await this.repository.findOne({
      where,
      relations: ['documentType', 'documentSubtype'],
    });
    if (!entity) return null;
    return this.toDomain(entity);
  }

  async create(documentModel: DocumentModel): Promise<DocumentModel> {
    const entity = this.toEntity(documentModel) as DocumentModelEntity;
    const savedEntity = await this.repository.save(entity);
    const createdEntity = await this.repository.findOne({
      where: { id: savedEntity.id },
      relations: ['documentType', 'documentSubtype'],
    });
    return this.toDomain(createdEntity!);
  }

  async update(documentModel: DocumentModel): Promise<DocumentModel> {
    const entity = this.toEntity(documentModel);
    await this.repository.update(documentModel.id, entity);
    const updatedEntity = await this.repository.findOne({
      where: { id: documentModel.id },
      relations: ['documentType', 'documentSubtype'],
    });
    if (!updatedEntity) {
      throw new NotFoundError('Modelo de documento no encontrado');
    }
    return this.toDomain(updatedEntity);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }

  async restore(id: string): Promise<void> {
    await this.repository.restore(id);
  }

  private toDomain(entity: DocumentModelEntity, familyName?: string): DocumentModel {
    const props: DocumentModelProps = {
      id: entity.id,
      groupId: entity.groupId,
      familyId: entity.familyId,
      documentTypeId: entity.documentTypeId,
      documentSubtypeId: entity.documentSubtypeId,
      requiredForContract: entity.requiredForContract,
      requiredForColaborator: entity.requiredForColaborator,
      requiredExpirationDate: entity.requiredExpirationDate,
      requiresApproval: entity.requiresApproval,
      requiresSignature: entity.requiresSignature,
      familyName: familyName ?? entity.family?.name,
      documentTypeName: entity.documentType?.name,
      documentSubtypeName: entity.documentSubtype?.name,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt,
    };
    return DocumentModel.create(props);
  }

  private toEntity(documentModel: DocumentModel): Partial<DocumentModelEntity> {
    return {
      id: documentModel.id,
      groupId: documentModel.groupId,
      familyId: documentModel.familyId,
      documentTypeId: documentModel.documentTypeId,
      documentSubtypeId: documentModel.documentSubtypeId,
      requiredForContract: documentModel.requiredForContract,
      requiredForColaborator: documentModel.requiredForColaborator,
      requiredExpirationDate: documentModel.requiredExpirationDate,
      requiresApproval: documentModel.requiresApproval,
      requiresSignature: documentModel.requiresSignature,
      createdAt: documentModel.createdAt,
      updatedAt: documentModel.updatedAt,
      deletedAt: documentModel.deletedAt,
    };
  }
}
