import { CreatePermissionProps, Permission, UpdatePermissionProps } from '../entities/permission.entity';

export interface PermissionRepository {
  findAll(): Promise<Permission[]>;
  findById(id: number): Promise<Permission | null>;
  findByName(name: string): Promise<Permission | null>;
  findIn(ids: number[]): Promise<Permission[]>;
  save(request: CreatePermissionProps): Promise<Permission>;
  update(request: UpdatePermissionProps): Promise<Permission>;
  delete(id: number): Promise<void>;
}
