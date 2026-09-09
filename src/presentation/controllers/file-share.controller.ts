import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { Bucket } from '@shared/utils/Bucket';
import FileUtils from '@shared/utils/FileUtils';
import { CreateFileShareUseCase } from '@domains/file-share/use-cases/create-file-share.use-case';
import { GetFileByShareTokenUseCase } from '@domains/file-share/use-cases/get-file-by-share-token.use-case';
import { NotFoundError, ServerError, ValidationError } from '@shared/domain/errors';

export class FileShareController {
  constructor(
    private readonly createFileShareUseCase: CreateFileShareUseCase,
    private readonly getFileByShareTokenUseCase: GetFileByShareTokenUseCase,
  ) {
    this.create = this.create.bind(this);
    this.getInfo = this.getInfo.bind(this);
    this.preview = this.preview.bind(this);
    this.download = this.download.bind(this);
  }

  async create(req: Request, res: Response): Promise<void> {
    const { id: fileId } = req.params;
    if (!fileId) throw new ValidationError('File ID is required', 'id');

    const createdBy = req.auth?.user?.id ?? 'system';
    const fileShare = await this.createFileShareUseCase.execute(fileId, createdBy);

    res.status(201).json({ success: true, data: fileShare });
  }

  async getInfo(req: Request, res: Response): Promise<void> {
    const { token } = req.params;
    if (!token) throw new ValidationError('Token is required', 'token');

    const { fileShare, file } = await this.getFileByShareTokenUseCase.execute(token);

    res.status(200).json({
      success: true,
      data: {
        id: fileShare.id,
        expiresAt: fileShare.expiresAt,
        originalName: file.originalName,
        mimeType: file.mimeType,
      },
    });
  }

  async preview(req: Request, res: Response): Promise<void> {
    const { token } = req.params;
    if (!token) throw new ValidationError('Token is required', 'token');

    const { file } = await this.getFileByShareTokenUseCase.execute(token, {
      incrementAccess: true,
    });

    try {
      if (file.storage === 's3') {
        const s3Buffer = await this.downloadFromS3(file.path);
        res.setHeader('Content-Type', file.mimeType || 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.originalName)}"`);
        res.send(s3Buffer);
      } else {
        if (!fs.existsSync(file.path)) throw new NotFoundError('Local file');
        res.setHeader('Content-Type', file.mimeType || 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.originalName)}"`);
        const fileStream = fs.createReadStream(file.path);
        fileStream.pipe(res);
      }
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new ServerError('Error loading file preview');
    }
  }

  async download(req: Request, res: Response): Promise<void> {
    const { token } = req.params;
    if (!token) throw new ValidationError('Token is required', 'token');

    const { file } = await this.getFileByShareTokenUseCase.execute(token, {
      incrementAccess: true,
    });

    try {
      if (file.storage === 's3') {
        const s3Buffer = await this.downloadFromS3(file.path);
        res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
        res.send(s3Buffer);
      } else {
        if (!fs.existsSync(file.path)) throw new NotFoundError('Local file');
        res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
        const fileStream = fs.createReadStream(file.path);
        fileStream.pipe(res);
      }
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new ServerError('Error downloading file');
    }
  }

  private async downloadFromS3(filePath: string): Promise<Buffer> {
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

    const tempDir = FileUtils.buildPath('temp');
    await fs.promises.mkdir(tempDir, { recursive: true });
    const tempPath = path.join(tempDir, `share-${Date.now()}`);

    const s3Buffer = await bucket.downloadFile({ source: filePath });
    await fs.promises.writeFile(tempPath, s3Buffer);

    const data = await fs.promises.readFile(tempPath);
    await FileUtils.delete(tempPath).catch(() => {});
    return data;
  }
}
