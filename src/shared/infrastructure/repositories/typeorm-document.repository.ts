import { Repository, LessThanOrEqual, In, IsNull, Not } from 'typeorm';
import { type DocumentRepository } from '@domains/document/repositories/document.repository';
import { Document, type DocumentProps } from '@domains/document/entities/document.entity';
import { DocumentStatus } from '@domains/document/value-objects/document-enums';
import { DocumentEntity } from '../database/entities/document.entity';
import { ColaboratorEntity } from '../database/entities/colaborators.entity';
import { AppDataSource } from '../database/typeorm.config';
import { DateUtils } from '@shared/utils/date';

export class TypeOrmDocumentRepository implements DocumentRepository {
  private repository: Repository<DocumentEntity>;

  constructor() {
    this.repository = AppDataSource.getRepository(DocumentEntity);
  }

  async findById(id: string): Promise<Document | null> {
    const documentEntity = await this.repository.findOne({
      where: { id },
      relations: [
        'contract',
        'documentModel',
        'documentModel.family',
        'documentModel.documentType',
        'documentModel.documentSubtype',
        'colaborators',
        'responsibleColaborator',
        'area',
      ],
    });
    if (!documentEntity) return null;
    return this.toDomain(documentEntity);
  }

  async findByIds(ids: string[]): Promise<Document[]> {
    if (ids.length === 0) return [];
    const documentEntities = await this.repository.find({
      where: { id: In(ids), deletedAt: IsNull() },
      relations: [
        'contract',
        'documentModel',
        'documentModel.family',
        'documentModel.documentType',
        'documentModel.documentSubtype',
        'colaborators',
      ],
    });
    return documentEntities.map(entity => this.toDomain(entity));
  }

  async findAll(groupId?: number, filters?: {
    contractId?: string;
    colaboratorId?: string;
    requiredForContract?: boolean;
    requiredForColaborator?: boolean;
    status?: DocumentStatus | DocumentStatus[];
  }): Promise<Document[]> {
    const query = this.repository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.contract', 'contract')
      .leftJoinAndSelect('document.documentModel', 'documentModel')
      .leftJoinAndSelect('documentModel.family', 'family')
      .leftJoinAndSelect('documentModel.documentType', 'documentType')
      .leftJoinAndSelect('documentModel.documentSubtype', 'documentSubtype')
      .leftJoinAndSelect('document.colaborators', 'colaborators')
      .leftJoinAndSelect('document.responsibleColaborator', 'responsibleColaborator')
      .leftJoinAndSelect('document.area', 'area')
      .where('document.deletedAt IS NULL');

    if (groupId !== undefined) {
      query.andWhere('document.groupId = :groupId', { groupId });
    }

    if (filters?.contractId) {
      query.andWhere('document.contractId = :contractId', { contractId: filters.contractId });
    }

    if (filters?.colaboratorId) {
      query.andWhere('colaborators.id = :colaboratorId', { colaboratorId: filters.colaboratorId });
    }

    if (filters?.requiredForContract !== undefined) {
      query.andWhere('documentModel.requiredForContract = :requiredForContract', { requiredForContract: filters.requiredForContract });
    }

    if (filters?.requiredForColaborator !== undefined) {
      query.andWhere('documentModel.requiredForColaborator = :requiredForColaborator', { requiredForColaborator: filters.requiredForColaborator });
    }

    if (filters?.status) {
      const status = Array.isArray(filters.status) ? filters.status : [filters.status];
      query.andWhere('document.status IN (:...status)', { status });
    } else {
      // Las versiones obsoletas (reemplazadas por una nueva) no deben circular por
      // error: se excluyen de los listados salvo que se pidan explícitamente por status.
      query.andWhere('document.status != :obsoleteStatus', { obsoleteStatus: DocumentStatus.OBSOLETE });
    }

    const documentEntities = await query.orderBy('document.createdAt', 'DESC').getMany();
    return documentEntities.map(entity => this.toDomain(entity));
  }

