import { ConflictError } from '@shared/domain/errors';
import { CreatePermissionProps, Permission } from '@domains/permission/entities/permission.entity';
import { PermissionRepository } from '@domains/permission/repositories/permission.repository';

export class SavePermissionUseCase {
  constructor(private readonly permissionRepository: PermissionRepository) {}

  async execute(input: CreatePermissionProps): Promise<Permission> {
    const existingPermission = await this.permissionRepository.findByName(input.name);
    if (existingPermission) {
      throw new ConflictError('Permission already exists');
    }

    return this.permissionRepository.save(input);
  }
}
