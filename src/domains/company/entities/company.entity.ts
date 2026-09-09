import { EntityUtils } from '@shared/utils/common';
import { ValidationError } from '@shared/domain/errors';
import { DateTimeUtils } from '@shared/utils/date';

export interface CompanyProps {
  id?: string;
  name: string;
  taxId: string;
  address?: string;
  phone?: string;
  email?: string;
  groupId: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export class Company {
  id: string;
  name: string;
  taxId: string;
  address?: string;
  phone?: string;
  email?: string;
  groupId: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  constructor(props: CompanyProps) {
    Company.validate(props);
    EntityUtils.assign(this as Company, props, {
      id: 'uuid',
      createdAt: 'datetime',
      updatedAt: 'datetime',
      deletedAt: 'datetimeNullable',
    });
  }

  private static validate(props: CompanyProps): void {
    if (!props.name?.trim()) {
      throw new ValidationError('Company name is required', 'name');
    }
    if (!props.taxId?.trim()) {
      throw new ValidationError('Tax ID is required', 'taxId');
    }
    if (!props.groupId) {
      throw new ValidationError('Group ID is required', 'groupId');
    }
  }

  public update(props: Partial<Omit<CompanyProps, 'id' | 'groupId' | 'createdAt' | 'updatedAt' | 'deletedAt'>>): void {
    if (props.name !== undefined) {
      if (!props.name.trim()) throw new ValidationError('Name cannot be empty', 'name');
      this.name = props.name.trim();
    }
    if (props.taxId !== undefined) {
      if (!props.taxId.trim()) throw new ValidationError('Tax ID cannot be empty', 'taxId');
      this.taxId = props.taxId.trim();
    }
    if (props.address !== undefined) this.address = props.address?.trim();
    if (props.phone !== undefined) this.phone = props.phone?.trim();
    if (props.email !== undefined) this.email = props.email?.trim();

    this.updatedAt = new Date();
  }

  public changeGroup(groupId: number): void {
    if (!groupId) throw new ValidationError('Group ID is required', 'groupId');
    this.groupId = groupId;
    this.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      name: this.name,
      taxId: this.taxId,
      address: this.address,
      phone: this.phone,
      email: this.email,
      groupId: this.groupId,
      createdAt: DateTimeUtils.toString(this.createdAt),
      updatedAt: DateTimeUtils.toString(this.updatedAt),
      deletedAt: DateTimeUtils.toString(this.deletedAt, true),
    };
  }
}
