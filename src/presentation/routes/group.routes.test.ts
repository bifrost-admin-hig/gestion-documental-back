import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import supertest from 'supertest';
import { Application } from 'express';
import { App } from '@/app';
import { AppDataSource, clearDatabase } from '@shared/infrastructure/database/typeorm.config';
import { DependencyContainer } from '@/dependency-container';
import { getUserEffectivePermissions, clearPermissionCache } from '@shared/security/authorization';
import { User } from '@domains/user/entities/user.entity';

describe('GroupController', () => {
  let appInstance: App;
  let app: Application;
  let createdUser: User;
  let createdUserChange: User;
  let dependencyContainer: DependencyContainer;

  beforeAll(async () => {
    process.env.ENABLE_RBAC = 'true';
    appInstance = new App();
    await appInstance.initialize();
    app = appInstance.getApp();

    dependencyContainer = new DependencyContainer();
    await dependencyContainer.initialize();

    // Database is initialized inside App.initialize()
    await clearDatabase(AppDataSource);

    const roleRepository = dependencyContainer.getRoleRepository();
    const permissionRepository = dependencyContainer.getPermissionRepository();
    const createUserUseCase = dependencyContainer.getCreateUserUseCase();

    // Create permissions for group operations
    const permissionNamesGroupAssign = [
      'group:create',
      'group:read',
      'group:update',
      'group:delete',
      'group:assign:user',
    ];

    const permissionNamesUserChange = [
      'group:create',
      'group:read',
      'group:update',
      'group:delete',
      'user:change:group',
    ];

    const createdPermissionsGroupAssign = [] as { id?: number; name: string }[];
    for (const name of permissionNamesGroupAssign) {
      const p = await permissionRepository.save({ name, description: `Permission for ${name}` });
      createdPermissionsGroupAssign.push(p);
    }

    const createdPermissionsUserChange = [] as { id?: number; name: string }[];
    for (const name of permissionNamesUserChange) {
      const existing = createdPermissionsGroupAssign.find(p => p.name === name);
      if (existing) {
        createdPermissionsUserChange.push(existing);
      } else {
        const p = await permissionRepository.save({ name, description: `Permission for ${name}` });
        createdPermissionsUserChange.push(p);
      }
    }

    // Create role with group:assign:user permission
    const roleGroupAssign = await roleRepository.save({
      name: 'role.group.assign',
      description: 'Role with group:assign:user permission',
    });

    const assignPermissionsToRoleUseCaseGroupAssign = dependencyContainer.getAssignPermissionsToRoleUseCase();
    await assignPermissionsToRoleUseCaseGroupAssign.execute({
      roleId: roleGroupAssign.id,
      permissionIds: createdPermissionsGroupAssign.map(p => p.id!),
    });

    // Create role with user:change:group permission
    const roleUserChange = await roleRepository.save({
      name: 'role.user.change',
      description: 'Role with user:change:group permission',
    });

    const assignPermissionsToRoleUseCaseUserChange = dependencyContainer.getAssignPermissionsToRoleUseCase();
    await assignPermissionsToRoleUseCaseUserChange.execute({
      roleId: roleUserChange.id,
      permissionIds: createdPermissionsUserChange.map(p => p.id!),
    });

    // Create test user with group:assign:user permission
    createdUser = await createUserUseCase.execute({
      email: 'test.group@example.com',
      firstName: 'Test',
      lastName: 'Group',
      password: 'password123',
      roleIds: [roleGroupAssign.id],
    });

    // Create test user with user:change:group permission
    createdUserChange = await createUserUseCase.execute({
      email: 'test.user@example.com',
      firstName: 'Test',
      lastName: 'User',
      password: 'password123',
      roleIds: [roleUserChange.id],
    });

    clearPermissionCache(createdUser.id);
    const perms = await getUserEffectivePermissions(createdUser.id);
    expect(perms.has('group:create')).toBe(true);
    expect(perms.has('group:assign:user')).toBe(true);

    clearPermissionCache(createdUserChange.id);
    const permsUserChange = await getUserEffectivePermissions(createdUserChange.id);
    expect(permsUserChange.has('group:create')).toBe(true);
    expect(permsUserChange.has('user:change:group')).toBe(true);
  });

  afterAll(async () => {
    await appInstance.close();
  });

  describe('/api/groups', () => {
    let createdGroupId: number;
    let createdGroup2Id: number;
    let testUserId: string;
    const groupDto = { name: 'Test Group', description: 'A test group' };
    const group2Dto = { name: 'Test Group 2', description: 'Another test group' };

    it('should create a new group and return 201', async () => {
      const response = await supertest(app)
        .post('/api/groups')
        .set('Authorization', `Bearer user-id:${createdUser.id}`)
        .send(groupDto);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Group created successfully');
      expect(response.body.data.id).toBeInteger();
      expect(response.body.data).toMatchObject({
        name: groupDto.name,
        description: groupDto.description,
      });
      createdGroupId = response.body.data.id;
    });

    it('should create a second group for testing user assignment', async () => {
      const response = await supertest(app)
        .post('/api/groups')
        .set('Authorization', `Bearer user-id:${createdUser.id}`)
        .send(group2Dto);

      expect(response.status).toBe(201);
      createdGroup2Id = response.body.data.id;
    });

    it('should get all groups and return 200', async () => {
      const response = await supertest(app)
        .get('/api/groups')
        .set('Authorization', `Bearer user-id:${createdUser.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeArray();
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should get a group by ID and return 200', async () => {
      const response = await supertest(app)
        .get(`/api/groups/${createdGroupId}`)
        .set('Authorization', `Bearer user-id:${createdUser.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: createdGroupId,
        name: groupDto.name,
        description: groupDto.description,
      });
    });

    it('should update a group and return 200', async () => {
      const updateData = { name: 'Updated Group', description: 'Updated description' };

      const response = await supertest(app)
        .put(`/api/groups/${createdGroupId}`)
        .set('Authorization', `Bearer user-id:${createdUser.id}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Group updated successfully');
      expect(response.body.data).toMatchObject({
        id: createdGroupId,
        name: updateData.name,
        description: updateData.description,
      });
    });

    it('should return 409 if group name already exists', async () => {
      const response = await supertest(app)
        .post('/api/groups')
        .set('Authorization', `Bearer user-id:${createdUser.id}`)
        .send({ name: 'Updated Group' });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('CONFLICT');
    });

    it('should return 400 if validation fails', async () => {
      const invalidDto = { name: '' }; // Invalid name

      const response = await supertest(app)
        .post('/api/groups')
        .set('Authorization', `Bearer user-id:${createdUser.id}`)
        .send(invalidDto);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    describe('/{id}/users', () => {
      beforeAll(async () => {
        // Create a basic role for the test user
        const roleRepository = dependencyContainer.getRoleRepository();
        const basicRole = await roleRepository.save({
          name: 'basic.user.role',
          description: 'Basic role for test user',
        });

        // Create a test user to assign to groups
        const createUserUseCase = dependencyContainer.getCreateUserUseCase();
        const user = await createUserUseCase.execute({
          email: 'user.for.group@example.com',
          firstName: 'User',
          lastName: 'ForGroup',
          password: 'password123',
          roleIds: [basicRole.id],
        });
        testUserId = user.id;
      });

      it('should add a user to a group and return 200', async () => {
        const response = await supertest(app)
          .post(`/api/groups/${createdGroupId}/users`)
          .set('Authorization', `Bearer user-id:${createdUser.id}`)
          .send({ userId: testUserId });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('User added to group successfully');
      });

      it('should return 409 when trying to add user to another group with group:assign:user permission', async () => {
        const response = await supertest(app)
          .post(`/api/groups/${createdGroup2Id}/users`)
          .set('Authorization', `Bearer user-id:${createdUser.id}`)
          .send({ userId: testUserId });

        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe('CONFLICT');
        expect(response.body.error.message).toContain('already belongs to group');
      });

      it('should allow changing user group with user:change:group permission', async () => {
        const response = await supertest(app)
          .post(`/api/groups/${createdGroup2Id}/users`)
          .set('Authorization', `Bearer user-id:${createdUserChange.id}`)
          .send({ userId: testUserId });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('User added to group successfully');

        // Verify user was moved from first group to second group
        const group1Response = await supertest(app)
          .get(`/api/groups/${createdGroupId}`)
          .set('Authorization', `Bearer user-id:${createdUser.id}`);

        const group2Response = await supertest(app)
          .get(`/api/groups/${createdGroup2Id}`)
          .set('Authorization', `Bearer user-id:${createdUserChange.id}`);

        expect(group1Response.body.data.users).toBeArray();
        expect(group1Response.body.data.users.length).toBe(0);
        expect(group2Response.body.data.users).toBeArray();
        expect(group2Response.body.data.users.length).toBe(1);
        expect(group2Response.body.data.users[0].id).toBe(testUserId);
      });

      it('should remove a user from a group and return 200', async () => {
        const response = await supertest(app)
          .delete(`/api/groups/${createdGroup2Id}/users/${testUserId}`)
          .set('Authorization', `Bearer user-id:${createdUser.id}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('User removed from group successfully');

        // Verify user was removed
        const groupResponse = await supertest(app)
          .get(`/api/groups/${createdGroup2Id}`)
          .set('Authorization', `Bearer user-id:${createdUser.id}`);

        expect(groupResponse.body.data.users).toBeArray();
        expect(groupResponse.body.data.users.length).toBe(0);
      });
    });

    describe('/assign-to-user/{userId}', () => {
      it('should assign a group to a user and return 200', async () => {
        const response = await supertest(app)
          .post(`/api/groups/assign-to-user/${testUserId}`)
          .set('Authorization', `Bearer user-id:${createdUser.id}`)
          .send({ groupId: createdGroupId });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Group assigned to user successfully');

        // Verify user is in the group
        const groupResponse = await supertest(app)
          .get(`/api/groups/${createdGroupId}`)
          .set('Authorization', `Bearer user-id:${createdUser.id}`);

        expect(groupResponse.body.data.users).toBeArray();
        expect(groupResponse.body.data.users.length).toBe(1);
        expect(groupResponse.body.data.users[0].id).toBe(testUserId);
      });

      it('should return 409 when trying to assign another group with group:assign:user permission', async () => {
        const response = await supertest(app)
          .post(`/api/groups/assign-to-user/${testUserId}`)
          .set('Authorization', `Bearer user-id:${createdUser.id}`)
          .send({ groupId: createdGroup2Id });

        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe('CONFLICT');
      });

      it('should allow changing group with user:change:group permission', async () => {
        const response = await supertest(app)
          .post(`/api/groups/assign-to-user/${testUserId}`)
          .set('Authorization', `Bearer user-id:${createdUserChange.id}`)
          .send({ groupId: createdGroup2Id });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        // Verify user moved to new group
        const group2Response = await supertest(app)
          .get(`/api/groups/${createdGroup2Id}`)
          .set('Authorization', `Bearer user-id:${createdUserChange.id}`);

        expect(group2Response.body.data.users).toBeArray();
        expect(group2Response.body.data.users.length).toBe(1);
        expect(group2Response.body.data.users[0].id).toBe(testUserId);
      });
    });

    it('should delete a group and return 200', async () => {
      const response = await supertest(app)
        .delete(`/api/groups/${createdGroupId}`)
        .set('Authorization', `Bearer user-id:${createdUser.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Group deleted successfully');
    });

    it('should return 404 when getting deleted group', async () => {
      const response = await supertest(app)
        .get(`/api/groups/${createdGroupId}`)
        .set('Authorization', `Bearer user-id:${createdUser.id}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });
});
