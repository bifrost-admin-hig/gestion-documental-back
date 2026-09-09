/// <reference types="bun" />
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import supertest from 'supertest';
import { Application } from 'express';
import { App } from '@/app';
import { AppDataSource, clearDatabase } from '@shared/infrastructure/database/typeorm.config';
import { DependencyContainer } from '@/dependency-container';
import FileUtils from '@shared/utils/FileUtils';

const UPLOAD_DIR = 'bulk-template-routes-tests';
const TEST_UPLOAD_DIR = `./uploads/${UPLOAD_DIR}`;

describe('BulkTemplateController - Colaborators', () => {
  let appInstance: App;
  let app: Application;
  let dependencyContainer: DependencyContainer;
  let userId: string;
  let userIdNoPermission: string;

  beforeAll(async () => {
    FileUtils.setUploadDir(TEST_UPLOAD_DIR);
    process.env.FILE_STORAGE = 'local';
    process.env.ENABLE_RBAC = 'true';
    process.env.JWT_SECRET = 'testsecret';

    appInstance = new App();
    await appInstance.initialize();
    app = appInstance.getApp();

    dependencyContainer = new DependencyContainer();
    await dependencyContainer.initialize();
  });

  afterAll(async () => {
    await FileUtils.removeDirectory(TEST_UPLOAD_DIR, { recursive: true, force: true });
    FileUtils.setUploadDir();
    await appInstance.close();
  });

  beforeEach(async () => {
    await clearDatabase(AppDataSource);

    const createUserUseCase = dependencyContainer.getCreateUserUseCase();
    const roleRepository = dependencyContainer.getRoleRepository();
    const permissionRepository = dependencyContainer.getPermissionRepository();

    // Create permissions
    const manageTemplatePermission = await permissionRepository.save({
      name: 'admin:colaborator:manage-template',
      description: 'Manage bulk upload templates for colaborators',
    });
    const readPermission = await permissionRepository.save({
      name: 'colaborator:read',
      description: 'Read colaborators',
    });

    // Create role with manage-template and read permissions
    const adminRole = await roleRepository.save({
      name: 'template-admin',
      description: 'Role with template management permissions',
      permissions: [manageTemplatePermission, readPermission],
    });

    // Create role with read-only permissions
    const readOnlyRole = await roleRepository.save({
      name: 'read-only',
      description: 'Read-only role',
      permissions: [readPermission],
    });

    // Create admin user
    const adminUser = await createUserUseCase.execute({
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      password: 'Password123!',
      roleIds: [adminRole.id!],
    });
    userId = adminUser.id;

    // Create read-only user
    const readUser = await createUserUseCase.execute({
      email: 'reader@example.com',
      firstName: 'Reader',
      lastName: 'User',
      password: 'Password123!',
      roleIds: [readOnlyRole.id!],
    });
    userIdNoPermission = readUser.id;
  });

  const getXlsxBase64 = () => {
    // Minimal valid base64 content for an xlsx file
    return Buffer.from('PK test xlsx content').toString('base64');
  };

  describe('POST /api/colaborators/bulk/template', () => {
    it('should upload a template and return 201', async () => {
      const response = await supertest(app)
        .post('/api/colaborators/bulk/template')
        .set('Authorization', `Bearer user-id:${userId}`)
        .send({
          filename: 'plantilla-colaboradores.xlsx',
          contentBase64: getXlsxBase64(),
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.type).toBe('colaborators');
      expect(response.body.data.isActive).toBe(true);
      expect(response.body.data.file).toBeDefined();
    });

    it('should return 403 when user lacks manage-template permission', async () => {
      const response = await supertest(app)
        .post('/api/colaborators/bulk/template')
        .set('Authorization', `Bearer user-id:${userIdNoPermission}`)
        .send({
          filename: 'plantilla-colaboradores.xlsx',
          contentBase64: getXlsxBase64(),
        });

      expect(response.status).toBe(403);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await supertest(app)
        .post('/api/colaborators/bulk/template')
        .send({
          filename: 'plantilla-colaboradores.xlsx',
          contentBase64: getXlsxBase64(),
        });

      expect(response.status).toBe(401);
    });

    it('should return 400 if filename is missing', async () => {
      const response = await supertest(app)
        .post('/api/colaborators/bulk/template')
        .set('Authorization', `Bearer user-id:${userId}`)
        .send({
          contentBase64: getXlsxBase64(),
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 if contentBase64 is missing', async () => {
      const response = await supertest(app)
        .post('/api/colaborators/bulk/template')
        .set('Authorization', `Bearer user-id:${userId}`)
        .send({
          filename: 'plantilla-colaboradores.xlsx',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid file extension', async () => {
      const response = await supertest(app)
        .post('/api/colaborators/bulk/template')
        .set('Authorization', `Bearer user-id:${userId}`)
        .send({
          filename: 'plantilla.pdf',
          contentBase64: getXlsxBase64(),
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should deactivate previous template when a new one is uploaded', async () => {
      // Upload first template
      await supertest(app)
        .post('/api/colaborators/bulk/template')
        .set('Authorization', `Bearer user-id:${userId}`)
        .send({
          filename: 'plantilla-v1.xlsx',
          contentBase64: getXlsxBase64(),
        });

      // Upload second template
      const response = await supertest(app)
        .post('/api/colaborators/bulk/template')
        .set('Authorization', `Bearer user-id:${userId}`)
        .send({
          filename: 'plantilla-v2.xlsx',
          contentBase64: getXlsxBase64(),
        });

      expect(response.status).toBe(201);
      expect(response.body.data.isActive).toBe(true);
      expect(response.body.data.file.originalName).toBe('plantilla-v2.xlsx');
    });
  });

  describe('GET /api/colaborators/bulk/template', () => {
    it('should return 404 when no active template exists', async () => {
      const response = await supertest(app)
        .get('/api/colaborators/bulk/template')
        .set('Authorization', `Bearer user-id:${userId}`);

      expect(response.status).toBe(404);
    });

    it('should return the active template metadata', async () => {
      // Upload a template first
      await supertest(app)
        .post('/api/colaborators/bulk/template')
        .set('Authorization', `Bearer user-id:${userId}`)
        .send({
          filename: 'plantilla-colaboradores.xlsx',
          contentBase64: getXlsxBase64(),
        });

      const response = await supertest(app)
        .get('/api/colaborators/bulk/template')
        .set('Authorization', `Bearer user-id:${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('colaborators');
      expect(response.body.data.isActive).toBe(true);
      expect(response.body.data.file).toBeDefined();
    });

    it('should allow read-only user to get active template', async () => {
      // Upload a template with admin user
      await supertest(app)
        .post('/api/colaborators/bulk/template')
        .set('Authorization', `Bearer user-id:${userId}`)
        .send({
          filename: 'plantilla-colaboradores.xlsx',
          contentBase64: getXlsxBase64(),
        });

      const response = await supertest(app)
        .get('/api/colaborators/bulk/template')
        .set('Authorization', `Bearer user-id:${userIdNoPermission}`);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/colaborators/bulk/template/download', () => {
    it('should return 404 when no active template exists', async () => {
      const response = await supertest(app)
        .get('/api/colaborators/bulk/template/download')
        .set('Authorization', `Bearer user-id:${userId}`);

      expect(response.status).toBe(404);
    });

    it('should download the active template file', async () => {
      // Upload a template first
      await supertest(app)
        .post('/api/colaborators/bulk/template')
        .set('Authorization', `Bearer user-id:${userId}`)
        .send({
          filename: 'plantilla-colaboradores.xlsx',
          contentBase64: getXlsxBase64(),
        });

      const response = await supertest(app)
        .get('/api/colaborators/bulk/template/download')
        .set('Authorization', `Bearer user-id:${userId}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-disposition']).toContain('attachment');
    });
  });

  describe('GET /api/colaborators/bulk/template/history', () => {
    it('should return an empty array when no templates exist', async () => {
      const response = await supertest(app)
        .get('/api/colaborators/bulk/template/history')
        .set('Authorization', `Bearer user-id:${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeArray();
      expect(response.body.data).toHaveLength(0);
    });

    it('should return all templates ordered by createdAt DESC', async () => {
      // Upload two templates
      await supertest(app)
        .post('/api/colaborators/bulk/template')
        .set('Authorization', `Bearer user-id:${userId}`)
        .send({ filename: 'plantilla-v1.xlsx', contentBase64: getXlsxBase64() });

      await new Promise(resolve => setTimeout(resolve, 10));

      await supertest(app)
        .post('/api/colaborators/bulk/template')
        .set('Authorization', `Bearer user-id:${userId}`)
        .send({ filename: 'plantilla-v2.xlsx', contentBase64: getXlsxBase64() });

      const response = await supertest(app)
        .get('/api/colaborators/bulk/template/history')
        .set('Authorization', `Bearer user-id:${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      // Most recent first
      expect(response.body.data[0].file.originalName).toBe('plantilla-v2.xlsx');
      expect(response.body.data[1].file.originalName).toBe('plantilla-v1.xlsx');
    });

    it('should return 403 when user lacks manage-template permission', async () => {
      const response = await supertest(app)
        .get('/api/colaborators/bulk/template/history')
        .set('Authorization', `Bearer user-id:${userIdNoPermission}`);

      expect(response.status).toBe(403);
    });
  });
});
