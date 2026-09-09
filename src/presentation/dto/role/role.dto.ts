export interface CreateRoleDto {
  name: string;
  description?: string;
  permissions?: any[];
}

export type UpdateRoleDto = Partial<CreateRoleDto>;
