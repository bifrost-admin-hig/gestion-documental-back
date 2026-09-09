/// <reference types="bun" />
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import supertest from 'supertest';
import { Application } from 'express';
import { App } from '@/app';
import { AppDataSource, clearDatabase } from '@shared/infrastructure/database/typeorm.config';
import { DependencyContainer } from '@/dependency-container';
import { User } from '@domains/user/entities/user.entity';

describe('UserController', () => {
  let appInstance: App;
  let app: Application;
  let dependencyContainer: DependencyContainer;
  let user: User;

  beforeAll(async () => {
    process.env.ENABLE_RBAC = 'true';
    appInstance = new App();
    await appInstance.initialize();
    app = appInstance.getApp();

    dependencyContainer = new DependencyContainer();
    await dependencyContainer.initialize();
  });

  afterAll(async () => {
    await appInstance.close();
  });

  beforeEach(async () => {
    await clearDatabase(AppDataSource);

    const roleRepository = dependencyContainer.getRoleRepository();
    const permissionRepository = dependencyContainer.getPermissionRepository();
    const createUserUseCase = dependencyContainer.getCreateUserUseCase();
    const assignPermissionsToRoleUseCase = dependencyContainer.getAssignPermissionsToRoleUseCase();

    // Create permissions
    const permissions = [
      'user:create',
      'user:read',
      'user:update',
      'user:delete',
      'user:assign:role',
      'user:empty:group',
    ];

    const createdPermissions = [];
    for (const name of permissions) {
      const p = await permissionRepository.save({ name, description: `Permission for ${name}` });
      createdPermissions.push(p);
    }

    // Create admin role
    const adminRole = await roleRepository.save({
      name: 'admin.role',
      description: 'Admin role',
    });

    // Assign permissions to role
    await assignPermissionsToRoleUseCase.execute({
      roleId: adminRole.id!,
      permissionIds: createdPermissions.map(p => p.id!),
    });

    // Create test user
    user = await createUserUseCase.execute({
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      password: 'password123',
      roleIds: [adminRole.id!],
    });
  });

  describe('/api/users', () => {
    const userDtoBase = {
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      password: 'Secret123!',
    };

    async function createRole(name: string) {
      const roleRepository = dependencyContainer.getRoleRepository();
      const role = await roleRepository.save({ name, description: name });
      return role.id as number;
    }

    it('should create a new user and return 201', async () => {
      const roleId = await createRole('user.role');
      const response = await supertest(app)
        .post('/api/users')
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send({ ...userDtoBase, roleIds: [roleId] });

      if (response.status !== 201) {
        console.log('Create User Failed:', JSON.stringify(response.body, null, 2));
      }

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User created successfully');
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.email).toBe(userDtoBase.email);
      expect(response.body.data.roles.length).toBe(1);
    });

    it('should update a user and return 200', async () => {
      const roleId = await createRole('user.role');
      const createResponse = await supertest(app)
        .post('/api/users')
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send({ ...userDtoBase, roleIds: [roleId] });

      const userId = createResponse.body.data.id as string;

      const response = await supertest(app)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send({ firstName: 'Johnny', lastName: 'Doe' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User updated successfully');
      expect(response.body.data.firstName).toBe('Johnny');
    });

    it('should assign roles to a user and return 200', async () => {
      const role1 = await createRole('role.one');
      const role2 = await createRole('role.two');
      const createUserResponse = await supertest(app)
        .post('/api/users')
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send({ ...userDtoBase, roleIds: [role1] });
      const userId = createUserResponse.body.data.id as string;

      const response = await supertest(app)
        .post(`/api/users/${userId}/roles`)
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send({ roleIds: [role1, role2] });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Role assigned to user successfully');
      expect(response.body.data.roles.length).toBe(2);
    });

    it('should get all users and return 200', async () => {
      const roleId = await createRole('user.role');
      await supertest(app)
        .post('/api/users')
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send({ ...userDtoBase, roleIds: [roleId] });

      const response = await supertest(app)
        .get('/api/users')
        .set('Authorization', `Bearer user-id:${user.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // count might be 2 because we created user as well
      expect(response.body.count).toBeGreaterThanOrEqual(1);
    });

    it('should get user by id and return 200', async () => {
      const roleId = await createRole('user.role');
      const createResponse = await supertest(app)
        .post('/api/users')
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send({ ...userDtoBase, roleIds: [roleId] });
      const userId = createResponse.body.data.id as string;

      const response = await supertest(app)
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer user-id:${user.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(userId);
    });

    it('should return 409 if user email already exists', async () => {
      const roleId = await createRole('user.role');
      await supertest(app)
        .post('/api/users')
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send({ ...userDtoBase, roleIds: [roleId] });

      const response = await supertest(app)
        .post('/api/users')
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send({ ...userDtoBase, roleIds: [roleId] });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('CONFLICT');
    });

    it('should delete a user and return 200', async () => {
      const roleId = await createRole('user.role');
      const createResponse = await supertest(app)
        .post('/api/users')
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send({ ...userDtoBase, roleIds: [roleId] });

      const userId = createResponse.body.data.id as string;

      const response = await supertest(app)
        .delete(`/api/users/${userId}`)
        .set('Authorization', `Bearer user-id:${user.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User deleted successfully');
    });

    it('should return 400 if validation fails on create', async () => {
      const response = await supertest(app)
        .post('/api/users')
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send({ email: '', firstName: '', lastName: '', password: '' });
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
