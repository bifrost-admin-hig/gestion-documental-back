import { PermissionRepository } from '@domains/permission/repositories/permission.repository';

export class DeletePermissionUseCase {
  constructor(private readonly permissionRepository: PermissionRepository) {}

  async execute(id: number): Promise<void> {
    const permission = await this.permissionRepository.findById(id);
    if (!permission) {
      throw new Error('Permission not found');
    }

    return this.permissionRepository.delete(id);
  }
}
