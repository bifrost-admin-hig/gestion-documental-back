import { ValidationError } from '@shared/domain/errors';
import { Email } from '../value-objects/email';
import { isValidUserStatus, UserStatus } from '../value-objects/user-status';
import { Role, RoleJson } from '../../role/entities/role.entity';
import { EntityUtils } from '@shared/utils/common';
import { toArray } from '@shared/utils/array';

interface BaseUserProps {
  email: string | Email;
  firstName: string;
  lastName: string;
  status?: string;
  passwordNonce?: string | null;
  rut?: string | null;
  phone?: string | null;
  roles?: Role[];
  groups?: { id: number; name: string }[];
  createdAt?: DateType;
  updatedAt?: DateType;
  deletedAt?: DateType | null;
}

export interface CreateUserProps extends BaseUserProps {
  id?: string;
  password: string;
}

export type UpdateUserProps = Partial<CreateUserProps> & { id: string };

export type UserJson = Overlap<BaseUserProps, {
  id: string;
  fullName: string;
  roles?: RoleJson[];
  groups?: { id: number; name: string }[];
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}>;

export interface AsRole {
  name: string;
  permissions?: {
    name: string
  }[];
  children?: AsRole[];
}

export class User {
  id: string;
  email: Email;
  firstName: string;
  lastName: string;
  password: string;
  status?: UserStatus;
  passwordNonce: string | null;
  rut: string | null;
  phone: string | null;
  roles?: Role[];
  groups?: { id: number; name: string }[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  constructor(props: CreateUserProps) {
    User.validateRequired(props);
    EntityUtils.assign(this as User, props, {
      id: 'uuid',
      email: 'email',
      status: (status: string) => isValidUserStatus(status) ? status : UserStatus.ACTIVE,
      passwordNonce: (v?: string | null) => v ?? null,
      rut: (v?: string | null) => v || null,
      phone: (v?: string | null) => v || null,
      createdAt: 'datetime',
      updatedAt: 'datetime',
      deletedAt: 'datetimeNullable',
      groups: (groups: any[]) => groups ?? [],
    });
  }

  private static validateRequired(props: CreateUserProps): void {
    if (!Email.isValid(props.email)) {
      throw new ValidationError('Invalid email format', 'email');
    }
    if (!props.firstName?.trim()) {
      throw new ValidationError('First name is required', 'firstName');
    }
    if (!props.lastName?.trim()) {
      throw new ValidationError('Last name is required', 'lastName');
    }
    if (!props.password?.trim()) {
      throw new ValidationError('Password is required', 'password');
    }
  }

  // Business methods
  public updateEmail(email: string): void {
    this.email = Email.create(email);
  }

  public updateName(firstName: string, lastName: string): void {
    if (!firstName?.trim()) {
      throw new ValidationError('First name is required', 'firstName');
    }
    if (!lastName?.trim()) {
      throw new ValidationError('Last name is required', 'lastName');
    }

    this.firstName = firstName.trim();
    this.lastName = lastName.trim();
  }

  public updatePassword(password: string): void {
    if (!password?.trim()) {
      throw new ValidationError('Password is required', 'password');
    }
    this.password = password.trim();
  }

  public assignRoles(roles: Role[]): void {
    this.roles = roles;
  }

  public activate(): void {
    this.status = UserStatus.ACTIVE;
  }

  public deactivate(): void {
    this.status = UserStatus.INACTIVE;
  }

  public suspend(): void {
    this.status = UserStatus.SUSPENDED;
  }

  public isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }

  public toJSON(): UserJson {
    return {
      id: this.id,
      email: this.email.toString(),
      firstName: this.firstName,
      lastName: this.lastName,
      fullName: `${this.firstName} ${this.lastName}`,
      status: this.status,
      rut: this.rut,
      phone: this.phone,
      roles: this.roles?.map(role => role.toJSON()) ?? [],
      groups: this.groups ?? [],
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      deletedAt: this.deletedAt?.toISOString() ?? null,
    };
  }

  public getPermissionNames(asArray: true): string[];
  public getPermissionNames(asArray?: false): Set<string>;
  public getPermissionNames(asArray?: boolean): string[] | Set<string>;
  public getPermissionNames(asArray?: boolean): string[] | Set<string> {
    const permissions = new Set<string>();
    User.getPermissionNamesFromRoles(this.roles, permissions);
    return asArray ? Array.from(permissions) : permissions;
  }

  static getPermissionNamesFromRoles(roles: AsRole[] | undefined, permissions: Set<string>): void {
    roles?.forEach(role => {
      role.permissions?.forEach(permission => {
        permissions.add(permission.name);
      });
      User.getPermissionNamesFromRoles(role.children, permissions);
    });
  }

  public can(permissionNames: string | string[], all?: boolean): boolean {
    const userPermissions = this.getPermissionNames();
    return all
      ? toArray(permissionNames).every(permission => userPermissions.has(permission))
      : toArray(permissionNames).some(permission => userPermissions.has(permission));
  }
}
