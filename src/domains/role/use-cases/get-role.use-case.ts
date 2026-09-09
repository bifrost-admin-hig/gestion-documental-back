import { NotFoundError } from '@shared/domain/errors';
import { Role } from '@domains/role/entities/role.entity';
import { RoleRepository } from '@domains/role/repositories/role.repository';

export class GetRoleByIdUseCase {
  constructor(private readonly roleRepository: RoleRepository) {}

  async execute(id: number): Promise<Role> {
    const role = await this.roleRepository.findById(id);
    if (!role) {
      throw new NotFoundError(`Role with ID ${id} not found`);
    }
    return role;
  }
}

export class GetAllRolesUseCase {
  constructor(private readonly roleRepository: RoleRepository) {}

  async execute(): Promise<Role[]> {
    return this.roleRepository.findAll();
  }
}
