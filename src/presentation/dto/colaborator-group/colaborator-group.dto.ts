export interface CreateColaboratorGroupDto {
  name: string;
  contractId: string;
  description?: string;
  colaborators?: any[];
}

export type UpdateColaboratorGroupDto = Partial<CreateColaboratorGroupDto>;
