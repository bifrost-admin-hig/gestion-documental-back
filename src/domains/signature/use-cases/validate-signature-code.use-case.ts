import { DocumentRepository } from '@domains/document/repositories/document.repository';
import { DocumentHistoryRepository } from '@domains/document/repositories/document-history.repository';
import { DocumentAction } from '@domains/document/value-objects/document-enums';
import { Document } from '@domains/document/entities/document.entity';
import { DocumentVersioningService } from '@domains/document/services/document-versioning.service';
import { UserRepository } from '@domains/user/repositories/user.repository';
import { ColaboratorRepository } from '@domains/colaborators/repositories/colaborator.repository';
import { SignatureRepository } from '../repositories/signature.repository';
import { SignatureVerificationCodeRepository } from '../repositories/signature-verification-code.repository';
import { UserSignatureRepository } from '../repositories/user-signature.repository';
import { SignatureStatus, SignatureRejectionCode } from '../value-objects/signature-enums';
import { SignatureCryptoService } from '@shared/security/signature-crypto.service';
import { SignaturePdfStampService, StampTarget } from '@shared/infrastructure/pdf/signature-pdf-stamp.service';
import { TypeOrmFileRepository } from '@shared/infrastructure/repositories/typeorm-file.repository';
import { ProcessFlowParticipantActionUseCase } from '@domains/signature-flow/use-cases/progress-signature-flow.use-case';
import { decodeSignatureImage } from '@shared/utils/image';
import { ForbiddenError, NotFoundError, ValidationError } from '@shared/domain/errors';

export interface ValidateSignatureCodeParams {
  signatureId: string;
  userId: string;
  code: string;
  ipAddress: string;
  timezone?: string;
  signatureImage: string;
  saveSignatureForFuture?: boolean;
}

export class ValidateSignatureCodeUseCase {
  constructor(
    private readonly signatureRepository: SignatureRepository,
    private readonly signatureCodeRepository: SignatureVerificationCodeRepository,
    private readonly documentRepository: DocumentRepository,
    private readonly documentHistoryRepository: DocumentHistoryRepository,
    private readonly cryptoService: SignatureCryptoService,
    private readonly userRepository: UserRepository,
    private readonly colaboratorRepository: ColaboratorRepository,
    private readonly processFlowParticipantActionUseCase?: ProcessFlowParticipantActionUseCase,
    private readonly pdfStampService?: SignaturePdfStampService,
    private readonly fileRepository?: TypeOrmFileRepository,
    private readonly userSignatureRepository?: UserSignatureRepository,
    private readonly documentVersioningService?: DocumentVersioningService,
  ) {}

