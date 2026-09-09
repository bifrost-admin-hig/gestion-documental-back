import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import supertest from 'supertest';
import { Application } from 'express';
import { App } from '@/app';
import { AppDataSource, clearDatabase } from '@shared/infrastructure/database/typeorm.config';
import { DependencyContainer } from '@/dependency-container';

describe('CompanyController', () => {
  let appInstance: App;
  let app: Application;
  let dependencyContainer: DependencyContainer;
  let testGroupId: number;

  let adminUserId: string;
  let userId: string;

  beforeAll(async () => {
    process.env.ENABLE_RBAC = 'true';
    appInstance = new App();
    await appInstance.initialize();
    app = appInstance.getApp();

    dependencyContainer = new DependencyContainer();
    await dependencyContainer.initialize();

    await clearDatabase(AppDataSource);

    const roleRepository = dependencyContainer.getRoleRepository();
    const permissionRepository = dependencyContainer.getPermissionRepository();
    const createUserUseCase = dependencyContainer.getCreateUserUseCase();
    const groupRepository = dependencyContainer.getGroupRepository();

    // Create a group
    const group = await groupRepository.save({ name: 'Test Group', description: 'Test Group Desc' });
    testGroupId = group.id!;

    // Create permissions
    const companyPerms = ['company:create', 'company:read', 'company:update', 'company:delete'];
    const adminPerms = ['admin:groups', 'user:change:group'];

    const allPerms = [...companyPerms, ...adminPerms];
    const createdPerms = [];
    for (const name of allPerms) {
      createdPerms.push(await permissionRepository.save({ name, description: name }));
    }

    // Role with company perms
    const companyRole = await roleRepository.save({ name: 'company.role', description: 'Company Role' });
    await dependencyContainer.getAssignPermissionsToRoleUseCase().execute({
      roleId: companyRole.id,
      permissionIds: createdPerms.filter(p => companyPerms.includes(p.name)).map(p => p.id!),
    });

    // Admin role
    const adminRole = await roleRepository.save({ name: 'admin.role', description: 'Admin Role' });
    await dependencyContainer.getAssignPermissionsToRoleUseCase().execute({
      roleId: adminRole.id,
      permissionIds: createdPerms.map(p => p.id!),
    });

    // Create test user and assign to group
    const user = await createUserUseCase.execute({
      email: 'user@example.com',
      firstName: 'User',
      lastName: 'Test',
      password: 'password123',
      roleIds: [companyRole.id!],
    });
    userId = user.id;

    // Assign user to group using the use case directly
    await dependencyContainer.getAddUserToGroupUseCase().execute(testGroupId, user.id, 'group:assign:user');

    // Create admin user
    const adminUser = await createUserUseCase.execute({
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'Test',
      password: 'password123',
      roleIds: [adminRole.id!],
    });
    adminUserId = adminUser.id;
  });

  describe('/api/companies', () => {
    let createdCompanyId: string;

    it('should create a company for the users assigned group', async () => {
      const response = await supertest(app)
        .post('/api/companies')
        .set('Authorization', `Bearer user-id:${userId}`)
        .set('Cookie', [`groupId=${testGroupId}`]) // Essential for the middleware to pick it up
        .send({
          name: 'My Company',
          taxId: '12345678-9',
          address: 'Main St 123',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('My Company');
      expect(response.body.data.groupId).toBe(testGroupId);
      createdCompanyId = response.body.data.id;
    });

    it('should list companies in the assigned group', async () => {
      const response = await supertest(app)
        .get('/api/companies')
        .set('Authorization', `Bearer user-id:${userId}`)
        .set('Cookie', [`groupId=${testGroupId}`]);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeArray();
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].id).toBe(createdCompanyId);
    });

    it('should update company info', async () => {
      const response = await supertest(app)
        .put(`/api/companies/${createdCompanyId}`)
        .set('Authorization', `Bearer user-id:${userId}`)
        .send({ address: 'New Address 456' });

      expect(response.status).toBe(200);
      expect(response.body.data.address).toBe('New Address 456');
    });

    it('should NOT allow changing group without proper permissions', async () => {
      const response = await supertest(app)
        .put(`/api/companies/${createdCompanyId}`)
        .set('Authorization', `Bearer user-id:${userId}`)
        .send({ groupId: 999 }); // Trying to change it

      expect(response.status).toBe(403);
    });

    it('should ALLOW changing group with admin permissions', async () => {
      // Create another group
      const group2 = await dependencyContainer.getGroupRepository().save({ name: 'Group 2' });

      const response = await supertest(app)
        .put(`/api/companies/${createdCompanyId}`)
        .set('Authorization', `Bearer user-id:${adminUserId}`)
        .send({ groupId: group2.id });

      expect(response.status).toBe(200);
      expect(response.body.data.groupId).toBe(group2.id);
    });

    it('should delete company', async () => {
      const response = await supertest(app)
        .delete(`/api/companies/${createdCompanyId}`)
        .set('Authorization', `Bearer user-id:${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  afterAll(async () => {
    await appInstance.close();
  });
});
