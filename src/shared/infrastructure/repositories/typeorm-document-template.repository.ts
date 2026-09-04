import { IsNull, Repository } from 'typeorm';
import { IDocumentTemplateRepository } from '@domains/document-template/repositories/document-template.repository.interface';
import { DocumentTemplate, DocumentTemplateField } from '@domains/document-template/entities/document-template.entity';
import { DocumentTemplateEntity } from '../database/entities/document-template.entity';
import { AppDataSource } from '../database/typeorm.config';
import { NotFoundError, ServerError, ValidationError } from '@shared/domain/errors';

const LOCKABLE_DB_TYPES = new Set(['mysql', 'mariadb']);

export class TypeOrmDocumentTemplateRepository implements IDocumentTemplateRepository {
  private repository: Repository<DocumentTemplateEntity>;

  constructor() {
    this.repository = AppDataSource.getRepository(DocumentTemplateEntity);
  }

  async save(template: DocumentTemplate): Promise<DocumentTemplate> {
    const entity = this.toEntity(template);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async createWithCode(template: DocumentTemplate, requestedCode?: string): Promise<DocumentTemplate> {
    return AppDataSource.transaction(async manager => {
      // Serializa la creación de plantillas del mismo grupo para evitar que dos
      // creaciones concurrentes calculen/reserven el mismo code (no hay constraint
      // único en la DB para permitir reutilizar el code de plantillas eliminadas).
      const dbType = AppDataSource.options.type;
      if (LOCKABLE_DB_TYPES.has(dbType)) {
        await manager.query('SELECT `id` FROM `groups` WHERE `id` = ? FOR UPDATE', [template.groupId]);
      }

      const repo = manager.getRepository(DocumentTemplateEntity);
      const trimmedCode = requestedCode?.trim();
      const code = trimmedCode
        ? await this.assertCodeAvailable(repo, trimmedCode, template.groupId)
        : await this.computeNextCode(repo, template.groupId);

      const entity = this.toEntity(template);
      entity.code = code;
      const saved = await repo.save(entity);
      return this.toDomain(saved);
    });
  }

  async findById(id: string): Promise<DocumentTemplate | null> {
    const entity = await this.repository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!entity) return null;
    return this.toDomain(entity);
  }

  async findAll(groupId?: number): Promise<DocumentTemplate[]> {
    const qb = this.repository
      .createQueryBuilder('dt')
      .innerJoin(
        qb2 => qb2
          .select('sub.code', 'code')
          .addSelect('MAX(sub.version)', 'maxVersion')
          .from(DocumentTemplateEntity, 'sub')
          .where('sub.deleted_at IS NULL')
          .groupBy('sub.code'),
        'latest',
        'latest.code = dt.code AND latest.maxVersion = dt.version',
      )
      .where('dt.deletedAt IS NULL')
      .orderBy('dt.code', 'ASC');

    if (groupId) {
      qb.andWhere('dt.groupId = :groupId', { groupId });
    }

    const entities = await qb.getMany();
    return entities.map(e => this.toDomain(e));
  }

  async findByCode(code: string): Promise<DocumentTemplate[]> {
    const entities = await this.repository.find({
      where: { code, deletedAt: IsNull() },
      order: { version: 'DESC' },
    });
    return entities.map(e => this.toDomain(e));
  }

  async findLatestByCode(code: string, groupId: number): Promise<DocumentTemplate | null> {
    const entity = await this.repository.findOne({
      where: { code, groupId, deletedAt: IsNull() },
      order: { version: 'DESC' },
    });
    if (!entity) return null;
    return this.toDomain(entity);
  }

  async delete(id: string): Promise<void> {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) throw new NotFoundError('Plantilla de documento no encontrada');
    await this.repository.softDelete(id);
  }

  /** Sugerencia de próximo code para el grupo. No reserva nada: el code final se resuelve
   *  de forma atómica dentro de `createWithCode` al momento de guardar. */
  async getNextCode(groupId: number): Promise<string> {
    return this.computeNextCode(this.repository, groupId);
  }

  private async assertCodeAvailable(
    repo: Repository<DocumentTemplateEntity>,
    code: string,
    groupId: number,
  ): Promise<string> {
    const conflict = await repo.findOne({ where: { code, groupId, deletedAt: IsNull() } });
    if (conflict) {
      throw new ValidationError(`El código "${code}" ya está en uso en este grupo`, 'code');
    }
    return code;
  }

  private async computeNextCode(repo: Repository<DocumentTemplateEntity>, groupId: number): Promise<string> {
    const result = await repo
      .createQueryBuilder('dt')
      .select('MAX(dt.code)', 'maxCode')
      .where('dt.groupId = :groupId', { groupId })
      .andWhere('dt.deletedAt IS NULL')
      .getRawOne<{ maxCode: string | null }>();

    const maxCode = result?.maxCode;
    let nextNum = 1;

    if (maxCode) {
      const match = maxCode.match(/^DOC-(\d+)$/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }

    return `DOC-${String(nextNum).padStart(5, '0')}`;
  }

  private toEntity(domain: DocumentTemplate): DocumentTemplateEntity {
    const entity = new DocumentTemplateEntity();
    entity.id = domain.id;
    entity.code = domain.code;
    entity.title = domain.title;
    entity.version = domain.version;
    entity.documentDate = domain.documentDate;
    entity.description = domain.description ?? undefined;
    entity.fileUrl = domain.fileUrl ?? undefined;
    entity.groupId = domain.groupId;
    entity.fieldsJson = domain.fields.length > 0 ? JSON.stringify(domain.fields) : undefined;
    entity.createdBy = domain.createdBy ?? undefined;
    return entity;
  }

  private toDomain(entity: DocumentTemplateEntity): DocumentTemplate {
    let fields: DocumentTemplateField[] = [];
    if (entity.fieldsJson) {
      try {
        fields = JSON.parse(entity.fieldsJson) as DocumentTemplateField[];
      } catch (error) {
        throw new ServerError(`fieldsJson corrupto para plantilla ${entity.id}: ${(error as Error).message}`);
      }
    }

    return DocumentTemplate.create({
      id: entity.id,
      code: entity.code,
      title: entity.title,
      version: entity.version,
      documentDate: entity.documentDate,
      description: entity.description,
      fileUrl: entity.fileUrl,
      groupId: entity.groupId,
      fields,
      createdBy: entity.createdBy,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt ?? null,
    });
  }
}
