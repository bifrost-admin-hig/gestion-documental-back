import { EntityUtils } from "@shared/utils/common";
import { ValidationError } from "@shared/domain/errors";
import { User, UserJson } from "@domains/user/entities/user.entity";

export interface CreateGroupProps {
  id?: number;
  name: string;
  description?: string;
  users?: User[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UpdateGroupProps extends CreateGroupProps {
  id: number;
}

export interface GroupJson {
  id?: number;
  name: string;
  description?: string;
  users?: UserJson[];
  createdAt?: Date;
  updatedAt?: Date;
}

export class Group {
  id?: number;
  name: string;
  description?: string;
  users: User[];
  createdAt: Date;
  updatedAt: Date;

  constructor(props: CreateGroupProps) {
    Group.validate(props);
    EntityUtils.assign(this as Group, props, {
      users: (users?: User[]) => users ?? [],
      createdAt: 'datetime',
      updatedAt: 'datetime',
    });
  }

  private static validate(props: CreateGroupProps): void {
    if (!props.name?.trim()) {
      throw new ValidationError('Group name is required', 'name');
    }
    if (props.name.length > 255) {
      throw new ValidationError('Group name is too long', 'name');
    }
  }

  public addUser(user: User): void {
    if (!this.users.find(u => u.id === user.id)) {
      this.users.push(user);
    }
  }

  public removeUser(userId: string): void {
    this.users = this.users.filter(u => u.id !== userId);
  }

  toJSON(): GroupJson {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      users: this.users?.map(u => u.toJSON()) ?? [],
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