  async execute(params: ValidateSignatureCodeParams): Promise<void> {
    const { signatureId, userId, code, ipAddress, timezone, signatureImage, saveSignatureForFuture } = params;

    const signature = await this.signatureRepository.findById(signatureId);
    if (!signature) {
      throw new NotFoundError('Proceso de firma no encontrado');
    }

    if (signature.userId !== userId) {
      throw new ForbiddenError('No tienes permiso para completar este proceso de firma');
    }

    if (signature.status !== SignatureStatus.PENDING) {
      throw new ValidationError('El proceso de firma no está en estado pendiente');
    }

    const verificationCode = await this.signatureCodeRepository.findActiveBySignatureId(signatureId);
    if (!verificationCode) {
      throw new NotFoundError('No se encontró un código de verificación activo');
    }

    if (verificationCode.isExpired) {
      await this.registerSignatureError(
        signature.id,
        signature.documentId,
        signature.userId,
        SignatureRejectionCode.CODE_EXPIRED,
        'Error en proceso de firma: codigo expirado',
      );
      throw new ValidationError('El código de verificación ha expirado. Inicia el proceso de firma nuevamente.');
    }

    const isValid = this.cryptoService.verifyCode(code, verificationCode.codeHash, signatureId);

    if (!isValid) {
      verificationCode.attempts += 1;
      await this.signatureCodeRepository.update(verificationCode);

      if (verificationCode.hasExceededMaxAttempts) {
        await this.registerSignatureError(
          signature.id,
          signature.documentId,
          signature.userId,
          SignatureRejectionCode.MAX_ATTEMPTS_EXCEEDED,
          'Error en proceso de firma: maximo de intentos alcanzado',
        );
        throw new ValidationError('Has superado el número máximo de intentos. Inicia el proceso de firma nuevamente.');
      }

      await this.registerSignatureError(
        signature.id,
        signature.documentId,
        signature.userId,
        undefined,
        'Error en proceso de firma: codigo ingresado incorrecto',
      );

      const remaining = verificationCode.maxAttempts - verificationCode.attempts;
      throw new ValidationError(`Código incorrecto. Te quedan ${remaining} intento(s).`);
    }

    const signatureImageBuffer = decodeSignatureImage(signatureImage);

    const signedAt = new Date();
    const tokenHash = this.cryptoService.generateTokenHash({
      documentId: signature.documentId,
      userId: signature.userId,
      signedAt,
      ipAddress,
    });

    verificationCode.usedAt = signedAt;
    await this.signatureCodeRepository.update(verificationCode);

    let signatureImageFileId: string | null = null;
    if (this.fileRepository) {
      const savedImage = await this.fileRepository.saveBuffer(signatureImageBuffer, 'signature.png', 'image/png');
      signatureImageFileId = savedImage.id;

      if (saveSignatureForFuture && this.userSignatureRepository) {
        await this.userSignatureRepository.upsertForUser(signature.userId, savedImage.id);
      }
    }

    signature.status = SignatureStatus.SIGNED;
    signature.tokenHash = tokenHash;
    signature.ipAddress = ipAddress;
    signature.signerTimezone = timezone ?? null;
    signature.signatureImageFileId = signatureImageFileId;
    signature.signedAt = signedAt;
    signature.updatedAt = signedAt;
    await this.signatureRepository.update(signature);

    const wasPartOfFlow = this.processFlowParticipantActionUseCase
      ? await this.processFlowParticipantActionUseCase.markSignerSignedFromOtp(signature.documentId, signature.userId, signedAt)
      : false;

    const document = await this.documentRepository.findById(signature.documentId);
    if (document) {
      document.updateSignatureStatus(SignatureStatus.SIGNED);
      await this.documentRepository.save(document);

      if (!wasPartOfFlow) {
        const stamped = await this.tryStampPdf(document, signature.userId, tokenHash, ipAddress, signedAt, signatureImageFileId);
        if (!stamped) {
          await this.recordSignedHistory(document, signature.userId);
        }
      }
    }
  }

  private async recordSignedHistory(document: Document, userId: string): Promise<void> {
    await this.documentHistoryRepository.save({
      documentId: document.id,
      documentModelId: document.documentModelId,
      name: document.name,
      issuedDate: document.issuedDate ?? undefined,
      expirationDate: document.expirationDate,
      contractId: document.contractId,
      description: document.description,
      documentUrl: document.documentUrl,
      status: document.status,
      action: DocumentAction.SIGNATURE_SIGNED,
      updatedBy: userId,
      comment: 'Documento firmado electrónicamente.',
    });
  }

  /** Devuelve true si el PDF se estampó y la nueva versión quedó registrada en el historial. */
  private async tryStampPdf(
    document: Document,
    userId: string,
    tokenHash: string,
    ipAddress: string,
    signedAt: Date,
    signatureImageFileId: string | null,
  ): Promise<boolean> {
    if (!this.pdfStampService || !document.documentUrl) return false;

    const stampTarget = await this.resolvePdfPath(document.documentUrl);
    if (!stampTarget) return false;

    try {
      const user = await this.userRepository.findById(userId);
      if (!user) return false;

      const colaborator = await this.colaboratorRepository.findByUserId(userId);
      const signerDocumentNumber = colaborator?.numeroDocumento ?? 'N/A';

      const verifyUrl = this.buildVerifyUrl(document.id, tokenHash);

      const stampedBytes = await this.pdfStampService.stampPdf(stampTarget, {
        signerName: `${user.firstName} ${user.lastName}`,
        signerDocumentNumber,
        signerEmail: String(user.email),
        signedAt,
        signatureImageBytes: await this.loadSignatureImageBytes(signatureImageFileId),
        ipAddress,
        documentId: document.id,
        tokenHash,
        verifyUrl,
      });

      await this.persistStampedDocument(document, stampedBytes, userId);
      return true;
    } catch (err) {
      console.warn('[ValidateSignatureCodeUseCase] PDF stamping failed (non-critical):', err);
      return false;
    }
  }

