import { UserRepository } from '../repositories/user.repository';
import { RoleRepository } from '../../role/repositories/role.repository';
import { UpdateUserProps, User } from '../entities/user.entity';
import { ForbiddenError, NotFoundError } from '@shared/domain/errors';

export class AssignRoleToUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
  ) {}

  async execute({ userId, roleIds, currentUser }: { userId: string; roleIds: number[]; currentUser?: User }): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundError('User');

    const roles = await this.roleRepository.findIn(roleIds);
    if (!roles || roles.length !== roleIds.length) throw new NotFoundError('One or more roles');

    if (currentUser && !currentUser.can('admin:roles')) {
      const currentPermissions = currentUser.getPermissionNames()!;
      roles.forEach((role) => {
        if (role.permissions?.some((p) => !currentPermissions.has(p.name))) {
          throw new ForbiddenError(`You can not assign/remove roles with permissions you do not have. Role: ${role.name}`);
        }
      });
    }

    user.assignRoles(roles);

    const props: UpdateUserProps = {
      id: user.id,
      email: user.email.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      password: user.password,
      roles: user.roles,
      status: user.status,
    };

    return this.userRepository.update(props);
  }
}
