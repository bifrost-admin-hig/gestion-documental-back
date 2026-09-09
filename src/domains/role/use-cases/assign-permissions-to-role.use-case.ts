import { RoleRepository } from '@domains/role/repositories/role.repository';
import { PermissionRepository } from '@domains/permission/repositories/permission.repository';
import { Role } from '@domains/role/entities/role.entity';
import { User } from '@domains/user/entities/user.entity';
import { ForbiddenError, NotFoundError } from '@shared/domain/errors';
import { Permission } from '@domains/permission/entities/permission.entity';

export class AssignPermissionsToRoleUseCase {
  constructor(
    private readonly roleRepository: RoleRepository,
    private readonly permissionRepository: PermissionRepository,
  ) {}

  async execute(input: { roleId: number; permissionIds: number[]; currentUser?: User }): Promise<Role> {
    const { roleId, permissionIds, currentUser } = input;
    const role = await this.roleRepository.findById(roleId);
    if (!role) throw new NotFoundError('Role');

    const permissions = await this.permissionRepository.findIn(permissionIds);
    if (permissions.length !== permissionIds.length) {
      throw new NotFoundError('One or more permissions');
    }

    if (currentUser && !currentUser.can('admin:roles')) {
      const currentPermissions = currentUser.getPermissionNames()!;
      const invalid = (permissions: Permission[]) => permissions.map((p) => p.name).some((p) => !currentPermissions.has(p));
      if (invalid(role.permissions) || invalid(permissions)) {
        throw new ForbiddenError('You can only assign permissions you have');
      }
    }

    return this.roleRepository.update({
      id: roleId,
      name: role.name,
      description: role.description,
      permissions: permissions,
      parents: role.parents,
      children: role.children,
    });
  }
}
