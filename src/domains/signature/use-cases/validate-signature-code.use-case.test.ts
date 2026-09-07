///<reference types="bun" />
import { describe, it, expect } from 'bun:test';
import { ValidateSignatureCodeUseCase } from './validate-signature-code.use-case';
import { Signature } from '../entities/signature.entity';
import { SignatureVerificationCode } from '../entities/signature-verification-code.entity';
import { SignatureStatus } from '../value-objects/signature-enums';
import { Document } from '@domains/document/entities/document.entity';
import { DocumentAction, DocumentStatus } from '@domains/document/value-objects/document-enums';
import { ForbiddenError, NotFoundError } from '@shared/domain/errors';
import { type SignatureRepository } from '../repositories/signature.repository';
import { type SignatureVerificationCodeRepository } from '../repositories/signature-verification-code.repository';
import { type DocumentRepository } from '@domains/document/repositories/document.repository';
import { type DocumentHistoryRepository } from '@domains/document/repositories/document-history.repository';
import { type DocumentHistoryProps } from '@domains/document/entities/document-history.entity';
import { type SignatureCryptoService } from '@shared/security/signature-crypto.service';
import { type UserRepository } from '@domains/user/repositories/user.repository';
import { type ColaboratorRepository } from '@domains/colaborators/repositories/colaborator.repository';

const OWNER_ID = 'owner-1';
const OTHER_USER_ID = 'other-user-1';
const SAMPLE_SIGNATURE_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

function makeSignature(): Signature {
  return Signature.create({
    documentId: 'doc-1',
    userId: OWNER_ID,
    status: SignatureStatus.PENDING,
  });
}

function makeSignatureRepository(signature: Signature | null): SignatureRepository {
  return {
    findById: async (id: string) => (signature && id === signature.id ? signature : null),
    update: async (s: Signature) => s,
  } as unknown as SignatureRepository;
}

function makeUseCase(signature: Signature | null): {
  useCase: ValidateSignatureCodeUseCase;
  codeRepositoryCalled: () => boolean;
} {
  let codeRepositoryCalled = false;
  const signatureCodeRepository = {
    findActiveBySignatureId: async () => {
      codeRepositoryCalled = true;
      return null;
    },
    update: async (c: unknown) => c,
  } as unknown as SignatureVerificationCodeRepository;

  const useCase = new ValidateSignatureCodeUseCase(
    makeSignatureRepository(signature),
    signatureCodeRepository,
    { findById: async () => null, save: async (d: unknown) => d } as unknown as DocumentRepository,
    { save: async () => undefined } as unknown as DocumentHistoryRepository,
    {} as unknown as SignatureCryptoService,
    { findById: async () => null } as unknown as UserRepository,
    { findByUserId: async () => null } as unknown as ColaboratorRepository,
  );

  return { useCase, codeRepositoryCalled: () => codeRepositoryCalled };
}

describe('ValidateSignatureCodeUseCase', () => {
  it('rechaza con ForbiddenError si la firma pertenece a otro usuario, sin verificar el código', async () => {
    const signature = makeSignature();
    const { useCase, codeRepositoryCalled } = makeUseCase(signature);

    await expect(useCase.execute({
      signatureId: signature.id,
      userId: OTHER_USER_ID,
      code: '123456',
      ipAddress: '127.0.0.1',
      signatureImage: 'data:image/png;base64,iVBORw0KGgo=',
    })).rejects.toThrow(ForbiddenError);

    expect(codeRepositoryCalled()).toBe(false);
  });

  it('rechaza con NotFoundError si la firma no existe', async () => {
    const { useCase } = makeUseCase(null);

    await expect(useCase.execute({
      signatureId: 'nonexistent',
      userId: OWNER_ID,
      code: '123456',
      ipAddress: '127.0.0.1',
      signatureImage: 'data:image/png;base64,iVBORw0KGgo=',
    })).rejects.toThrow(NotFoundError);
  });

  it('registra en el historial del documento que se firmó, aunque no haya estampado de PDF configurado', async () => {
    const signature = makeSignature();
    const document = Document.create({
      id: signature.documentId,
      documentModelId: 'model-1',
      name: 'Documento',
      groupId: 1,
      status: DocumentStatus.IN_SIGNING,
    });

    const verificationCode = SignatureVerificationCode.create({
      signatureId: signature.id,
      codeHash: 'hash',
      expiresAt: new Date(Date.now() + 60_000),
    });

    const savedHistory: DocumentHistoryProps[] = [];

    const useCase = new ValidateSignatureCodeUseCase(
      {
        findById: async (id: string) => (id === signature.id ? signature : null),
        update: async (s: Signature) => s,
      } as unknown as SignatureRepository,
      {
        findActiveBySignatureId: async () => verificationCode,
        update: async (c: unknown) => c,
      } as unknown as SignatureVerificationCodeRepository,
      {
        findById: async (id: string) => (id === document.id ? document : null),
        save: async (d: Document) => d,
      } as unknown as DocumentRepository,
      {
        save: async (history: DocumentHistoryProps) => { savedHistory.push(history); return history; },
      } as unknown as DocumentHistoryRepository,
      {
        verifyCode: () => true,
        generateTokenHash: () => 'token-hash',
      } as unknown as SignatureCryptoService,
      { findById: async () => null } as unknown as UserRepository,
      { findByUserId: async () => null } as unknown as ColaboratorRepository,
    );

    await useCase.execute({
      signatureId: signature.id,
      userId: OWNER_ID,
      code: '123456',
      ipAddress: '127.0.0.1',
      signatureImage: SAMPLE_SIGNATURE_IMAGE,
    });

    expect(signature.status).toBe(SignatureStatus.SIGNED);
    expect(savedHistory).toHaveLength(1);
    expect(savedHistory[0].action).toBe(DocumentAction.SIGNATURE_SIGNED);
    expect(savedHistory[0].updatedBy).toBe(OWNER_ID);
  });
});