  async save(document: Document): Promise<Document> {
    const documentEntity = this.toEntity(document);
    const savedEntity = await this.repository.save(documentEntity as any);

    // Manejar la relación N:M con colaboradores
    if (document.colaboratorIds && document.colaboratorIds.length > 0) {
      const colaboratorRepository = AppDataSource.getRepository(ColaboratorEntity);
      const colaborators = await colaboratorRepository.find({
        where: { id: In(document.colaboratorIds) },
      });
      savedEntity.colaborators = colaborators;
      await this.repository.save(savedEntity);
    }

    return this.findById(savedEntity.id) as Promise<Document>;
  }

  async update(document: Document): Promise<Document> {
    const existing = await this.repository.findOneOrFail({ where: { id: document.id } });
    const documentEntity = this.toEntity(document);
    Object.assign(existing, documentEntity);

    await AppDataSource.transaction(async (manager) => {
      if (document.colaboratorIds && document.colaboratorIds.length > 0) {
        const colaborators = await manager.find(ColaboratorEntity, {
          where: { id: In(document.colaboratorIds) },
        });
        existing.colaborators = colaborators;
      } else {
        existing.colaborators = [];
      }
      await manager.save(existing);
    });

    return this.findById(document.id) as Promise<Document>;
  }

  async delete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }

  async findByContractId(contractId: string): Promise<Document[]> {
    const documentEntities = await this.repository.find({
      where: { contractId, deletedAt: IsNull(), status: Not(DocumentStatus.OBSOLETE) },
      relations: [
        'contract',
        'documentModel',
        'documentModel.family',
        'documentModel.documentType',
        'documentModel.documentSubtype',
        'colaborators',
        'responsibleColaborator',
        'area',
      ],
      order: { createdAt: 'DESC' },
    });
    return documentEntities.map(entity => this.toDomain(entity));
  }

  async findByDocumentModelId(documentModelId: string): Promise<Document[]> {
    const documentEntities = await this.repository.find({
      where: { documentModelId, deletedAt: IsNull(), status: Not(DocumentStatus.OBSOLETE) },
      relations: [
        'contract',
        'documentModel',
        'documentModel.family',
        'documentModel.documentType',
        'documentModel.documentSubtype',
        'colaborators',
        'responsibleColaborator',
        'area',
      ],
      order: { createdAt: 'DESC' },
    });
    return documentEntities.map(entity => this.toDomain(entity));
  }

  async findByColaboratorIds(colaboratorIds: string[]): Promise<Document[]> {
    if (colaboratorIds.length === 0) return [];
    const documentEntities = await this.repository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.colaborators', 'colaborators')
      .leftJoinAndSelect('document.responsibleColaborator', 'responsibleColaborator')
      .leftJoinAndSelect('document.area', 'area')
      .leftJoinAndSelect('document.contract', 'contract')
      .leftJoinAndSelect('document.documentModel', 'documentModel')
      .leftJoinAndSelect('documentModel.family', 'family')
      .leftJoinAndSelect('documentModel.documentType', 'documentType')
      .leftJoinAndSelect('documentModel.documentSubtype', 'documentSubtype')
      .where('colaborators.id IN (:...colaboratorIds)', { colaboratorIds })
      .andWhere('document.deletedAt IS NULL')
      .andWhere('document.status != :obsoleteStatus', { obsoleteStatus: DocumentStatus.OBSOLETE })
      .orderBy('document.createdAt', 'DESC')
      .getMany();
    return documentEntities.map(entity => this.toDomain(entity));
  }

  async findExpiredDocuments(): Promise<Document[]> {
    const documentEntities = await this.repository.find({
      where: {
        expirationDate: LessThanOrEqual(new Date()),
        deletedAt: IsNull(),
        status: Not(DocumentStatus.OBSOLETE),
      },
      relations: [
        'contract',
        'documentModel',
        'documentModel.family',
        'documentModel.documentType',
        'documentModel.documentSubtype',
        'colaborators',
        'responsibleColaborator',
        'area',
      ],
      order: { expirationDate: 'ASC' },
    });
    return documentEntities.map(entity => this.toDomain(entity));
  }

  async findExpiringDocuments(days: number): Promise<Document[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    const documentEntities = await this.repository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.contract', 'contract')
      .leftJoinAndSelect('document.documentModel', 'documentModel')
      .leftJoinAndSelect('documentModel.family', 'family')
      .leftJoinAndSelect('documentModel.documentType', 'documentType')
      .leftJoinAndSelect('documentModel.documentSubtype', 'documentSubtype')
      .leftJoinAndSelect('document.colaborators', 'colaborators')
      .leftJoinAndSelect('document.responsibleColaborator', 'responsibleColaborator')
      .leftJoinAndSelect('document.area', 'area')
      .where('document.expirationDate IS NOT NULL')
      .andWhere('document.expirationDate > :today', { today })
      .andWhere('document.expirationDate <= :futureDate', { futureDate })
      .andWhere('document.deletedAt IS NULL')
      .andWhere('document.status != :obsoleteStatus', { obsoleteStatus: DocumentStatus.OBSOLETE })
      .orderBy('document.expiration_date', 'ASC')
      .getMany();

    return documentEntities.map(entity => this.toDomain(entity));
  }

  async existsByModelAndColaborator(documentModelId: string, colaboratorIds: string[], name: string, excludeId?: string): Promise<boolean> {
    if (colaboratorIds.length === 0) return false;

    const count = colaboratorIds.length;
    const query = this.repository
      .createQueryBuilder('document')
      .where('document.documentModelId = :documentModelId', { documentModelId })
      .andWhere('document.name = :name', { name })
      .andWhere('document.deleted_at IS NULL')
      .andWhere('document.status != :obsoleteStatus', { obsoleteStatus: DocumentStatus.OBSOLETE })
      .andWhere(
        `(SELECT COUNT(*) FROM document_colaborators dc WHERE dc.document_id = document.id AND dc.colaborator_id IN (:...colaboratorIds)) = :count`,
        { colaboratorIds, count },
      )
      .andWhere(
        `(SELECT COUNT(*) FROM document_colaborators dc WHERE dc.document_id = document.id) = :count`,
        { count },
      );

    if (excludeId) {
      query.andWhere('document.id != :excludeId', { excludeId });
    }

    const existing = await query.getOne();
    return !!existing;
  }

  async existsByModelContractColaborator(
    documentModelId: string,
    contractId: string,
    colaboratorIds: string[],
    name: string,
    excludeId?: string,
  ): Promise<boolean> {
    if (colaboratorIds.length === 0) return false;

    const count = colaboratorIds.length;
    const query = this.repository
      .createQueryBuilder('document')
      .where('document.documentModelId = :documentModelId', { documentModelId })
      .andWhere('document.contract_id = :contractId', { contractId })
      .andWhere('document.name = :name', { name })
      .andWhere('document.deleted_at IS NULL')
      .andWhere('document.status != :obsoleteStatus', { obsoleteStatus: DocumentStatus.OBSOLETE })
      .andWhere(
        `(SELECT COUNT(*) FROM document_colaborators dc WHERE dc.document_id = document.id AND dc.colaborator_id IN (:...colaboratorIds)) = :count`,
        { colaboratorIds, count },
      )
      .andWhere(
        `(SELECT COUNT(*) FROM document_colaborators dc WHERE dc.document_id = document.id) = :count`,
        { count },
      );

    if (excludeId) {
      query.andWhere('document.id != :excludeId', { excludeId });
    }

    const existing = await query.getOne();
    return !!existing;
  }

  async existsByCode(code: string, groupId: number, excludeId?: string): Promise<boolean> {
    const query = this.repository
      .createQueryBuilder('document')
      .where('document.code = :code', { code })
      .andWhere('document.group_id = :groupId', { groupId })
      .andWhere('document.deleted_at IS NULL');

    if (excludeId) {
      query.andWhere('document.id != :excludeId', { excludeId });
    }

    const existing = await query.getOne();
    return !!existing;
  }

  async findByTypeAndSubtypeId(typeId: string, subtypeId: string): Promise<Document[]> {
    const documentEntities = await this.repository.find({
      relations: [
        'contract',
        'documentModel',
        'documentModel.family',
        'documentModel.documentType',
        'documentModel.documentSubtype',
        'colaborators',
        'responsibleColaborator',
        'area',
      ],
      where: {
        documentModel: {
          documentTypeId: typeId,
          documentSubtypeId: subtypeId,
        },
        deletedAt: IsNull(),
        status: Not(DocumentStatus.OBSOLETE),
      },
      order: { createdAt: 'DESC' },
    });
    return documentEntities.map(entity => this.toDomain(entity));
  }

  private toDomain(entity: DocumentEntity): Document {
    const colaboratorIds = entity.colaborators ? entity.colaborators.map(c => c.id) : [];
    const props: DocumentProps = {
      id: entity.id,
      documentModelId: entity.documentModelId || entity.documentModel?.id,
      colaboratorIds: colaboratorIds.length > 0 ? colaboratorIds : [],
      name: entity.name,
      issuedDate: entity.issuedDate,
      expirationDate: entity.expirationDate,
      contractId: entity.contractId,
      contractNumber: entity.contract?.contractNumber,
      contractProjectName: entity.contract?.nombreProyecto,
      description: entity.description,
      documentUrl: entity.documentUrl,
      status: entity.status,
      signatureStatus: entity.signatureStatus ?? null,
      preFlowStatus: entity.preFlowStatus ?? null,
      signatureFlowId: entity.signatureFlowId ?? null,
      previousVersionId: entity.previousVersionId ?? null,
      isSuperseded: entity.isSuperseded ?? false,
      code: entity.code ?? null,
      reviewDate: entity.reviewDate ?? null,
      responsibleColaboratorId: entity.responsibleColaboratorId ?? null,
      responsibleColaboratorName: entity.responsibleColaborator
        ? [entity.responsibleColaborator.nombre, entity.responsibleColaborator.apellidoPaterno, entity.responsibleColaborator.apellidoMaterno]
          .filter(Boolean).join(' ')
        : null,
      areaId: entity.areaId ?? null,
      areaName: entity.area?.name ?? null,
      comment: entity.comment,
      groupId: entity.groupId,
      requiredColaboratorsCount: entity.requiredColaboratorsCount,
      createdBy: entity.createdBy,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      templateId: entity.templateId,

      // Populate read-only props from Model
      familyId: entity.documentModel?.family?.id,
      familyName: entity.documentModel?.family?.name,
      documentTypeId: entity.documentModel?.documentType?.id,
      documentSubtypeId: entity.documentModel?.documentSubtype?.id,
      documentTypeName: entity.documentModel?.documentType?.name,
      documentSubtypeName: entity.documentModel?.documentSubtype?.name,
      requiredForContract: entity.documentModel?.requiredForContract,
      requiredForColaborator: entity.documentModel?.requiredForColaborator,
      requiredExpirationDate: entity.documentModel?.requiredExpirationDate,
    };
    return Document.create(props);
  }

  private toEntity(document: Document): Partial<DocumentEntity> {
    return {
      id: document.id,
      documentModelId: document.documentModelId,
      name: document.name,
      issuedDate: document.issuedDate ? DateUtils.toLocalDate(document.issuedDate)! : undefined,
      expirationDate: document.expirationDate ? DateUtils.toLocalDate(document.expirationDate) : undefined,
      contractId: document.contractId || undefined,
      description: document.description,
      documentUrl: document.documentUrl,
      status: document.status,
      signatureStatus: document.signatureStatus ?? undefined,
      // null explícito (no `?? undefined`): debe poder limpiarse tras restaurar el status pre-flujo
      preFlowStatus: document.preFlowStatus,
      signatureFlowId: document.signatureFlowId ?? undefined,
      previousVersionId: document.previousVersionId ?? undefined,
      isSuperseded: document.isSuperseded,
      code: document.code ?? undefined,
      reviewDate: document.reviewDate ? DateUtils.toLocalDate(document.reviewDate) : undefined,
      responsibleColaboratorId: document.responsibleColaboratorId ?? undefined,
      areaId: document.areaId ?? undefined,
      comment: document.comment || undefined,
      groupId: document.groupId,
      requiredColaboratorsCount: document.requiredColaboratorsCount,
      createdBy: document.createdBy || undefined,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      templateId: document.templateId || undefined,
    };
  }
}
