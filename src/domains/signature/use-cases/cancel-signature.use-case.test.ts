///<reference types="bun" />
import { describe, it, expect } from 'bun:test';
import { CancelSignatureUseCase } from './cancel-signature.use-case';
import { Signature } from '../entities/signature.entity';
import { SignatureStatus } from '../value-objects/signature-enums';
import { ForbiddenError, NotFoundError } from '@shared/domain/errors';
import { type SignatureRepository } from '../repositories/signature.repository';
import { type SignatureVerificationCodeRepository } from '../repositories/signature-verification-code.repository';
import { type DocumentRepository } from '@domains/document/repositories/document.repository';
import { type DocumentHistoryRepository } from '@domains/document/repositories/document-history.repository';

const OWNER_ID = 'owner-1';
const OTHER_USER_ID = 'other-user-1';

function makeSignature(overrides: Partial<{ status: SignatureStatus }> = {}): Signature {
  return Signature.create({
    documentId: 'doc-1',
    userId: OWNER_ID,
    status: overrides.status ?? SignatureStatus.PENDING,
  });
}

function makeSignatureRepository(signature: Signature | null): SignatureRepository {
  return {
    findById: async (id: string) => (signature && id === signature.id ? signature : null),
    update: async (s: Signature) => s,
  } as unknown as SignatureRepository;
}

function makeUseCase(signature: Signature | null): CancelSignatureUseCase {
  return new CancelSignatureUseCase(
    makeSignatureRepository(signature),
    { findActiveBySignatureId: async () => null, update: async (c: unknown) => c } as unknown as SignatureVerificationCodeRepository,
    { findById: async () => null, save: async (d: unknown) => d } as unknown as DocumentRepository,
    { save: async () => undefined } as unknown as DocumentHistoryRepository,
  );
}

describe('CancelSignatureUseCase', () => {
  it('rechaza con ForbiddenError si la firma pertenece a otro usuario', async () => {
    const signature = makeSignature();
    const useCase = makeUseCase(signature);

    await expect(useCase.execute({
      signatureId: signature.id,
      userId: OTHER_USER_ID,
    })).rejects.toThrow(ForbiddenError);
  });

  it('rechaza con NotFoundError si la firma no existe', async () => {
    const useCase = makeUseCase(null);

    await expect(useCase.execute({
      signatureId: 'nonexistent',
      userId: OWNER_ID,
    })).rejects.toThrow(NotFoundError);
  });

  it('permite cancelar cuando el usuario autenticado es el dueño de la firma', async () => {
    const signature = makeSignature();
    const useCase = makeUseCase(signature);

    await useCase.execute({
      signatureId: signature.id,
      userId: OWNER_ID,
    });

    expect(signature.status).toBe(SignatureStatus.PENDING);
  });
});
