import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import FileUtils from '@shared/utils/FileUtils';
import { TypeOrmFileRepository } from '@shared/infrastructure/repositories/typeorm-file.repository';
import { TypeOrmBulkUploadTemplateRepository } from '@shared/infrastructure/repositories/typeorm-bulk-upload-template.repository';
import { ManageBulkTemplateUseCase } from '@domains/bulk-template/use-cases/manage-bulk-template.use-case';
import { BulkLoadColaboratorsUseCase } from '@domains/bulk-template/use-cases/bulk-load-colaborators.use-case';
import { BulkTemplateType } from '@domains/bulk-template/value-objects/bulk-template-type';
import { File } from '@domains/file/entities/file.entity';
import { NotFoundError, ValidationError, ServerError } from '@shared/domain/errors';
import { Bucket } from '@shared/utils/Bucket';

const STORAGE = (process.env.FILE_STORAGE || 'local').toLowerCase();

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];
const ALLOWED_MIMES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/csv',
];

export class BulkTemplateController {
  constructor(
    private readonly manageBulkTemplateUseCase: ManageBulkTemplateUseCase,
    private readonly fileRepository: TypeOrmFileRepository,
    private readonly bulkUploadTemplateRepository: TypeOrmBulkUploadTemplateRepository,
    private readonly bulkLoadColaboratorsUseCase: BulkLoadColaboratorsUseCase,
  ) {
    this.uploadTemplate = this.uploadTemplate.bind(this);
    this.getActiveTemplate = this.getActiveTemplate.bind(this);
    this.downloadTemplate = this.downloadTemplate.bind(this);
    this.getTemplateHistory = this.getTemplateHistory.bind(this);
    this.bulkLoad = this.bulkLoad.bind(this);
  }

  async uploadTemplate(req: Request, res: Response): Promise<void> {
    const { filename, contentBase64, mimeType, size } = req.body as {
      filename?: string;
      contentBase64?: string;
      mimeType?: string;
      size?: number;
    };

    if (!filename || !contentBase64) {
      throw new ValidationError('file required', { fields: ['filename', 'contentBase64'] });
    }

    const ext = path.extname(filename).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new ValidationError(`Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
    }

    if (mimeType && !ALLOWED_MIMES.includes(mimeType)) {
      throw new ValidationError(`Invalid file type. Allowed: ${ALLOWED_MIMES.join(', ')}`);
    }

    const result = await FileUtils.save(contentBase64, filename, { subfolder: 'bulk-templates' });
    const { path: localPath, filename: uniqueName, size: fileSize } = result;

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

      try {
        const s3Key = `bulk-templates/${uniqueName}`;
        await bucket.uploadFile({ source: localPath, target: s3Key });
        storage = 's3';
        filePath = s3Key;
        await FileUtils.delete(localPath);
      } catch (error) {
        console.error('Error uploading to S3:', error);
        throw error;
      }
    }

    const file = new File({
      originalName: path.basename(filename),
      path: filePath,
      storage,
      mimeType,
      size: size || fileSize,
    });

    const savedFile = await this.fileRepository.save(file);

    const template = await this.manageBulkTemplateUseCase.save({
      type: BulkTemplateType.COLABORATORS,
      fileId: savedFile.id,
      uploadedBy: req.auth.user?.id || 'system',
    });

    res.status(201).json({
      success: true,
      data: {
        ...template.toJSON(),
        file: savedFile.toJSON(),
      },
    });
  }

  async getActiveTemplate(req: Request, res: Response): Promise<void> {
    const template = await this.manageBulkTemplateUseCase.getActive(BulkTemplateType.COLABORATORS);
    const file = await this.fileRepository.findById(template.fileId);

    if (!file) throw new NotFoundError('Template file');

    res.status(200).json({
      success: true,
      data: {
        ...template.toJSON(),
        file: file.toJSON(),
      },
    });
  }

  async downloadTemplate(req: Request, res: Response): Promise<void> {
    const template = await this.manageBulkTemplateUseCase.getActive(BulkTemplateType.COLABORATORS);
    const file = await this.fileRepository.findById(template.fileId);

    if (!file) throw new NotFoundError('Template file');

    try {
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

        const tempDir = FileUtils.buildPath('temp');
        await fs.promises.mkdir(tempDir, { recursive: true });
        const tempPath = path.join(tempDir, file.id);

        const s3Buffer = await bucket.downloadFile({ source: file.path });
        await fs.promises.writeFile(tempPath, s3Buffer);

        res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);

        const fileStream = fs.createReadStream(tempPath);
        fileStream.pipe(res);

        fileStream.on('end', async () => {
          try {
            await FileUtils.delete(tempPath);
          } catch (error) {
            console.error('Error deleting temp file:', error);
          }
        });
      } else {
        if (!fs.existsSync(file.path)) throw new NotFoundError('Local file');

        res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);

        const fileStream = fs.createReadStream(file.path);
        fileStream.pipe(res);
      }
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      console.error('Error downloading template:', error);
      throw new ServerError('Error downloading template');
    }
  }

  async getTemplateHistory(req: Request, res: Response): Promise<void> {
    const templates = await this.manageBulkTemplateUseCase.getHistory(BulkTemplateType.COLABORATORS);

    const templatesWithFiles = await Promise.all(
      templates.map(async (template) => {
        const file = await this.fileRepository.findById(template.fileId);
        return {
          ...template.toJSON(),
          file: file ? file.toJSON() : null,
        };
      }),
    );

    res.status(200).json({ success: true, data: templatesWithFiles });
  }

  async bulkLoad(req: Request, res: Response): Promise<void> {
    const { contentBase64, filename, mimeType, contractId, createUsers } = req.body as {
      contentBase64?: string;
      filename?: string;
      mimeType?: string;
      contractId?: string;
      createUsers?: boolean;
    };

    if (!contentBase64 || !filename) {
      throw new ValidationError('contentBase64 and filename are required', { fields: ['contentBase64', 'filename'] });
    }
    if (!contractId) {
      throw new ValidationError('contractId is required', { fields: ['contractId'] });
    }

    const result = await this.bulkLoadColaboratorsUseCase.execute({
      contentBase64,
      filename,
      mimeType,
      contractId,
      createUsers: !!createUsers,
      uploadedBy: req.auth.user?.id || 'system',
      userGroupId: req.auth.groupId,
    });

    res.status(200).json({ success: true, data: result });
  }
}
