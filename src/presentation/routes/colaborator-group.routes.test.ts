/// <reference types="bun" />
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import supertest from 'supertest';
import { Application } from 'express';
import { App } from '@/app';
import { ColaboratorGroup } from '@domains/colaborator-group/entities/colaborator-group.entity';
import { AppDataSource, clearDatabase } from '@shared/infrastructure/database/typeorm.config';
import { DependencyContainer } from '@/dependency-container';
import { getUserEffectivePermissions, clearPermissionCache } from '@shared/security/authorization';
import { User } from '@domains/user/entities/user.entity';

describe('ColaboratorGroupController', () => {
  let appInstance: App;
  let app: Application;
  let authToken: string;
  let user: User;
  let dependencyContainer: DependencyContainer;
  let groupId: number;

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

    const permissionNames = [
      'colaborator-group:create',
      'colaborator-group:read',
      'colaborator-group:update',
      'colaborator-group:delete',
      'colaborator-group:assign:colaborator',
    ];

    const createdPermissions = [] as { id?: number; name: string }[];
    for (const name of permissionNames) {
      const p = await permissionRepository.save({ name, description: `Permission for ${name}` });
      createdPermissions.push(p);
    }

    expect(createdPermissions.every(p => typeof p.id === 'number')).toBe(true);
    const permissionNamesSaved = createdPermissions.map(p => p.name);
    expect(permissionNamesSaved).toEqual(permissionNames);

    const defaultRole = await roleRepository.save({ name: 'default.role', description: 'Default role for tests' });

    const loadedPermissions = await permissionRepository.findIn(createdPermissions.map(p => p.id!));
    expect(loadedPermissions.map(p => p.name)).toEqual(permissionNames);

    const assignPermissionsToRoleUseCase = dependencyContainer.getAssignPermissionsToRoleUseCase();
    await assignPermissionsToRoleUseCase.execute({ roleId: defaultRole.id, permissionIds: createdPermissions.map(p => p.id!) });

    const updatedRole = await roleRepository.findById(defaultRole.id);
    expect(updatedRole?.permissions.map(p => p.name)).toEqual(permissionNames);

    const groupRepository = dependencyContainer.getGroupRepository();
    const group = await groupRepository.save({ name: 'Test Group', description: 'Group for testing' });
    groupId = group.id!;

    user = await createUserUseCase.execute({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      password: 'password123',
      roleIds: [defaultRole.id],
      groupId,
    });

    const loginResponse = await supertest(app)
      .post('/api/auth/login')
      .send({ email: user.email.toString(), password: 'password123' });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.success).toBe(true);
    expect(loginResponse.body.data).toBeDefined();
    expect(loginResponse.body.data.token).toBeDefined();

    authToken = loginResponse.body.data.token;

    clearPermissionCache(user.id);
    const perms = await getUserEffectivePermissions(user.id);
    expect(perms.has('colaborator-group:create')).toBe(true);
    expect(perms.has('colaborator-group:read')).toBe(true);
    expect(perms.has('colaborator-group:update')).toBe(true);
    expect(perms.has('colaborator-group:delete')).toBe(true);
    expect(perms.has('colaborator-group:assign:colaborator')).toBe(true);
  });

  describe('/api/colaborator-groups', () => {
    let groupDto: any;
    let contractId: string;

    beforeEach(async () => {
      const contractRepository = dependencyContainer.getContractRepository();
      const contract = await contractRepository.save({
        rutSociedad: '76.123.456-7',
        nombreColaborador: 'Test Colaborator',
        administradorContratoMandante: 'Admin Mandante',
        administradorContratoEmpresa: 'Admin Empresa',
        rutAdministradorContrato: '12.345.678-9',
        contractNumber: 'CN-12345',
        nombreMandante: 'Mandante Corp',
        contractType: 'indefinido',
        jornadaTrabajo: 'completa',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        groupId,
      } as any);
      contractId = contract.id;
      groupDto = { name: 'test.group', description: 'A test colaborator group', contractId };
    });

    it('should create a new colaborator group and return 201', async () => {
      const expectedGroup = new ColaboratorGroup(groupDto);

      const response = await supertest(app)
        .post('/api/colaborator-groups')
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send(groupDto);


      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Colaborator group created successfully');
      expect(response.body.data.id).toBeInteger();
      expect(response.body.data).toMatchObject({
        name: expectedGroup.name,
        description: expectedGroup.description,
        contractId: expectedGroup.contractId,
      });
    });

    it('should get all colaborator groups and return 200', async () => {
      await supertest(app)
        .post('/api/colaborator-groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send(groupDto);

      const response = await supertest(app)
        .get('/api/colaborator-groups')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeArray();
      expect(response.body.count).toBeInteger();
    });

    it('should get a colaborator group by id and return 200', async () => {
      const createResponse = await supertest(app)
        .post('/api/colaborator-groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send(groupDto);
      const groupId = createResponse.body.data.id;

      const response = await supertest(app)
        .get(`/api/colaborator-groups/${groupId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(groupId);
    });

    it('should update a colaborator group and return 200', async () => {
      const createResponse = await supertest(app)
        .post('/api/colaborator-groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send(groupDto);
      const idToUpdate = createResponse.body.data.id;

      const updateDto = { ...groupDto, description: 'Updated group' };

      const response = await supertest(app)
        .put(`/api/colaborator-groups/${idToUpdate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateDto);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Colaborator group updated successfully');
      expect(response.body.data).toMatchObject({
        id: idToUpdate,
        name: updateDto.name,
        description: updateDto.description,
      });
    });

    it('should return 409 if colaborator group already exists', async () => {
      await supertest(app)
        .post('/api/colaborator-groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send(groupDto);

      const response = await supertest(app)
        .post('/api/colaborator-groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send(groupDto);

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('CONFLICT');
    });

    it('should delete a colaborator group and return 200', async () => {
      const createResponse = await supertest(app)
        .post('/api/colaborator-groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send(groupDto);
      const idToDelete = createResponse.body.data.id;

      const response = await supertest(app)
        .delete(`/api/colaborator-groups/${idToDelete}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Colaborator group deleted successfully');
    });

    it('should return 400 if validation fails', async () => {
      const invalidDto = { name: '' };

      const response = await supertest(app)
        .post('/api/colaborator-groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidDto);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    describe('/{id}/colaborators', () => {
      it('should get colaborators from a group and return 200', async () => {
        const createResponse = await supertest(app)
          .post('/api/colaborator-groups')
          .set('Authorization', `Bearer ${authToken}`)
          .send(groupDto);
        const groupId = createResponse.body.data.id;

        const response = await supertest(app)
          .get(`/api/colaborator-groups/${groupId}/colaborators`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeArray();
        expect(response.body.count).toBeInteger();
      });

      it('should return error when trying to assign non-existent colaborators', async () => {
        const createGroupResponse = await supertest(app)
          .post('/api/colaborator-groups')
          .set('Authorization', `Bearer ${authToken}`)
          .send(groupDto);
        const groupId = createGroupResponse.body.data.id;

        const colaboratorIds = [
          '00000000-0000-0000-0000-000000000001',
          '00000000-0000-0000-0000-000000000002',
        ];

        const response = await supertest(app)
          .post(`/api/colaborator-groups/${groupId}/colaborators`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ colaboratorIds });

        expect(response.status).toBe(500);
      });

      it('should return 400 if colaboratorIds is not provided', async () => {
        const createGroupResponse = await supertest(app)
          .post('/api/colaborator-groups')
          .set('Authorization', `Bearer ${authToken}`)
          .send(groupDto);
        const groupId = createGroupResponse.body.data.id;

        const response = await supertest(app)
          .post(`/api/colaborator-groups/${groupId}/colaborators`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });
  });
});
