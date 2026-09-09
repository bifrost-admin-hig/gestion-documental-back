import { Permission, PermissionJson } from "@domains/permission/entities/permission.entity";
import { ValidationError } from "@shared/domain/errors";
import { EntityUtils } from "@shared/utils/common";

export interface CreateRoleProps {
  name: string;
  description?: string;
  permissions?: Permission[];
  parents?: Role[];
  children?: Role[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UpdateRoleProps extends CreateRoleProps {
  id: number;
}

export interface RoleJson {
  id: number;
  name: string;
  description?: string;
  permissions: PermissionJson[];
  parents: RoleJson[];
  children: RoleJson[];
  createdAt?: Date;
  updatedAt?: Date;
}

export class Role {
  id: number;
  name: string;
  description?: string;
  permissions: Permission[];
  parents: Role[];
  children: Role[];
  createdAt?: Date;
  updatedAt?: Date;

  constructor(role: CreateRoleProps & { id?: number }) {
    Role.validate(role);
    EntityUtils.assign(this as Role, role, {
      permissions: (permissions?: Permission[]) => permissions ?? [],
      parents: (parents?: Role[]) => parents ?? [],
      children: (children?: Role[]) => children ?? [],
      createdAt: 'datetime',
      updatedAt: 'datetime',
    });
  }

  private static validate(props: CreateRoleProps): void {
    if (!props.name?.trim()) {
      throw new ValidationError('Role name is required', 'name');
    }
    if (props.name.length > 255) {
      throw new ValidationError('Role name is too long', 'name');
    }
  }

  toJSON(depth = 0): RoleJson {
    const json: RoleJson = {
      id: this.id,
      name: this.name,
      description: this.description,
      permissions: this.permissions?.map((permission) => permission.toJSON()) ?? [],
      parents: [],
      children: [],
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };

    if (depth > 0) {
      json.parents = this.parents?.map((parent) => parent.toJSON(0)) ?? [];
      json.children = this.children?.map((child) => child.toJSON(0)) ?? [];
    }

    return json;
  }
}
