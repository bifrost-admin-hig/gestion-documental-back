import { EntityUtils } from "@shared/utils/common";
import { ValidationError } from "@shared/domain/errors";

export interface CreateDivisionProps {
  id?: string;
  name: string;
  description?: string;
  groupId: number;
  groupName?: string;
  areaId: string;
  areaName?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UpdateDivisionProps extends CreateDivisionProps {
  id: string;
}

export interface DivisionJson {
  id?: string;
  name: string;
  description?: string;
  groupId: number;
  groupName?: string;
  areaId: string;
  areaName?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Division {
  id?: string;
  name: string;
  description?: string;
  groupId: number;
  groupName?: string;
  areaId: string;
  areaName?: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(props: CreateDivisionProps) {
    Division.validate(props);
    EntityUtils.assign(this as Division, props, {
      createdAt: 'datetime',
      updatedAt: 'datetime',
    });
  }

  private static validate(props: CreateDivisionProps): void {
    if (!props.name?.trim()) {
      throw new ValidationError('Division name is required', 'name');
    }
    if (props.name.length > 255) {
      throw new ValidationError('Division name is too long', 'name');
    }
    if (!props.groupId) {
      throw new ValidationError('Group ID is required', 'groupId');
    }
    if (!props.areaId?.trim()) {
      throw new ValidationError('Area ID is required', 'areaId');
    }
  }

  toJSON(): DivisionJson {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      groupId: this.groupId,
      groupName: this.groupName,
      areaId: this.areaId,
      areaName: this.areaName,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
