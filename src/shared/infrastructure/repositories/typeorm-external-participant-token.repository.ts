import { Repository } from 'typeorm';
import { ExternalParticipantToken, ExternalParticipantTokenProps } from '@domains/signature-flow/entities/external-participant-token.entity';
import { ExternalParticipantTokenRepository } from '@domains/signature-flow/repositories/external-participant-token.repository';
import { ExternalParticipantTokenEntity } from '../database/entities/external-participant-token.entity';
import { AppDataSource } from '../database/typeorm.config';

export class TypeOrmExternalParticipantTokenRepository implements ExternalParticipantTokenRepository {
  private repository: Repository<ExternalParticipantTokenEntity>;

  constructor() {
    this.repository = AppDataSource.getRepository(ExternalParticipantTokenEntity);
  }

  async findByToken(token: string): Promise<ExternalParticipantToken | null> {
    const entity = await this.repository.findOne({ where: { token } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByParticipantId(participantId: string): Promise<ExternalParticipantToken | null> {
    const entity = await this.repository.findOne({ where: { participantId } });
    return entity ? this.toDomain(entity) : null;
  }

  async save(token: ExternalParticipantToken): Promise<ExternalParticipantToken> {
    const entity = this.toEntity(token);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async update(token: ExternalParticipantToken): Promise<ExternalParticipantToken> {
    const entity = this.toEntity(token);
    await this.repository.update(token.id, entity);
    const updated = await this.repository.findOneOrFail({ where: { id: token.id } });
    return this.toDomain(updated);
  }

  async deleteByParticipantId(participantId: string): Promise<void> {
    await this.repository.delete({ participantId });
  }

  private toDomain(entity: ExternalParticipantTokenEntity): ExternalParticipantToken {
    const props: ExternalParticipantTokenProps = {
      id: entity.id,
      participantId: entity.participantId,
      token: entity.token,
      expiresAt: entity.expiresAt,
      otpHash: entity.otpHash ?? null,
      otpExpiresAt: entity.otpExpiresAt ?? null,
      otpAttempts: entity.otpAttempts,
      otpMethod: entity.otpMethod ?? null,
      usedAt: entity.usedAt ?? null,
      signatureTokenHash: entity.signatureTokenHash ?? null,
      ipAddress: entity.ipAddress ?? null,
      documentNumber: entity.documentNumber ?? null,
      timezone: entity.timezone ?? null,
      signatureImageFileId: entity.signatureImageFileId ?? null,
      createdAt: entity.createdAt,
    };
    return ExternalParticipantToken.create(props);
  }

  private toEntity(token: ExternalParticipantToken): Partial<ExternalParticipantTokenEntity> {
    return {
      id: token.id,
      participantId: token.participantId,
      token: token.token,
      expiresAt: token.expiresAt,
      otpHash: token.otpHash ?? undefined,
      otpExpiresAt: token.otpExpiresAt ?? undefined,
      otpAttempts: token.otpAttempts,
      otpMethod: token.otpMethod ?? undefined,
      usedAt: token.usedAt ?? undefined,
      signatureTokenHash: token.signatureTokenHash ?? undefined,
      ipAddress: token.ipAddress ?? undefined,
      documentNumber: token.documentNumber ?? undefined,
      timezone: token.timezone ?? undefined,
      signatureImageFileId: token.signatureImageFileId ?? undefined,
    };
  }
}
