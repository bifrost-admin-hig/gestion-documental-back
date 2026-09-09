import { ConflictError, NotFoundError, ForbiddenError } from '@shared/domain/errors';
import { Role, UpdateRoleProps } from '@domains/role/entities/role.entity';
import { RoleRepository } from '@domains/role/repositories/role.repository';
import { UserRepository } from '@domains/user/repositories/user.repository';
import { User } from '@domains/user/entities/user.entity';

export class UpdateRoleUseCase {
  constructor(private readonly roleRepository: RoleRepository) {}

  async execute(props: UpdateRoleProps & { currentUser?: User }): Promise<Role> {
    const { currentUser, ...updateProps } = props;

    const role = await this.roleRepository.findById(updateProps.id);
    if (!role) {
      throw new NotFoundError(`Role with ID ${updateProps.id} not found`);
    }

    if (updateProps.permissions) {
      if (currentUser && !currentUser.can('admin:roles')) {
        throw new ForbiddenError('Permissions cannot be updated via this endpoint. Please use the dedicated permission assignment endpoint.');
      }
    }

    if (updateProps.name) {
      const existing = await this.roleRepository.findByName(updateProps.name);
      if (existing && existing.id !== updateProps.id) {
        throw new ConflictError('Role name already taken');
      }
    }

    return this.roleRepository.update(updateProps);
  }
}

export class DeleteRoleUseCase {
  constructor(
    private readonly roleRepository: RoleRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(id: number): Promise<void> {
    const role = await this.roleRepository.findById(id);
    if (!role) {
      throw new NotFoundError(`Role with ID ${id} not found`);
    }

    const usersWithRole = await this.userRepository.findByRoleId(id);
    if (usersWithRole.length > 0) {
      throw new ConflictError(
        `Cannot delete role "${role.name}" because it is assigned to ${usersWithRole.length} user(s)`,
      );
    }

    await this.roleRepository.delete(id);
  }
}
