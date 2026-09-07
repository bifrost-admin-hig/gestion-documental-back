import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { asyncHandler } from '@shared/middleware/validation';
import { InitiateSignatureUseCase } from '@domains/signature/use-cases/initiate-signature.use-case';
import { ValidateSignatureCodeUseCase } from '@domains/signature/use-cases/validate-signature-code.use-case';
import { CancelSignatureUseCase } from '@domains/signature/use-cases/cancel-signature.use-case';
import { GetSignatureByDocumentUseCase, GetSignatureByTokenHashUseCase } from '@domains/signature/use-cases/get-signature.use-case';
import { VerifyDocumentSignatureUseCase } from '@domains/signature/use-cases/verify-document-signature.use-case';
import { GetSignatureSmsPhoneUseCase } from '@domains/signature/use-cases/get-signature-sms-phone.use-case';
import { GetPublicDocumentVerificationUseCase } from '@domains/signature-flow/use-cases/get-public-document-verification.use-case';
import { GetSavedSignaturePreviewUseCase } from '@domains/signature/use-cases/get-saved-signature-preview.use-case';
import { TypeOrmFileRepository } from '@shared/infrastructure/repositories/typeorm-file.repository';
import { Signature } from '@domains/signature/entities/signature.entity';
import { extractClientIp } from '@shared/utils/ip';
import { NotFoundError, ServerError } from '@shared/domain/errors';
import { Bucket } from '@shared/utils/Bucket';
import FileUtils from '@shared/utils/FileUtils';

