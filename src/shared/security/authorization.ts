import { AppDataSource } from '@shared/infrastructure/database/typeorm.config';
import { UserEntity } from '@shared/infrastructure/database/entities/user.entity';
import { PermissionCache } from '@shared/infrastructure/cache/permission.cache';
import { User } from '@domains/user/entities/user.entity';

const cache = new PermissionCache(60);

export async function getUserEffectivePermissions(userId: string): Promise<Set<string>> {
  if (process.env.NODE_ENV !== 'test') {
    const cached = cache.get(userId);
    if (cached) return cached;
  }

  const userRepo = AppDataSource.getRepository(UserEntity);
  const user = await userRepo.findOne({
    where: { id: userId },
    relations: [
      'roles',
      'roles.permissions',
      'roles.children',
      'roles.children.permissions',
    ],
  });
  const names = new Set<string>();
  if (!user) return names;

  User.getPermissionNamesFromRoles(user.roles, names);
  if (process.env.NODE_ENV !== 'test') {
    cache.set(userId, names);
  }
  return names;
}

export function clearPermissionCache(userId?: string): void {
  cache.clear(userId);
}
