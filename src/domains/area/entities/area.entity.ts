import { EntityUtils } from "@shared/utils/common";
import { ValidationError } from "@shared/domain/errors";

export interface CreateAreaProps {
  id?: string;
  name: string;
  description?: string;
  groupId: number;
  groupName?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UpdateAreaProps extends CreateAreaProps {
  id: string;
}

export interface AreaJson {
  id?: string;
  name: string;
  description?: string;
  groupId: number;
  groupName?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Area {
  id?: string;
  name: string;
  description?: string;
  groupId: number;
  groupName?: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(props: CreateAreaProps) {
    Area.validate(props);
    EntityUtils.assign(this as Area, props, {
      createdAt: 'datetime',
      updatedAt: 'datetime',
    });
  }

  private static validate(props: CreateAreaProps): void {
    if (!props.name?.trim()) {
      throw new ValidationError('Area name is required', 'name');
    }
    if (props.name.length > 255) {
      throw new ValidationError('Area name is too long', 'name');
    }
    if (!props.groupId) {
      throw new ValidationError('Group ID is required', 'groupId');
    }
  }

  toJSON(): AreaJson {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      groupId: this.groupId,
      groupName: this.groupName,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
