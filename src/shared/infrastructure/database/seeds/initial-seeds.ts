import { TypeOrmUserRepository } from '@shared/infrastructure/repositories/typeorm-user.repository';
import { TypeOrmRoleRepository } from '@shared/infrastructure/repositories/typeorm-role.repository';
import { TypeOrmPermissionRepository } from '@shared/infrastructure/repositories/typeorm-permission.repository';
import { TypeOrmGroupRepository } from '@shared/infrastructure/repositories/typeorm-group.repository';
import { SavePermissionUseCase } from '@domains/permission/use-cases/save-permission.use-case';
import { SaveRoleUseCase } from '@domains/role/use-cases/save-role.use-case';
import { AssignPermissionsToRoleUseCase } from '@domains/role/use-cases/assign-permissions-to-role.use-case';
import { CreateUserUseCase } from '@domains/user/use-cases/create-user.use-case';
import { AssignRoleToUserUseCase } from '@domains/user/use-cases/assign-role-to-user.use-case';
import { UserStatus } from '@domains/user/value-objects/user-status';

const crudActions = ['create', 'read', 'update', 'delete'];
const adminSections = [
  'colaborator-group',
  'colaborator',
  'company',
  'contract',
  'document-model',
  'document-template',
  'document-type',
  'document',
  'family',
  'group',
  'permission',
  'role',
  'user',
  'area',
  'division',
  'signature-flow',
];
const extraPermissions = [
  'admin:groups',
  'admin:roles',
  'colaborator-group:assign:colaborator',
  'colaborator-group:assign:document',
  'admin:colaborator:manage-template',
  'contract:assign:reviewer',
  'contract:finalize',
  'dashboard:read',
  'document:review',
  'file:share',
  'group:assign:user',
  'role:assign:permission',
  'user:assign:role',
  'user:change:group',
  'user:empty:group',
  'signature:create',
  'signature:read',
  'signature:delete',
  'signature-flow:report:read',
  'signature-flow:resend:any',
  'signature-flow:close:any',
  'signature-flow:reopen',
  'admin:email-queue',
  'landing-settings:read',
  'landing-settings:update',
];

// Otros permisos que no se deben agregar a los roles de admin
const otherPermissions = [
  'group:owner',
];

export async function runInitialSeedsIfEmpty(): Promise<void> {
  const email = process.env.SEEDER_ADMIN_EMAIL;
  const password = process.env.SEEDER_ADMIN_PASSWORD;
  const roleName = process.env.SEEDER_ADMIN_ROLE;
  // Ignore seeder if any environment variables is missing
  if (!email || !password || !roleName) return;

  const userRepository = new TypeOrmUserRepository();
  const roleRepository = new TypeOrmRoleRepository();
  const permissionRepository = new TypeOrmPermissionRepository();
  const groupRepository = new TypeOrmGroupRepository();

  const savePermissionUseCase = new SavePermissionUseCase(permissionRepository);
  const saveRoleUseCase = new SaveRoleUseCase(roleRepository);
  const assignPermissionsToRoleUseCase = new AssignPermissionsToRoleUseCase(roleRepository, permissionRepository);
  const createUserUseCase = new CreateUserUseCase(userRepository, roleRepository, groupRepository);
  const assignRoleToUserUseCase = new AssignRoleToUserUseCase(userRepository, roleRepository);

  const existingUser = await userRepository.findByEmail(email);

  const adminRole = await roleRepository.findByName(roleName) ||
    await saveRoleUseCase.execute({ name: roleName, description: 'Administrador' });

  if (!existingUser) {
    await createUserUseCase.execute({
      email,
      firstName: 'Admin',
      lastName: 'User',
      password,
      roleIds: adminRole?.id ? [adminRole.id] : [],
      status: UserStatus.ACTIVE,
    });
  } else if (!existingUser.roles?.some(r => r.id === adminRole!.id)) {
    await assignRoleToUserUseCase.execute({ userId: existingUser.id, roleIds: [adminRole.id] });
  }

  const basePermissionNames = adminSections.flatMap(m => crudActions.map(a => `${m}:${a}`));
  const adminPermissions = [...new Set([...basePermissionNames, ...extraPermissions])];

  const currentPermissions = await permissionRepository.findAll();
  const existingNames = new Set(currentPermissions.map(p => p.name));
  for (const name of adminPermissions) {
    if (!existingNames.has(name)) {
      await savePermissionUseCase.execute({ name, description: name });
    }
  }
  for (const name of otherPermissions) {
    if (!existingNames.has(name)) {
      await savePermissionUseCase.execute({ name, description: name });
    }
  }

  const allPermissions = await permissionRepository.findAll();
  const permissionIds = allPermissions.filter(p => adminPermissions.includes(p.name)).map(p => p.id!).filter(Boolean);
  if (adminRole?.id && permissionIds.length > 0) {
    await assignPermissionsToRoleUseCase.execute({ roleId: adminRole.id, permissionIds });
  }
}
