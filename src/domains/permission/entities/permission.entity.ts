import { EntityUtils } from "@shared/utils/common";
import { ValidationError } from "@shared/domain/errors";

export interface CreatePermissionProps {
  id?: number;
  name: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UpdatePermissionProps extends CreatePermissionProps {
  id: number;
}

export interface PermissionJson {
  id?: number;
  name: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Permission {
  id?: number;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(props: CreatePermissionProps) {
    Permission.validate(props);
    EntityUtils.assign(this as Permission, props, {
      createdAt: 'datetime',
      updatedAt: 'datetime',
    });
  }

  private static validate(props: CreatePermissionProps): void {
    if (!props.name?.trim()) {
      throw new ValidationError('Permission name is required', 'name');
    }
    if (props.name.length > 255) {
      throw new ValidationError('Permission name is too long', 'name');
    }
  }

  toJSON(): PermissionJson {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
