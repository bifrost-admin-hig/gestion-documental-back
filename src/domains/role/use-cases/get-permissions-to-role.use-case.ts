import { Permission } from "@domains/permission/entities/permission.entity";
import { RoleRepository } from "@domains/role/repositories/role.repository";

export class GetPermissionsToRoleUseCase {
  constructor(
    private readonly roleRepository: RoleRepository,
  ) {}

  async execute(roleId: number): Promise<Permission[]> {
    const role = await this.roleRepository.findById(roleId);
    if (!role) {
      throw new Error('Role not found');
    }
    return role.permissions || [];
  }
}
