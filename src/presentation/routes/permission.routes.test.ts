/// <reference types="bun" />
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import supertest from 'supertest';
import { Application } from 'express';
import { App } from '@/app';
import { Permission } from '@domains/permission/entities/permission.entity';
import { AppDataSource, clearDatabase } from '@shared/infrastructure/database/typeorm.config';

describe('PermissionController', () => {
  let appInstance: App;
  let app: Application;

  beforeAll(async () => {
    process.env.ENABLE_RBAC = 'false'; // Disable RBAC for basic permission tests
    appInstance = new App();
    await appInstance.initialize();
    app = appInstance.getApp();
  });

  afterAll(async () => {
    await appInstance.close();
  });

  beforeEach(async () => {
    await clearDatabase(AppDataSource);
  });

  describe('/api/permissions', () => {
    const permissionDto = { name: 'test.permission', description: 'A test permission' };

    it('should create a new permission and return 201', async () => {
      const expectedPermission = new Permission(permissionDto);

      const response = await supertest(app)
        .post('/api/permissions')
        .set('Authorization', 'Bearer user-id:random')
        .send(permissionDto);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Permission created successfully');
      expect(response.body.data.id).toBeInteger();
      expect(response.body.data).toMatchObject({
        name: expectedPermission.name,
        description: expectedPermission.description,
      });
    });

    it('should update a permission and return 200', async () => {
      // Create permission for this test
      const createResponse = await supertest(app)
        .post('/api/permissions')
        .set('Authorization', 'Bearer user-id:random')
        .send(permissionDto);
      const idToUpdate = createResponse.body.data.id;

      const updateDto = { ...permissionDto, description: 'Updated permission' };

      const response = await supertest(app)
        .put(`/api/permissions/${idToUpdate}`)
        .set('Authorization', 'Bearer user-id:random')
        .send(updateDto);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Permission updated successfully');
      expect(response.body.data).toMatchObject({
        id: idToUpdate,
        name: updateDto.name,
        description: updateDto.description,
      });
    });

    it('should return 409 if permission already exists', async () => {
      // Create the permission first
      await supertest(app)
        .post('/api/permissions')
        .set('Authorization', 'Bearer user-id:random')
        .send(permissionDto);

      // Then try to create it again, expecting 409
      const response = await supertest(app)
        .post('/api/permissions')
        .set('Authorization', 'Bearer user-id:random')
        .send(permissionDto);

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('CONFLICT');
    });

    it('should delete a permission and return 200', async () => {
      // Create permission for this test
      const createResponse = await supertest(app)
        .post('/api/permissions')
        .set('Authorization', 'Bearer user-id:random')
        .send(permissionDto);
      const idToDelete = createResponse.body.data.id;

      const response = await supertest(app)
        .delete(`/api/permissions/${idToDelete}`)
        .set('Authorization', 'Bearer user-id:random');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Permission deleted successfully');
    });

    it('should return 400 if validation fails', async () => {
      const invalidDto = { name: '' };

      const response = await supertest(app)
        .post('/api/permissions')
        .set('Authorization', 'Bearer user-id:random')
        .send(invalidDto);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
