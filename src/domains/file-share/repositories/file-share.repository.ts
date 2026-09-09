import { FileShare } from '../entities/file-share.entity';

export interface FileShareRepository {
  save(fileShare: FileShare): Promise<FileShare>;
  findByToken(token: string): Promise<FileShare | null>;
  incrementAccessCount(id: string): Promise<void>;
}
