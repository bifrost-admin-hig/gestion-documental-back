import { Repository } from 'typeorm';
import { type UserSignatureRepository } from '@domains/signature/repositories/user-signature.repository';
import { UserSignature, type UserSignatureProps } from '@domains/signature/entities/user-signature.entity';
import { UserSignatureEntity } from '../database/entities/user-signature.entity';
import { AppDataSource } from '../database/typeorm.config';

export class TypeOrmUserSignatureRepository implements UserSignatureRepository {
  private repository: Repository<UserSignatureEntity>;

  constructor() {
    this.repository = AppDataSource.getRepository(UserSignatureEntity);
  }

  async findByUserId(userId: string): Promise<UserSignature | null> {
    const entity = await this.repository.findOne({ where: { userId } });
    if (!entity) return null;
    return this.toDomain(entity);
  }

  async findByColaboratorId(colaboratorId: string): Promise<UserSignature | null> {
    const entity = await this.repository.findOne({ where: { colaboratorId } });
    if (!entity) return null;
    return this.toDomain(entity);
  }

  async upsertForUser(userId: string, fileId: string): Promise<UserSignature> {
    const existing = await this.repository.findOne({ where: { userId } });
    const entity = existing
      ? this.repository.merge(existing, { fileId })
      : this.repository.create({ userId, fileId });
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async upsertForColaborator(colaboratorId: string, fileId: string): Promise<UserSignature> {
    const existing = await this.repository.findOne({ where: { colaboratorId } });
    const entity = existing
      ? this.repository.merge(existing, { fileId })
      : this.repository.create({ colaboratorId, fileId });
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  private toDomain(entity: UserSignatureEntity): UserSignature {
    const props: UserSignatureProps = {
      id: entity.id,
      userId: entity.userId ?? null,
      colaboratorId: entity.colaboratorId ?? null,
      fileId: entity.fileId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
    return UserSignature.create(props);
  }
}
