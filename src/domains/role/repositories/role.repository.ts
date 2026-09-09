import { CreateRoleProps, Role, UpdateRoleProps } from '../entities/role.entity';

export interface RoleRepository {
  assignPermissionsToRole(roleId: number, permissionIds: number[]): Promise<void>;
  findById(id: number): Promise<Role | null>;
  findByName(name: string): Promise<Role | null>;
  findIn(ids: number[]): Promise<Role[]>;
  findAll(): Promise<Role[]>;
  save(request: CreateRoleProps): Promise<Role>;
  update(request: UpdateRoleProps): Promise<Role>;
  delete(id: number): Promise<void>;
}
