import { Permission } from '@domains/permission/entities/permission.entity';
import { PermissionRepository } from '@domains/permission/repositories/permission.repository';

export class FindAllPermissionsUseCase {
  constructor(private readonly permissionRepository: PermissionRepository) {}

  async execute(): Promise<Permission[]> {
    return this.permissionRepository.findAll();
  }
}

export class FindPermissionByIdUseCase {
  constructor(private readonly permissionRepository: PermissionRepository) {}

  async execute(id: number): Promise<Permission | null> {
    return this.permissionRepository.findById(id);
  }
}

export class FindPermissionByNameUseCase {
  constructor(private readonly permissionRepository: PermissionRepository) {}

  async execute(name: string): Promise<Permission | null> {
    return this.permissionRepository.findByName(name);
  }
}

export class FindPermissionsInUseCase {
  constructor(private readonly permissionRepository: PermissionRepository) {}

  async execute(ids: number[]): Promise<Permission[]> {
    return this.permissionRepository.findIn(ids);
  }
}