interface SignatureResponseDto {
  id: string;
  documentId: string;
  userId: string;
  signatureType: string;
  signatureMethod: string;
  status: string;
  tokenHash: string | null;
  ipAddress: string | null;
  rejectionReason: string | null;
  rejectionCode: string | null;
  signedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export class SignatureController {
  constructor(
    private readonly initiateSignatureUseCase: InitiateSignatureUseCase,
    private readonly validateSignatureCodeUseCase: ValidateSignatureCodeUseCase,
    private readonly cancelSignatureUseCase: CancelSignatureUseCase,
    private readonly getSignatureByDocumentUseCase: GetSignatureByDocumentUseCase,
    private readonly getSignatureByTokenHashUseCase: GetSignatureByTokenHashUseCase,
    private readonly verifyDocumentSignatureUseCase: VerifyDocumentSignatureUseCase,
    private readonly getSignatureSmsPhoneUseCase: GetSignatureSmsPhoneUseCase,
    private readonly fileRepository?: TypeOrmFileRepository,
    private readonly getPublicDocumentVerificationUseCase?: GetPublicDocumentVerificationUseCase,
    private readonly getSavedSignaturePreviewUseCase?: GetSavedSignaturePreviewUseCase,
  ) {}

  initiate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { documentId, signatureType, signatureMethod, phoneNumber } = req.body;
    const userId = req.auth!.user!.id;

    const result = await this.initiateSignatureUseCase.execute({
      documentId,
      userId,
      signatureType,
      signatureMethod,
      phoneNumber,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  });

  validate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { signatureId, code, timezone, signatureImage, saveSignatureForFuture } = req.body;
    const userId = req.auth!.user!.id;
    const ipAddress = extractClientIp(req);

    await this.validateSignatureCodeUseCase.execute({
      signatureId,
      userId,
      code,
      ipAddress,
      timezone,
      signatureImage,
      saveSignatureForFuture,
    });

    res.status(200).json({
      success: true,
      message: 'Documento firmado exitosamente',
    });
  });

  getMySignature = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth!.user!.id;

    if (!this.getSavedSignaturePreviewUseCase) {
      res.status(200).json({ success: true, data: { available: false } });
      return;
    }

    const result = await this.getSavedSignaturePreviewUseCase.execute({ userId });
    res.status(200).json({ success: true, data: result });
  });

  cancel = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { signatureId } = req.body;
    const userId = req.auth!.user!.id;

    await this.cancelSignatureUseCase.execute({ signatureId, userId });

    res.status(200).json({
      success: true,
      message: 'Proceso de firma cancelado',
    });
  });

  getDefaultSmsPhone = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth!.user!.id;
    const result = await this.getSignatureSmsPhoneUseCase.execute(userId);

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  getByDocument = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { documentId } = req.params;
    const signatures = await this.getSignatureByDocumentUseCase.execute(documentId);

    res.status(200).json({
      success: true,
      data: signatures.map((s) => this.toResponseDto(s)),
      count: signatures.length,
    });
  });

  verifyByToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { tokenHash } = req.params;
    const signature = await this.getSignatureByTokenHashUseCase.execute(tokenHash);

    res.status(200).json({
      success: true,
      data: this.toResponseDto(signature),
    });
  });

  verifyByDocumentAndToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { documentId, tokenHash } = req.params;
    const result = await this.verifyDocumentSignatureUseCase.execute(documentId, tokenHash);

    res.status(200).json({
      success: true,
      data: {
        signature: this.toResponseDto(result.signature),
        document: result.document,
        isExpired: result.isExpired,
      },
    });
  });

  getDocumentFileByVerification = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { documentId, tokenHash } = req.params;

    // Validate the pair exists before serving the file
    const result = await this.verifyDocumentSignatureUseCase.execute(documentId, tokenHash);

    const documentUrl = result.document.documentUrl;
    if (!documentUrl) {
      throw new NotFoundError('El documento no tiene archivo asociado');
    }

    await this.serveDocumentFile(documentUrl, res);
  });

  verifyDocumentById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { documentId } = req.params;
    if (!this.getPublicDocumentVerificationUseCase) {
      throw new ServerError('Verificación pública no disponible');
    }
    const result = await this.getPublicDocumentVerificationUseCase.execute(documentId);
    res.status(200).json({ success: true, data: result });
  });

  getDocumentFilePublic = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { documentId } = req.params;
    if (!this.getPublicDocumentVerificationUseCase) {
      throw new ServerError('Verificación pública no disponible');
    }
    const result = await this.getPublicDocumentVerificationUseCase.execute(documentId);
    const documentUrl = result.document.documentUrl;
    if (!documentUrl) {
      throw new NotFoundError('El documento no tiene archivo asociado');
    }
    await this.serveDocumentFile(documentUrl, res);
  });

  /**
   * Sirve el archivo de un documento firmado tanto desde almacenamiento local
   * como desde S3 (mismo patrón que ExternalParticipantController.serveDocumentFile).
   */
  private async serveDocumentFile(documentUrl: string, res: Response): Promise<void> {
    if (this.fileRepository) {
      const file = await this.fileRepository.findById(documentUrl);

      if (file) {
        if (file.storage === 's3') {
          const buffer = await this.downloadFromS3(file.path);
          res.setHeader('Content-Type', file.mimeType || 'application/pdf');
          res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.originalName)}"`);
          res.send(buffer);
          return;
        }

        if (!fs.existsSync(file.path)) {
          throw new NotFoundError('Archivo del documento no encontrado en el servidor');
        }
        res.setHeader('Content-Type', file.mimeType || 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.originalName)}"`);
        fs.createReadStream(file.path).pipe(res);
        return;
      }
    }

    // Fallback: documentUrl might be an absolute local path (legacy documents)
    if (documentUrl.toLowerCase().endsWith('.pdf') && path.isAbsolute(documentUrl)) {
      if (!fs.existsSync(documentUrl)) {
        throw new NotFoundError('Archivo del documento no encontrado en el servidor');
      }
      const fileName = path.basename(documentUrl);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
      fs.createReadStream(documentUrl).pipe(res);
      return;
    }

    throw new NotFoundError('Archivo del documento no disponible');
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
    const tempPath = path.join(tempDir, `verify-doc-${Date.now()}`);

    const buffer = await bucket.downloadFile({ source: filePath });
    await fs.promises.writeFile(tempPath, buffer);
    const data = await fs.promises.readFile(tempPath);
    await FileUtils.delete(tempPath).catch(() => {});
    return data;
  }

  private toResponseDto(signature: Signature): SignatureResponseDto {
    return {
      id: signature.id,
      documentId: signature.documentId,
      userId: signature.userId,
      signatureType: signature.signatureType,
      signatureMethod: signature.signatureMethod,
      status: signature.status,
      tokenHash: signature.tokenHash,
      ipAddress: signature.ipAddress,
      rejectionReason: signature.rejectionReason,
      rejectionCode: signature.rejectionCode,
      signedAt: signature.signedAt ? signature.signedAt.toISOString() : null,
      createdAt: signature.createdAt.toISOString(),
      updatedAt: signature.updatedAt.toISOString(),
    };
  }
}
