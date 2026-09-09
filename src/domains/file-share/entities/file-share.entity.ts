import { randomBytes } from 'crypto';

export interface FileShareProps {
  id?: string;
  token?: string;
  fileId: string;
  expiresAt?: Date;
  maxAccess?: number | null;
  accessCount?: number;
  createdBy: string;
  revokedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class FileShare {
  id: string;
  token: string;
  fileId: string;
  expiresAt: Date;
  maxAccess: number | null;
  accessCount: number;
  createdBy: string;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  static readonly DEFAULT_EXPIRY_DAYS = 7;

  constructor(props: FileShareProps) {
    this.id = props.id ?? crypto.randomUUID();
    this.token = props.token ?? randomBytes(32).toString('hex');
    this.fileId = props.fileId;
    this.expiresAt = props.expiresAt ?? FileShare.expiresInDays(FileShare.DEFAULT_EXPIRY_DAYS);
    this.maxAccess = props.maxAccess ?? null;
    this.accessCount = props.accessCount ?? 0;
    this.createdBy = props.createdBy;
    this.revokedAt = props.revokedAt ?? null;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  static expiresInDays(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  isValid(): boolean {
    if (this.revokedAt) return false;
    if (new Date() > this.expiresAt) return false;
    if (this.maxAccess !== null && this.accessCount >= this.maxAccess) return false;
    return true;
  }
}
