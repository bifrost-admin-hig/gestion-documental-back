import { Repository } from 'typeorm';
import { type SignatureRepository } from '@domains/signature/repositories/signature.repository';
import { Signature, type SignatureProps } from '@domains/signature/entities/signature.entity';
import { SignatureEntity } from '../database/entities/signature.entity';
import { AppDataSource } from '../database/typeorm.config';

export class TypeOrmSignatureRepository implements SignatureRepository {
  private repository: Repository<SignatureEntity>;

  constructor() {
    this.repository = AppDataSource.getRepository(SignatureEntity);
  }

  async findById(id: string): Promise<Signature | null> {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) return null;
    return this.toDomain(entity);
  }

  async findByDocumentId(documentId: string): Promise<Signature[]> {
    const entities = await this.repository.find({
      where: { documentId },
      order: { createdAt: 'DESC' },
    });
    return entities.map(e => this.toDomain(e));
  }

  async findLatestByDocumentId(documentId: string): Promise<Signature | null> {
    const entity = await this.repository.findOne({
      where: { documentId },
      order: { createdAt: 'DESC' },
    });
    if (!entity) return null;
    return this.toDomain(entity);
  }

  async findByTokenHash(tokenHash: string): Promise<Signature | null> {
    const entity = await this.repository.findOne({ where: { tokenHash } });
    if (!entity) return null;
    return this.toDomain(entity);
  }

  async findByDocumentIdAndTokenHash(documentId: string, tokenHash: string): Promise<Signature | null> {
    const entity = await this.repository.findOne({ where: { documentId, tokenHash } });
    if (!entity) return null;
    return this.toDomain(entity);
  }

  async save(signature: Signature): Promise<Signature> {
    const entity = this.toEntity(signature);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async update(signature: Signature): Promise<Signature> {
    const entity = this.toEntity(signature);
    await this.repository.update(signature.id, entity);
    const updated = await this.repository.findOneOrFail({ where: { id: signature.id } });
    return this.toDomain(updated);
  }

  private toDomain(entity: SignatureEntity): Signature {
    const props: SignatureProps = {
      id: entity.id,
      documentId: entity.documentId,
      userId: entity.userId,
      signatureType: entity.signatureType,
      signatureMethod: entity.signatureMethod,
      status: entity.status,
      tokenHash: entity.tokenHash ?? null,
      ipAddress: entity.ipAddress ?? null,
      signerTimezone: entity.signerTimezone ?? null,
      signatureImageFileId: entity.signatureImageFileId ?? null,
      rejectionReason: entity.rejectionReason ?? null,
      rejectionCode: entity.rejectionCode ?? null,
      signedAt: entity.signedAt ?? null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
    return Signature.create(props);
  }

  private toEntity(signature: Signature): Partial<SignatureEntity> {
    return {
      id: signature.id,
      documentId: signature.documentId,
      userId: signature.userId,
      signatureType: signature.signatureType,
      signatureMethod: signature.signatureMethod,
      status: signature.status,
      tokenHash: signature.tokenHash ?? undefined,
      ipAddress: signature.ipAddress ?? undefined,
      signerTimezone: signature.signerTimezone ?? undefined,
      signatureImageFileId: signature.signatureImageFileId ?? undefined,
      rejectionReason: signature.rejectionReason ?? undefined,
      rejectionCode: signature.rejectionCode ?? undefined,
      signedAt: signature.signedAt ?? undefined,
      createdAt: signature.createdAt,
      updatedAt: signature.updatedAt,
    };
  }
}
