import { SignatureRepository } from '../repositories/signature.repository';
import { Signature } from '../entities/signature.entity';
import { NotFoundError } from '@shared/domain/errors';

export class GetSignatureByDocumentUseCase {
  constructor(
    private readonly signatureRepository: SignatureRepository,
  ) {}

  async execute(documentId: string): Promise<Signature[]> {
    return this.signatureRepository.findByDocumentId(documentId);
  }
}

export class GetSignatureByTokenHashUseCase {
  constructor(
    private readonly signatureRepository: SignatureRepository,
  ) {}

  async execute(tokenHash: string): Promise<Signature> {
    const signature = await this.signatureRepository.findByTokenHash(tokenHash);
    if (!signature) {
      throw new NotFoundError('Firma no encontrada');
    }
    return signature;
  }
}
