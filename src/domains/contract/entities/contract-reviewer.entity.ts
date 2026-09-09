import { EntityUtils } from '@shared/utils/common';
import { ValidationError } from '@shared/domain/errors';
import { DateUtils } from '@shared/utils/date';

export interface CreateContractReviewerProps {
  id?: string;
  userId: string;
  contractId: string;
  isPrimary?: boolean;
  validUntil?: DateType | null;
  createdAt?: DateType;
  skipValidation?: boolean; // Para cuando se carga desde BD
}

export interface UpdateContractReviewerProps {
  id: string;
  isPrimary?: boolean;
  validUntil?: DateType | null;
}

export interface ContractReviewerJson {
  id: string;
  userId: string;
  contractId: string;
  isPrimary: boolean;
  validUntil: string | null;
  isActive: boolean;
  createdAt: string;
}

export class ContractReviewer {
  id: string;
  userId: string;
  contractId: string;
  isPrimary: boolean;
  validUntil: Date | null;
  createdAt: Date;

  constructor(props: CreateContractReviewerProps) {
    if (!props.skipValidation) {
      ContractReviewer.validateRequired(props);
    }
    EntityUtils.assign(this as ContractReviewer, props, {
      id: 'uuid',
      isPrimary: (isPrimary?: boolean) => isPrimary ?? false,
      validUntil: 'dateNullable',
      createdAt: 'datetime',
    });
  }

  private static validateRequired(props: CreateContractReviewerProps): void {
    if (!props.userId?.trim()) {
      throw new ValidationError('User ID is required', 'userId');
    }
    if (!props.contractId?.trim()) {
      throw new ValidationError('Contract ID is required', 'contractId');
    }
    // Validar que si no es primario, debe tener validUntil
    if (props.isPrimary === false && !props.validUntil) {
      throw new ValidationError('Non-primary reviewers must have a validUntil date', 'validUntil');
    }
    // Validar que validUntil sea una fecha futura
    if (props.validUntil) {
      const validUntilDate = DateUtils.parse(props.validUntil);
      if (validUntilDate && !DateUtils.isAfter(validUntilDate, new Date())) {
        throw new ValidationError('validUntil must be a future date', 'validUntil');
      }
    }
  }

  // Business methods
  public setPrimary(): void {
    this.isPrimary = true;
    this.validUntil = null;
  }

  public setTemporary(validUntil: DateType): void {
    const validUntilDate = DateUtils.parse(validUntil, true);
    if (!validUntilDate || !DateUtils.isAfter(validUntilDate, new Date())) {
      throw new ValidationError('validUntil must be a future date', 'validUntil');
    }
    this.isPrimary = false;
    this.validUntil = validUntilDate;
  }

  public extendValidity(newValidUntil: DateType): void {
    if (this.isPrimary) {
      throw new ValidationError('Cannot extend validity of primary reviewer', 'isPrimary');
    }
    const newDate = DateUtils.parse(newValidUntil, true);
    if (!newDate || !DateUtils.isAfter(newDate, new Date())) {
      throw new ValidationError('New validUntil must be a future date', 'validUntil');
    }
    this.validUntil = newDate;
  }

  public isActive(): boolean {
    // Un revisor primario siempre está activo
    if (this.isPrimary) {
      return true;
    }
    // Un revisor temporal está activo si validUntil es una fecha futura
    if (this.validUntil) {
      return DateUtils.isAfter(this.validUntil, new Date());
    }
    return false;
  }

  public toJSON(): ContractReviewerJson {
    return {
      id: this.id,
      userId: this.userId,
      contractId: this.contractId,
      isPrimary: this.isPrimary,
      validUntil: this.validUntil ? DateUtils.toString(this.validUntil) : null,
      isActive: this.isActive(),
      createdAt: this.createdAt.toISOString(),
    };
  }
}
