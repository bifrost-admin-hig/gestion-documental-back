import { File } from '@domains/file/entities/file.entity';
import { FileShare } from '../entities/file-share.entity';
import { FileShareRepository } from '../repositories/file-share.repository';
import { TypeOrmFileRepository } from '@shared/infrastructure/repositories/typeorm-file.repository';
import { NotFoundError } from '@shared/domain/errors';

export class GetFileByShareTokenUseCase {
  constructor(
    private readonly fileShareRepository: FileShareRepository,
    private readonly fileRepository: TypeOrmFileRepository,
  ) {}

  async execute(
    token: string,
    options?: { incrementAccess?: boolean },
  ): Promise<{ fileShare: FileShare; file: File }> {
    const fileShare = await this.fileShareRepository.findByToken(token);
    if (!fileShare || !fileShare.isValid()) {
      throw new NotFoundError('Enlace compartido', token);
    }

    const file = await this.fileRepository.findById(fileShare.fileId);
    if (!file) throw new NotFoundError('Archivo', fileShare.fileId);

    if (options?.incrementAccess) {
      await this.fileShareRepository.incrementAccessCount(fileShare.id);
    }

    return { fileShare, file };
  }
}
