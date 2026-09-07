import { EntityUtils } from '@shared/utils/common';

export interface ExternalParticipantTokenProps {
  id?: string;
  participantId: string;
  token: string;
  expiresAt: Date;
  otpHash?: string | null;
  otpExpiresAt?: Date | null;
  otpAttempts?: number;
  /** Canal usado para enviar el código: 'email' | 'sms'. */
  otpMethod?: string | null;
  usedAt?: Date | null;
  signatureTokenHash?: string | null;
  ipAddress?: string | null;
  documentNumber?: string | null;
  timezone?: string | null;
  signatureImageFileId?: string | null;
  createdAt?: Date;
}

export class ExternalParticipantToken {
  id: string;
  participantId: string;
  token: string;
  expiresAt: Date;
  otpHash: string | null;
  otpExpiresAt: Date | null;
  otpAttempts: number;
  otpMethod: string | null;
  usedAt: Date | null;
  signatureTokenHash: string | null;
  ipAddress: string | null;
  documentNumber: string | null;
  timezone: string | null;
  signatureImageFileId: string | null;
  createdAt: Date;

  constructor(props: ExternalParticipantTokenProps) {
    EntityUtils.assign(this as ExternalParticipantToken, props, {
      id: 'uuid',
      otpHash: (v?: string | null) => v ?? null,
      otpExpiresAt: 'datetimeNullable',
      otpAttempts: (v?: number) => v ?? 0,
      otpMethod: (v?: string | null) => v ?? null,
      usedAt: 'datetimeNullable',
      signatureTokenHash: (v?: string | null) => v ?? null,
      ipAddress: (v?: string | null) => v ?? null,
      documentNumber: (v?: string | null) => v ?? null,
      timezone: (v?: string | null) => v ?? null,
      signatureImageFileId: (v?: string | null) => v ?? null,
      createdAt: 'datetime',
    });
  }

  get isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  get isUsed(): boolean {
    return this.usedAt !== null;
  }

  get isOtpExpired(): boolean {
    if (!this.otpExpiresAt) return true;
    return new Date() > this.otpExpiresAt;
  }

  static create(props: ExternalParticipantTokenProps): ExternalParticipantToken {
    return new ExternalParticipantToken(props);
  }
}
