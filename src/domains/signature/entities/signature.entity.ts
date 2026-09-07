import { EntityUtils } from '@shared/utils/common';
import { ValidationError } from '@shared/domain/errors';
import { parseEnum } from '@shared/utils/objects';
import {
  SignatureStatus,
  SignatureType,
  SignatureMethod,
  SignatureRejectionCode,
} from '../value-objects/signature-enums';

export interface SignatureProps {
  id?: string;
  documentId: string;
  userId: string;
  signatureType?: string;
  signatureMethod?: string;
  status?: string;
  tokenHash?: string | null;
  ipAddress?: string | null;
  signerTimezone?: string | null;
  signatureImageFileId?: string | null;
  rejectionReason?: string | null;
  rejectionCode?: string | null;
  signedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Signature {
  id: string;
  documentId: string;
  userId: string;
  signatureType: SignatureType;
  signatureMethod: SignatureMethod;
  status: SignatureStatus;
  tokenHash: string | null;
  ipAddress: string | null;
  signerTimezone: string | null;
  signatureImageFileId: string | null;
  rejectionReason: string | null;
  rejectionCode: SignatureRejectionCode | null;
  signedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(props: SignatureProps) {
    Signature.validateRequired(props);

    EntityUtils.assign(this as Signature, props, {
      id: 'uuid',
      signatureType: (type?: string) => parseEnum(type, SignatureType) ?? SignatureType.SIMPLE,
      signatureMethod: (method?: string) => parseEnum(method, SignatureMethod) ?? SignatureMethod.EMAIL,
      status: (status?: string) => parseEnum(status, SignatureStatus) ?? SignatureStatus.PENDING,
      tokenHash: (hash?: string | null) => hash ?? null,
      ipAddress: (ip?: string | null) => ip ?? null,
      signerTimezone: (tz?: string | null) => tz ?? null,
      signatureImageFileId: (v?: string | null) => v ?? null,
      rejectionReason: (reason?: string | null) => reason ?? null,
      rejectionCode: (code?: string | null) => parseEnum(code, SignatureRejectionCode) ?? null,
      signedAt: 'datetimeNullable',
      createdAt: 'datetime',
      updatedAt: 'datetime',
    });
  }

  public static create(props: SignatureProps): Signature {
    return new Signature(props);
  }

  private static validateRequired(props: SignatureProps): void {
    if (!props.documentId || props.documentId.trim().length === 0) {
      throw new ValidationError('El ID del documento es requerido');
    }
    if (!props.userId || props.userId.trim().length === 0) {
      throw new ValidationError('El ID del usuario es requerido');
    }
  }
}
