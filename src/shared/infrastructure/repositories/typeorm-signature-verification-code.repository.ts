import { Repository, IsNull } from 'typeorm';
import { type SignatureVerificationCodeRepository } from '@domains/signature/repositories/signature-verification-code.repository';
import { SignatureVerificationCode, type SignatureVerificationCodeProps } from '@domains/signature/entities/signature-verification-code.entity';
import { SignatureVerificationCodeEntity } from '../database/entities/signature-verification-code.entity';
import { AppDataSource } from '../database/typeorm.config';

export class TypeOrmSignatureVerificationCodeRepository implements SignatureVerificationCodeRepository {
  private repository: Repository<SignatureVerificationCodeEntity>;

  constructor() {
    this.repository = AppDataSource.getRepository(SignatureVerificationCodeEntity);
  }

  async findById(id: string): Promise<SignatureVerificationCode | null> {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) return null;
    return this.toDomain(entity);
  }

  async findBySignatureId(signatureId: string): Promise<SignatureVerificationCode[]> {
    const entities = await this.repository.find({
      where: { signatureId },
      order: { createdAt: 'DESC' },
    });
    return entities.map(e => this.toDomain(e));
  }

  /**
   * Retorna el código de verificación activo (no usado) más reciente para la firma.
   */
  async findActiveBySignatureId(signatureId: string): Promise<SignatureVerificationCode | null> {
    const entity = await this.repository.findOne({
      where: { signatureId, usedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    if (!entity) return null;
    return this.toDomain(entity);
  }

  async save(code: SignatureVerificationCode): Promise<SignatureVerificationCode> {
    const entity = this.toEntity(code);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async update(code: SignatureVerificationCode): Promise<SignatureVerificationCode> {
    const entity = this.toEntity(code);
    await this.repository.update(code.id, entity);
    const updated = await this.repository.findOneOrFail({ where: { id: code.id } });
    return this.toDomain(updated);
  }

  private toDomain(entity: SignatureVerificationCodeEntity): SignatureVerificationCode {
    const props: SignatureVerificationCodeProps = {
      id: entity.id,
      signatureId: entity.signatureId,
      codeHash: entity.codeHash,
      attempts: entity.attempts,
      maxAttempts: entity.maxAttempts,
      expiresAt: entity.expiresAt,
      usedAt: entity.usedAt ?? null,
      createdAt: entity.createdAt,
    };
    return SignatureVerificationCode.create(props);
  }

  private toEntity(code: SignatureVerificationCode): Partial<SignatureVerificationCodeEntity> {
    return {
      id: code.id,
      signatureId: code.signatureId,
      codeHash: code.codeHash,
      attempts: code.attempts,
      maxAttempts: code.maxAttempts,
      expiresAt: code.expiresAt,
      usedAt: code.usedAt ?? undefined,
      createdAt: code.createdAt,
    };
  }
}