  /**
   * Guarda el PDF estampado como un archivo nuevo (nunca sobrescribe el original) y
   * archiva la versión previa del documento, para poder compararlas o recuperar el
   * original ante cualquier error — mismo patrón que ya usa UpdateDocumentUseCase al
   * reemplazar el archivo de un documento.
   */
  private async persistStampedDocument(document: Document, stampedBytes: Buffer, userId: string): Promise<void> {
    if (!this.fileRepository) return;

    const previousDocumentUrl = document.documentUrl;
    if (!previousDocumentUrl) return;

    const originalFile = await this.fileRepository.findById(previousDocumentUrl).catch(() => null);
    const fileName = originalFile?.originalName ?? `${document.name}.pdf`;

    const newFile = await this.fileRepository.saveBuffer(stampedBytes, fileName, 'application/pdf');

    const archived = this.documentVersioningService
      ? await this.documentVersioningService.archiveCurrentFileVersion(
        document,
        'Versión reemplazada automáticamente al estampar la firma.',
      )
      : null;

    document.updateDocumentUrl(newFile.id);
    if (archived) {
      document.previousVersionId = archived.id;
    }
    await this.documentRepository.update(document);

    if (archived && this.documentVersioningService) {
      await this.documentVersioningService.recordFileReplacedHistory({
        liveDocument: document,
        archivedDocument: archived,
        previousDocumentUrl,
        action: DocumentAction.SIGNATURE_SIGNED,
        updatedBy: userId,
        comment: 'Documento firmado electrónicamente.',
      });
    }
  }

  private async loadSignatureImageBytes(fileId: string | null): Promise<Buffer | undefined> {
    if (!fileId || !this.fileRepository) return undefined;
    try {
      const file = await this.fileRepository.findById(fileId);
      if (!file) return undefined;
      return await this.fileRepository.getContent(file);
    } catch (err) {
      console.warn('[ValidateSignatureCodeUseCase] No se pudo cargar la imagen de la firma (no crítico):', err);
      return undefined;
    }
  }

  private async resolvePdfPath(documentUrl: string): Promise<StampTarget | null> {
    if (documentUrl.toLowerCase().endsWith('.pdf')) {
      return { storage: 'local', path: documentUrl };
    }

    if (!this.fileRepository) return null;

    const file = await this.fileRepository.findById(documentUrl);
    if (!file) return null;

    const isPdfByMime = (file.mimeType ?? '').toLowerCase().includes('pdf');
    const isPdfByName = file.originalName.toLowerCase().endsWith('.pdf');
    const isPdfByPath = file.path.toLowerCase().endsWith('.pdf');
    const isPdf = isPdfByMime || isPdfByName || isPdfByPath;

    if (!isPdf) return null;

    return { storage: file.storage, path: file.path };
  }

  private buildVerifyUrl(documentId: string, tokenHash: string): string {
    const baseUrl = (process.env.FRONTEND_URL ?? '').replace(/\/$/, '');
    return baseUrl ? `${baseUrl}/verify/${documentId}/${tokenHash}` : `/verify/${documentId}/${tokenHash}`;
  }

  private async registerSignatureError(
    signatureId: string,
    documentId: string,
    userId: string,
    rejectionCode: SignatureRejectionCode | undefined,
    errorReason: string,
  ): Promise<void> {
    const signature = await this.signatureRepository.findById(signatureId);
    if (!signature) return;

    // Signature keeps PENDING status to allow the user to re-initiate after failure
    signature.status = SignatureStatus.PENDING;
    signature.rejectionCode = rejectionCode ?? null;
    signature.rejectionReason = null;
    signature.updatedAt = new Date();
    await this.signatureRepository.update(signature);

    const activeCode = await this.signatureCodeRepository.findActiveBySignatureId(signatureId);
    if (activeCode && (activeCode.isExpired || activeCode.hasExceededMaxAttempts)) {
      activeCode.usedAt = new Date();
      await this.signatureCodeRepository.update(activeCode);
    }

    const document = await this.documentRepository.findById(documentId);
    if (document) {
      document.updateSignatureStatus(SignatureStatus.PENDING);
      await this.documentRepository.save(document);

      await this.documentHistoryRepository.save({
        documentId: document.id,
        documentModelId: document.documentModelId,
        name: document.name,
        issuedDate: document.issuedDate ?? undefined,
        expirationDate: document.expirationDate,
        contractId: document.contractId,
        description: document.description,
        documentUrl: document.documentUrl,
        status: document.status,
        action: DocumentAction.SIGNATURE_ERROR,
        updatedBy: userId,
        comment: errorReason,
      });
    }
  }
}
