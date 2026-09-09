import { SignatureRepository } from '../repositories/signature.repository';
import { DocumentRepository } from '@domains/document/repositories/document.repository';
import { Signature } from '../entities/signature.entity';
import { NotFoundError } from '@shared/domain/errors';

export interface VerifyDocumentSignatureResult {
  signature: Signature;
  document: {
    id: string;
    name: string;
    status: string;
    expirationDate: Date | null;
    documentUrl?: string;
  };
  isExpired: boolean;
}

export class VerifyDocumentSignatureUseCase {
  constructor(
    private readonly signatureRepository: SignatureRepository,
    private readonly documentRepository: DocumentRepository,
  ) {}

  async execute(documentId: string, tokenHash: string): Promise<VerifyDocumentSignatureResult> {
    const signature = await this.signatureRepository.findByDocumentIdAndTokenHash(documentId, tokenHash);
    if (!signature) {
      throw new NotFoundError('No se encontró el documento con los datos de verificación proporcionados.');
    }

    const document = await this.documentRepository.findById(documentId);
    if (!document) {
      throw new NotFoundError('Documento no encontrado.');
    }

    const now = new Date();
    const isExpiredByDate = document.expirationDate != null && document.expirationDate < now;
    const isExpiredByStatus = document.status === 'expired';
    const isExpired = isExpiredByDate || isExpiredByStatus;

    return {
      signature,
      document: {
        id: document.id,
        name: document.name,
        status: document.status,
        expirationDate: document.expirationDate,
        documentUrl: document.documentUrl,
      },
      isExpired,
    };
  }
}
