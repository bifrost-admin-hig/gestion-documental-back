import { Colaborator, ColaboratorJson } from "@domains/colaborators/entities/colaborator.entity";
import { ValidationError } from "@shared/domain/errors";
import { EntityUtils } from "@shared/utils/common";

export interface CreateColaboratorGroupProps {
  name: string;
  contractId: string;
  description?: string;
  colaborators?: Colaborator[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UpdateColaboratorGroupProps extends Partial<CreateColaboratorGroupProps> {
  id: number;
}

export interface ColaboratorGroupJson {
  id: number;
  name: string;
  contractId: string;
  description?: string;
  colaborators: ColaboratorJson[];
  createdAt?: Date;
  updatedAt?: Date;
}

export class ColaboratorGroup {
  id: number;
  name: string;
  contractId: string;
  description?: string;
  colaborators: Colaborator[];
  createdAt?: Date;
  updatedAt?: Date;

  constructor(group: CreateColaboratorGroupProps & { id?: number }) {
    ColaboratorGroup.validate(group);
    EntityUtils.assign(this as ColaboratorGroup, group, {
      colaborators: (colaborators?: Colaborator[]) => colaborators ?? [],
      createdAt: 'datetime',
      updatedAt: 'datetime',
    });
  }

  private static validate(props: CreateColaboratorGroupProps): void {
    if (!props.name?.trim()) {
      throw new ValidationError('Colaborator group name is required', 'name');
    }
    if (props.name.length > 255) {
      throw new ValidationError('Colaborator group name is too long', 'name');
    }
    if (!props.contractId) {
      throw new ValidationError('Contract ID is required', 'contractId');
    }
  }

  toJSON(): ColaboratorGroupJson {
    return {
      id: this.id,
      name: this.name,
      contractId: this.contractId,
      description: this.description,
      colaborators: this.colaborators?.map((colaborator) => colaborator.toJSON()) ?? [],
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
