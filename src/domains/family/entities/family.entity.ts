import { EntityUtils } from '@shared/utils/common';
import { ValidationError } from '@shared/domain/errors';

export interface FamilyProps {
  id?: string;
  name: string;
  groupId: number;
  contractId: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export class Family {
  id: string;
  name: string;
  groupId: number;
  contractId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  constructor(props: FamilyProps) {
    Family.validateRequired(props);

    EntityUtils.assign(this as Family, props, {
      id: 'uuid',
      createdAt: 'date',
      updatedAt: 'date',
      deletedAt: 'dateNullable',
    });
  }

  public static create(props: FamilyProps): Family {
    return new Family(props);
  }

  private static validateRequired(props: FamilyProps): void {
    if (!props.name || props.name.trim().length === 0) {
      throw new ValidationError('El nombre de la familia es requerido');
    }

    if (props.name.trim().length < 2) {
      throw new ValidationError('El nombre de la familia debe tener al menos 2 caracteres');
    }

    if (props.name.trim().length > 100) {
      throw new ValidationError('El nombre de la familia no puede exceder 100 caracteres');
    }

    if (!props.groupId || props.groupId <= 0) {
      throw new ValidationError('Group ID is required and must be positive', 'groupId');
    }

    if (!props.contractId || props.contractId.trim().length === 0) {
      throw new ValidationError('Contract ID es requerido', 'contractId');
    }
  }

  public updateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new ValidationError('El nombre de la familia es requerido');
    }

    if (name.trim().length < 2) {
      throw new ValidationError('El nombre de la familia debe tener al menos 2 caracteres');
    }

    if (name.trim().length > 100) {
      throw new ValidationError('El nombre de la familia no puede exceder 100 caracteres');
    }

    this.name = name.trim();
    this.updatedAt = new Date();
  }

  public softDelete(): void {
    this.deletedAt = new Date();
    this.updatedAt = new Date();
  }

  public restore(): void {
    this.deletedAt = null;
    this.updatedAt = new Date();
  }

  public changeGroup(groupId: number): void {
    if (!groupId || groupId <= 0) {
      throw new ValidationError('Group ID is required and must be positive', 'groupId');
    }
    this.groupId = groupId;
    this.updatedAt = new Date();
  }

  public changeContract(contractId: string): void {
    if (!contractId || contractId.trim().length === 0) {
      throw new ValidationError('Contract ID es requerido', 'contractId');
    }
    this.contractId = contractId;
    this.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      name: this.name,
      groupId: this.groupId,
      contractId: this.contractId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
    };
  }
}
