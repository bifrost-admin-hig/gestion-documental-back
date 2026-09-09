export enum SignatureStatus {
  PENDING = 'pending',
  SIGNED = 'signed',
  REJECTED = 'rejected',
  CLOSED = 'closed',
}

export enum SignatureType {
  SIMPLE = 'simple',
}

export enum SignatureMethod {
  EMAIL = 'email',
  SMS = 'sms',
}

export enum SignatureRejectionCode {
  CODE_EXPIRED = 'code_expired',
  MAX_ATTEMPTS_EXCEEDED = 'max_attempts_exceeded',
  CANCELLED = 'cancelled',
}

export enum SignatureAction {
  INITIATED = 'initiated',
  CODE_SENT = 'code_sent',
  SIGNED = 'signed',
  REJECTED_CODE_EXPIRED = 'rejected_code_expired',
  REJECTED_MAX_ATTEMPTS = 'rejected_max_attempts',
  CANCELLED = 'cancelled',
}
