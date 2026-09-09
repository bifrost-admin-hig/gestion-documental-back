/// <reference types="bun" />
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import supertest from 'supertest';
import { Application } from 'express';
import { App } from '@/app';
import { AppDataSource, clearDatabase } from '@shared/infrastructure/database/typeorm.config';
import { TypeOrmUserRepository } from '@shared/infrastructure/repositories/typeorm-user.repository';
import { CreateUserUseCase } from '@domains/user/use-cases/create-user.use-case';
import { TypeOrmRoleRepository } from '@shared/infrastructure/repositories/typeorm-role.repository';
import { TypeOrmGroupRepository } from '@shared/infrastructure/repositories/typeorm-group.repository';
import { CreateGroupUseCase } from '@domains/group/use-cases/create-group.use-case';
import { SaveRoleUseCase } from '@domains/role/use-cases/save-role.use-case';
import { SavePermissionUseCase } from '@domains/permission/use-cases/save-permission.use-case';
import { TypeOrmPermissionRepository } from '@shared/infrastructure/repositories/typeorm-permission.repository';
import { User } from '@domains/user/entities/user.entity';
import { Role } from '@domains/role/entities/role.entity';
import { Permission } from '@domains/permission/entities/permission.entity';

describe('Auth Routes', () => {
  let appInstance: App;
  let app: Application;
  let userRepository: TypeOrmUserRepository;
  let roleRepository: TypeOrmRoleRepository;
  let groupRepository: TypeOrmGroupRepository;
  let permissionRepository: TypeOrmPermissionRepository;
  let createUserUseCase: CreateUserUseCase;
  let createGroupUseCase: CreateGroupUseCase;
  let saveRoleUseCase: SaveRoleUseCase;
  let savePermissionUseCase: SavePermissionUseCase;

  let testUser: User;
  let testRole: Role;
  let testPermission: Permission;
  let testGroupId: number;
  const testPassword = 'Password123!';

  beforeAll(async () => {
    process.env.ENABLE_RBAC = 'true';
    process.env.JWT_SECRET = 'testsecret'; // Use a test secret for JWT

    appInstance = new App();
    await appInstance.initialize();
    app = appInstance.getApp();

    userRepository = new TypeOrmUserRepository();
    roleRepository = new TypeOrmRoleRepository();
    groupRepository = new TypeOrmGroupRepository();
    permissionRepository = new TypeOrmPermissionRepository();
    createUserUseCase = new CreateUserUseCase(userRepository, roleRepository, groupRepository);
    createGroupUseCase = new CreateGroupUseCase(groupRepository);
    saveRoleUseCase = new SaveRoleUseCase(roleRepository);
    savePermissionUseCase = new SavePermissionUseCase(permissionRepository);
  });

  afterAll(async () => {
    await appInstance.close();
  });

  beforeEach(async () => {
    await clearDatabase(AppDataSource);

    // Create a test permission
    testPermission = await savePermissionUseCase.execute({ name: 'test.permission', description: 'Test Permission' });

    // Create a test role and assign the permission
    testRole = await saveRoleUseCase.execute({ name: 'Test Role', description: 'Role for testing', permissions: [testPermission] });

    // Create a test group
    const group = await createGroupUseCase.execute({
      name: 'Test Group',
      description: 'Group for testing',
    });
    testGroupId = group.id!;

    // Create a test user
    testUser = await createUserUseCase.execute({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      password: testPassword, // Pass plain password, use case will hash it
      roleIds: [testRole.id],
      groupId: testGroupId,
    });
  });

  describe('POST /api/auth/login', () => {
    it('should return a JWT token on successful login', async () => {
      const response = await supertest(app)
        .post('/api/auth/login')
        .send({ email: testUser.email.toString(), password: testPassword });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user).toBeDefined();
    });

    it('should return 400 if email is missing', async () => {
      const response = await supertest(app)
        .post('/api/auth/login')
        .send({ password: testPassword });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 if password is missing', async () => {
      const response = await supertest(app)
        .post('/api/auth/login')
        .send({ email: testUser.email.toString() });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 if both email and password are missing', async () => {
      const response = await supertest(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid email', async () => {
      const response = await supertest(app)
        .post('/api/auth/login')
        .send({ email: 'wrong@example.com', password: testPassword });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid password', async () => {
      const response = await supertest(app)
        .post('/api/auth/login')
        .send({ email: testUser.email.toString(), password: 'wrongpassword' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should return a successful logout message', async () => {
      const response = await supertest(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer user-id:${testUser.id}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logout successful');
    });
  });

  describe('GET /api/auth/permissions', () => {
    it('should return user permissions for an authenticated user', async () => {
      const response = await supertest(app)
        .get('/api/auth/permissions')
        .set('Authorization', `Bearer user-id:${testUser.id}`)
        .set('Cookie', [`groupId=${testGroupId}`]);

      if (response.status !== 200) {
        console.error('Permissions test failed:', JSON.stringify(response.body, null, 2));
      }

      expect(response.status).toBe(200);
      expect(response.body.data.permissions).toEqual([testPermission.name]);
    });

    it('should return 401 for unauthenticated access', async () => {
      const response = await supertest(app)
        .get('/api/auth/permissions');

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('No token provided');
    });

    it('should return 401 for invalid token', async () => {
      const response = await supertest(app)
        .get('/api/auth/permissions')
        .set('Authorization', 'Bearer invalidtoken');

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Invalid token');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user info including permissions', async () => {
      const response = await supertest(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer user-id:${testUser.id}`)
        .set('Cookie', [`groupId=${testGroupId}`]);

      expect(response.status).toBe(200);
      expect(response.body.data.email).toBe(testUser.email.toString());
      expect(response.body.data.permissions).toContain(testPermission.name);
      expect(Array.isArray(response.body.data.permissions)).toBe(true);
    });
  });
});
