import { SignatureVerificationCode } from '../entities/signature-verification-code.entity';

export interface SignatureVerificationCodeRepository {
  findById(id: string): Promise<SignatureVerificationCode | null>;
  findBySignatureId(signatureId: string): Promise<SignatureVerificationCode[]>;
  findActiveBySignatureId(signatureId: string): Promise<SignatureVerificationCode | null>;
  save(code: SignatureVerificationCode): Promise<SignatureVerificationCode>;
  update(code: SignatureVerificationCode): Promise<SignatureVerificationCode>;
}
