export interface CreatePermissionDto {
  name: string;
  description?: string;
}

export type UpdatePermissionDto = Partial<CreatePermissionDto>;
