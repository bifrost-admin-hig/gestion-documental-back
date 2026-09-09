import { CreateRoleDto } from '@presentation/dto/role/role.dto';
import { ConflictError, ForbiddenError } from '@shared/domain/errors';
import { Role } from '@domains/role/entities/role.entity';
import { RoleRepository } from '@domains/role/repositories/role.repository';
import { User } from '@domains/user/entities/user.entity';

export class SaveRoleUseCase {
  constructor(private readonly roleRepository: RoleRepository) {}

  async execute(input: CreateRoleDto & { currentUser?: User }): Promise<Role> {
    const { currentUser, ...roleInput } = input;

    if (currentUser && !currentUser.can('admin:roles') && roleInput.permissions && roleInput.permissions.length > 0) {
      throw new ForbiddenError('Permissions cannot be assigned during role creation by this user. Please use the dedicated permission assignment endpoint.');
    }

    const existingRole = await this.roleRepository.findByName(roleInput.name);
    if (existingRole) {
      throw new ConflictError('Role already exists');
    }

    const role = new Role(roleInput);
    const savedRole = await this.roleRepository.save(role);
    return savedRole;
  }
}
