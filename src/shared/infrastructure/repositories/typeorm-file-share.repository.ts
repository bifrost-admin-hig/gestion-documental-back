import { Repository } from 'typeorm';
import { AppDataSource } from '@shared/infrastructure/database/typeorm.config';
import { FileShareEntity } from '@shared/infrastructure/database/entities/file-share.entity';
import { FileShare } from '@domains/file-share/entities/file-share.entity';
import { FileShareRepository } from '@domains/file-share/repositories/file-share.repository';

export class TypeOrmFileShareRepository implements FileShareRepository {
  private repository: Repository<FileShareEntity>;

  constructor() {
    this.repository = AppDataSource.getRepository(FileShareEntity);
  }

  async save(fileShare: FileShare): Promise<FileShare> {
    const entity = FileShareEntity.fromDomain(fileShare);
    const saved = await this.repository.save(entity);
    return FileShareEntity.toDomain(saved);
  }

  async findByToken(token: string): Promise<FileShare | null> {
    const entity = await this.repository.findOne({ where: { token } });
    if (!entity) return null;
    return FileShareEntity.toDomain(entity);
  }

  async incrementAccessCount(id: string): Promise<void> {
    await this.repository.increment({ id }, 'accessCount', 1);
  }
}
