import fs from 'fs';
import path from 'path';
import { Repository, IsNull } from 'typeorm';
import { AppDataSource } from '@shared/infrastructure/database/typeorm.config';
import { FileEntity } from '@shared/infrastructure/database/entities/file.entity';
import { File } from '@domains/file/entities/file.entity';
import { Bucket } from '@shared/utils/Bucket';
import FileUtils from '@shared/utils/FileUtils';
import { ServerError } from '@shared/domain/errors';

const STORAGE = (process.env.FILE_STORAGE || 'local').toLowerCase();

export class TypeOrmFileRepository {
  private repository: Repository<FileEntity>;

  constructor() {
    this.repository = AppDataSource.getRepository(FileEntity);
  }

  /** Lee el contenido binario de un archivo, sea cual sea su storage (local o S3). */
  async getContent(file: File): Promise<Buffer> {
    if (file.storage === 's3') {
      const bucketName = process.env.AWS_S3_BUCKET;
      const region = process.env.AWS_DEFAULT_REGION;
      const accessKeyId = process.env.AWS_S3_ACCESS_KEY_ID;
      const secretAccessKey = process.env.AWS_S3_SECRET_ACCESS_KEY;

      if (!bucketName || !region || !accessKeyId || !secretAccessKey) {
        throw new ServerError('S3 configuration incomplete');
      }

      const bucket = new Bucket({
        bucket: bucketName,
        region,
        credentials: { accessKeyId, secretAccessKey },
      });

      return bucket.downloadFile({ source: file.path });
    }

    return fs.promises.readFile(file.path);
  }

  async save(file: File): Promise<File> {
    const entity = FileEntity.fromDomain(file);
    const saved = await this.repository.save(entity);
    return FileEntity.toDomain(saved);
  }

  /**
   * Guarda un buffer como archivo (local, o S3 si `FILE_STORAGE=s3`) y crea su registro `File`.
   * Misma lógica que usa `FileController.upload` para archivos subidos por el usuario.
   * `size` permite que el llamador declare un tamaño distinto al del buffer escrito
   * (ej: tamaño original antes de algún procesamiento); si no se indica, se usa el real.
   */
  async saveBuffer(buffer: Buffer, filename: string, mimeType?: string, size?: number): Promise<File> {
    const result = await FileUtils.save(buffer, filename);
    const { path: localPath, filename: uniqueName, size: actualSize } = result;

    let filePath = localPath;
    let storage: 'local' | 's3' = 'local';

    if (STORAGE === 's3') {
      const bucketName = process.env.AWS_S3_BUCKET;
      const region = process.env.AWS_DEFAULT_REGION;
      const accessKeyId = process.env.AWS_S3_ACCESS_KEY_ID;
      const secretAccessKey = process.env.AWS_S3_SECRET_ACCESS_KEY;

      if (!bucketName || !region || !accessKeyId || !secretAccessKey) {
        throw new ServerError('S3 configuration incomplete');
      }

      const bucket = new Bucket({
        bucket: bucketName,
        region,
        credentials: { accessKeyId, secretAccessKey },
      });

      const s3Key = `${FileUtils.getDateFolder()}/${uniqueName}`;
      await bucket.uploadFile({ source: localPath, target: s3Key });
      storage = 's3';
      filePath = s3Key;

      await FileUtils.delete(localPath);
    }

    const file = new File({
      originalName: path.basename(filename),
      path: filePath,
      storage,
      mimeType,
      size: size ?? actualSize,
    });

    return this.save(file);
  }

  async findById(id: string): Promise<File | null> {
    const entity = await this.repository.findOne({ where: { id, deletedAt: IsNull() } });
    if (!entity) return null;
    return FileEntity.toDomain(entity);
  }

  async findByIdIncludingDeleted(id: string): Promise<File | null> {
    const entity = await this.repository.findOne({ where: { id }, withDeleted: true });
    if (!entity) return null;
    return FileEntity.toDomain(entity);
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}

