import { Permission, UpdatePermissionProps } from '@domains/permission/entities/permission.entity';
import { PermissionRepository } from '@domains/permission/repositories/permission.repository';

export class UpdatePermissionUseCase {
  constructor(private readonly permissionRepository: PermissionRepository) {}

  async execute(id: number, input: UpdatePermissionProps): Promise<Permission> {
    const current = await this.permissionRepository.findById(id);
    if (!current) {
      throw new Error('Permission not found');
    }

    if (input.name) {
      const existing = await this.permissionRepository.findByName(input.name);
      if (existing && existing.id !== id) {
        throw new Error('Permission name already taken');
      }
    }

    return this.permissionRepository.update({
      id,
      name: input.name ?? current.name,
      description: input.description ?? current.description,
      createdAt: current.createdAt,
      updatedAt: new Date(),
    } as any);
  }
}
