import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { Bucket } from '@shared/utils/Bucket';
import FileUtils from '@shared/utils/FileUtils';
import { TypeOrmFileRepository } from '@shared/infrastructure/repositories/typeorm-file.repository';
import { NotFoundError, ServerError, ValidationError } from '@shared/domain/errors';

export class FileController {
  constructor(private readonly fileRepo: TypeOrmFileRepository) {
    this.upload = this.upload.bind(this);
    this.download = this.download.bind(this);
    this.preview = this.preview.bind(this);
    this.getFileById = this.getFileById.bind(this);
    this.delete = this.delete.bind(this);
  }

  async upload(req: Request, res: Response): Promise<void> {
    const { filename, contentBase64, mimeType, size } = req.body as {
      filename: string;
      contentBase64: string;
      mimeType?: string;
      size?: number;
    };

    if (!filename || !contentBase64) {
      throw new ValidationError('file required', { fields: ['filename', 'contentBase64'] });
    }

    const savedFile = await this.fileRepo.saveBuffer(Buffer.from(contentBase64, 'base64'), filename, mimeType, size);

    res.status(201).json({ success: true, data: savedFile });
  }

  async getFileById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    if (!id) throw new ValidationError('File ID is reqiuired', 'id');

    const file = await this.fileRepo.findById(id);

    if (!file) throw new NotFoundError('File');

    res.status(200).json({ success: true, data: file });
  }

  async download(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const includeDeleted = req.query.history === 'true';

    if (!id) throw new ValidationError('File ID is required', 'id');

    const file = includeDeleted
      ? await this.fileRepo.findByIdIncludingDeleted(id)
      : await this.fileRepo.findById(id);

    if (!file) throw new NotFoundError('File');

    try {
      if (file.storage === 's3') {
        // Download from S3
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

        // Generate a temporary local path
        const tempDir = FileUtils.buildPath('temp');
        await fs.promises.mkdir(tempDir, { recursive: true });
        const tempPath = path.join(tempDir, file.id);

        // Download from S3 to temp location
        const s3Buffer = await bucket.downloadFile({ source: file.path });
        await fs.promises.writeFile(tempPath, s3Buffer);

        // Send file
        res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);

        const fileStream = fs.createReadStream(tempPath);
        fileStream.pipe(res);

        // Delete temp file after sending
        fileStream.on('end', async () => {
          try {
            await FileUtils.delete(tempPath);
          } catch (error) {
            console.error('Error deleting temp file:', error);
          }
        });
      } else {
        // Download from local storage
        if (!fs.existsSync(file.path)) throw new NotFoundError('Local file');

        res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);

        const fileStream = fs.createReadStream(file.path);
        fileStream.pipe(res);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      throw new ServerError('Error downloading file');
    }
  }

  async preview(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const includeDeleted = req.query.history === 'true';

    if (!id) throw new ValidationError('File ID is required', 'id');

    const file = includeDeleted
      ? await this.fileRepo.findByIdIncludingDeleted(id)
      : await this.fileRepo.findById(id);

    if (!file) throw new NotFoundError('File');

    try {
      if (file.storage === 's3') {
        // Download from S3
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

        // Generate a temporary local path
        const tempDir = FileUtils.buildPath('temp');
        await fs.promises.mkdir(tempDir, { recursive: true });
        const tempPath = path.join(tempDir, file.id);

        // Download from S3 to temp location
        const s3Buffer = await bucket.downloadFile({ source: file.path });
        await fs.promises.writeFile(tempPath, s3Buffer);

        // Send file for preview (inline instead of attachment)
        res.setHeader('Content-Type', file.mimeType || 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.originalName)}"`);

        const fileStream = fs.createReadStream(tempPath);
        fileStream.pipe(res);

        // Delete temp file after sending
        fileStream.on('end', async () => {
          try {
            await FileUtils.delete(tempPath);
          } catch (error) {
            console.error('Error deleting temp file:', error);
          }
        });
      } else {
        // Preview from local storage
        if (!fs.existsSync(file.path)) throw new NotFoundError('Local file');

        res.setHeader('Content-Type', file.mimeType || 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.originalName)}"`);

        const fileStream = fs.createReadStream(file.path);
        fileStream.pipe(res);
      }
    } catch (error) {
      console.error('Error previewing file:', error);
      throw new ServerError('Error previewing file');
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    if (!id) throw new ValidationError('File ID is required', 'id');

    const file = await this.fileRepo.findById(id);

    if (!file) throw new NotFoundError('File');

    try {
      // Soft delete in database
      await this.fileRepo.softDelete(id);

      // Tag file as deleted in S3 if applicable
      if (file.storage === 's3') {
        const bucketName = process.env.AWS_S3_BUCKET;
        const region = process.env.AWS_DEFAULT_REGION;
        const accessKeyId = process.env.AWS_S3_ACCESS_KEY_ID;
        const secretAccessKey = process.env.AWS_S3_SECRET_ACCESS_KEY;

        if (bucketName && region && accessKeyId && secretAccessKey) {
          const bucket = new Bucket({
            bucket: bucketName,
            region,
            credentials: { accessKeyId, secretAccessKey },
          });

          try {
            await bucket.tagAsDeleted(file.path);
          } catch (error) {
            console.error('Error tagging file in S3:', error);
          }
        }
      }

      res.status(200).json({
        success: true,
        message: 'Archivo eliminado exitosamente',
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new ServerError('Error deleting file');
    }
  }
}
