import { Request, Response, NextFunction } from 'express';
import { GetExternalParticipantAccessUseCase } from '@domains/signature-flow/use-cases/external-participant-access.use-case';
import { SubmitExternalParticipantActionUseCase } from '@domains/signature-flow/use-cases/external-participant-access.use-case';
import { RequestExternalSignerOtpUseCase } from '@domains/signature-flow/use-cases/external-participant-access.use-case';
import { ValidateExternalSignerOtpUseCase } from '@domains/signature-flow/use-cases/external-participant-access.use-case';
import { GetExternalSignerSavedSignatureUseCase } from '@domains/signature-flow/use-cases/external-participant-access.use-case';
import { TypeOrmFileRepository } from '@shared/infrastructure/repositories/typeorm-file.repository';
import { ServerError, ValidationError } from '@shared/domain/errors';
import { Bucket } from '@shared/utils/Bucket';
import FileUtils from '@shared/utils/FileUtils';
import { extractClientIp } from '@shared/utils/ip';
import path from 'path';
import fs from 'fs';

export class ExternalParticipantController {
  constructor(
    private readonly getAccessUseCase: GetExternalParticipantAccessUseCase,
    private readonly submitActionUseCase: SubmitExternalParticipantActionUseCase,
    private readonly requestOtpUseCase: RequestExternalSignerOtpUseCase,
    private readonly validateOtpUseCase: ValidateExternalSignerOtpUseCase,
    private readonly fileRepository: TypeOrmFileRepository,
    private readonly getSavedSignatureUseCase?: GetExternalSignerSavedSignatureUseCase,
  ) {
    this.getAccess = this.getAccess.bind(this);
    this.getDocument = this.getDocument.bind(this);
    this.submitAction = this.submitAction.bind(this);
    this.requestOtp = this.requestOtp.bind(this);
    this.validateOtp = this.validateOtp.bind(this);
    this.getSavedSignature = this.getSavedSignature.bind(this);
  }

  async getAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.params;
      const result = await this.getAccessUseCase.execute(token);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.params;
      const info = await this.getAccessUseCase.execute(token);

      if (info.status !== 'valid' && info.status !== 'already_used') {
        res.status(403).json({ message: 'Acceso no válido al documento.' });
        return;
      }

      const documentUrl = info.document?.documentUrl;
      if (!documentUrl) {
        res.status(404).json({ message: 'El documento no tiene archivo adjunto.' });
        return;
      }

      await this.serveDocumentFile(documentUrl, res, next);
    } catch (err) {
      next(err);
    }
  }

  async submitAction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.params;
      const { action, comment } = req.body as { action: 'approve' | 'reject'; comment?: string };

      if (!action || !['approve', 'reject'].includes(action)) {
        throw new ValidationError('La acción debe ser "approve" o "reject".');
      }

      await this.submitActionUseCase.execute(token, action, comment);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }

  async requestOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.params;
      const { method, phoneNumber } = req.body as { method?: 'email' | 'sms'; phoneNumber?: string };
      const result = await this.requestOtpUseCase.execute(token, method ?? 'email', phoneNumber);
      res.json({ success: true, redactedEmail: result.redactedEmail, redactedPhone: result.redactedPhone });
    } catch (err) {
      next(err);
    }
  }

  async validateOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.params;
      const { code, documentNumber, timezone, signatureImage, saveSignatureForFuture } = req.body as {
        code: string;
        documentNumber?: string;
        timezone?: string;
        signatureImage?: string;
        saveSignatureForFuture?: boolean;
      };
      const ipAddress = extractClientIp(req);

      if (!code || typeof code !== 'string' || code.length !== 6) {
        throw new ValidationError('El código debe ser de 6 dígitos.');
      }

      await this.validateOtpUseCase.execute(
        token,
        code,
        ipAddress,
        documentNumber?.trim(),
        timezone?.trim(),
        signatureImage,
        saveSignatureForFuture,
      );
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }

  async getSavedSignature(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.params;
      if (!this.getSavedSignatureUseCase) {
        res.json({ available: false });
        return;
      }
      const result = await this.getSavedSignatureUseCase.execute(token);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  private async serveDocumentFile(documentUrl: string, res: Response, next: NextFunction): Promise<void> {
    try {
      // Look up the file by UUID in the repository (same as FileShareController)
      const file = await this.fileRepository.findById(documentUrl);

      if (file) {
        if (file.storage === 's3') {
          const buffer = await this.downloadFromS3(file.path);
          res.setHeader('Content-Type', file.mimeType || 'application/pdf');
          res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.originalName)}"`);
          res.send(buffer);
        } else {
          // Use file.path directly — same as FileShareController.preview (no upload-dir join)
          if (!fs.existsSync(file.path)) {
            res.status(404).json({ message: 'Archivo físico no encontrado.' });
            return;
          }
          res.setHeader('Content-Type', file.mimeType || 'application/pdf');
          res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.originalName)}"`);
          fs.createReadStream(file.path).pipe(res);
        }
        return;
      }

      // Fallback: documentUrl might be an absolute path (legacy documents)
      if (path.isAbsolute(documentUrl) && fs.existsSync(documentUrl)) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="document.pdf"');
        fs.createReadStream(documentUrl).pipe(res);
        return;
      }

      res.status(404).json({ message: 'Archivo no encontrado.' });
    } catch (err) {
      next(err);
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

    const bucket = new Bucket({ bucket: bucketName, region, credentials: { accessKeyId, secretAccessKey } });

    const tempDir = FileUtils.buildPath('temp');
    await fs.promises.mkdir(tempDir, { recursive: true });
    const tempPath = path.join(tempDir, `ext-doc-${Date.now()}`);

    const buffer = await bucket.downloadFile({ source: filePath });
    await fs.promises.writeFile(tempPath, buffer);
    const data = await fs.promises.readFile(tempPath);
    await FileUtils.delete(tempPath).catch(() => {});
    return data;
  }
}
