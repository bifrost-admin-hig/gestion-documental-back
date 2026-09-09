import { EntityUtils } from '@shared/utils/common';
import { ValidationError } from '@shared/domain/errors';

export interface SignatureVerificationCodeProps {
  id?: string;
  signatureId: string;
  codeHash: string;
  attempts?: number;
  maxAttempts?: number;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt?: Date;
}

export class SignatureVerificationCode {
  id: string;
  signatureId: string;
  codeHash: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;

  constructor(props: SignatureVerificationCodeProps) {
    SignatureVerificationCode.validateRequired(props);

    EntityUtils.assign(this as SignatureVerificationCode, props, {
      id: 'uuid',
      attempts: (attempts?: number) => attempts ?? 0,
      maxAttempts: (maxAttempts?: number) => maxAttempts ?? 3,
      expiresAt: 'datetime',
      usedAt: 'datetimeNullable',
      createdAt: 'datetime',
    });
  }

  public static create(props: SignatureVerificationCodeProps): SignatureVerificationCode {
    return new SignatureVerificationCode(props);
  }

  get isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  get isUsed(): boolean {
    return this.usedAt !== null;
  }

  get hasExceededMaxAttempts(): boolean {
    return this.attempts >= this.maxAttempts;
  }

  private static validateRequired(props: SignatureVerificationCodeProps): void {
    if (!props.signatureId || props.signatureId.trim().length === 0) {
      throw new ValidationError('El ID de la firma es requerido');
    }
    if (!props.codeHash || props.codeHash.trim().length === 0) {
      throw new ValidationError('El hash del código es requerido');
    }
    if (!props.expiresAt) {
      throw new ValidationError('La fecha de expiración es requerida');
    }
  }
}
