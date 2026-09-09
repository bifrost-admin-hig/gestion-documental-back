import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import supertest from 'supertest';
import { Application } from 'express';
import { App } from '@/app';
import { AppDataSource, clearDatabase } from '@shared/infrastructure/database/typeorm.config';
import FileUtils from '@shared/utils/FileUtils';
import { TypeOrmUserRepository } from '@shared/infrastructure/repositories/typeorm-user.repository';
import { TypeOrmRoleRepository } from '@shared/infrastructure/repositories/typeorm-role.repository';
import { TypeOrmGroupRepository } from '@shared/infrastructure/repositories/typeorm-group.repository';
import { CreateUserUseCase } from '@domains/user/use-cases/create-user.use-case';
import { SaveRoleUseCase } from '@domains/role/use-cases/save-role.use-case';
import { User } from '@domains/user/entities/user.entity';
import { Role } from '@domains/role/entities/role.entity';

describe('FileShareController', () => {
  let appInstance: App;
  let app: Application;
  let userRepository: TypeOrmUserRepository;
  let roleRepository: TypeOrmRoleRepository;
  let groupRepository: TypeOrmGroupRepository;
  let createUserUseCase: CreateUserUseCase;
  let saveRoleUseCase: SaveRoleUseCase;
  let user: User;
  let testRole: Role;
  const testPassword = 'Password123!';
  const UPLOAD_DIR = 'file-share-routes-tests';
  const TEST_UPLOAD_DIR = `./uploads/${UPLOAD_DIR}`;

  beforeAll(async () => {
    FileUtils.setUploadDir(TEST_UPLOAD_DIR);
    process.env.FILE_STORAGE = 'local';
    process.env.ENABLE_RBAC = 'true';
    process.env.JWT_SECRET = 'testsecret';

    appInstance = new App();
    await appInstance.initialize();
    app = appInstance.getApp();

    userRepository = new TypeOrmUserRepository();
    roleRepository = new TypeOrmRoleRepository();
    groupRepository = new TypeOrmGroupRepository();
    createUserUseCase = new CreateUserUseCase(userRepository, roleRepository, groupRepository);
    saveRoleUseCase = new SaveRoleUseCase(roleRepository);
  });

  beforeEach(async () => {
    await clearDatabase(AppDataSource);

    testRole = await saveRoleUseCase.execute({
      name: 'Test Role',
      description: 'Role for testing',
    });

    user = await createUserUseCase.execute({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      password: testPassword,
      roleIds: [testRole.id],
    });
  });

  afterAll(async () => {
    await FileUtils.removeDirectory(TEST_UPLOAD_DIR, { recursive: true, force: true });
    FileUtils.setUploadDir();
  });

  async function uploadTestFile(content = 'Test file content') {
    const base64Content = Buffer.from(content).toString('base64');
    const response = await supertest(app)
      .post('/api/files')
      .set('Authorization', `Bearer user-id:${user.id}`)
      .send({ filename: 'test.txt', contentBase64: base64Content, mimeType: 'text/plain' });
    expect(response.status).toBe(201);
    return response.body.data as { id: string };
  }

  describe('POST /api/files/:id/share', () => {
    it('should create a share link and return 201', async () => {
      const file = await uploadTestFile();

      const response = await supertest(app)
        .post(`/api/files/${file.id}/share`)
        .set('Authorization', `Bearer user-id:${user.id}`);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeString();
      expect(response.body.data.token).toHaveLength(64);
      expect(response.body.data.fileId).toBe(file.id);
      expect(response.body.data.expiresAt).toBeString();
    });

    it('should return 404 for non-existent file', async () => {
      const response = await supertest(app)
        .post('/api/files/non-existent-id/share')
        .set('Authorization', `Bearer user-id:${user.id}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 without auth', async () => {
      const file = await uploadTestFile();

      const response = await supertest(app).post(`/api/files/${file.id}/share`);
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/shared/files/:token', () => {
    it('should return file info for a valid token', async () => {
      const file = await uploadTestFile();

      const shareResponse = await supertest(app)
        .post(`/api/files/${file.id}/share`)
        .set('Authorization', `Bearer user-id:${user.id}`);
      const { token } = shareResponse.body.data;

      const response = await supertest(app).get(`/api/shared/files/${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.originalName).toBe('test.txt');
      expect(response.body.data.mimeType).toBe('text/plain');
      expect(response.body.data.expiresAt).toBeString();
    });

    it('should return 404 for invalid token', async () => {
      const response = await supertest(app).get('/api/shared/files/invalid-token-not-exists');
      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/shared/files/:token/preview', () => {
    it('should stream file content for valid token without auth', async () => {
      const content = 'Preview content test';
      const file = await uploadTestFile(content);

      const shareResponse = await supertest(app)
        .post(`/api/files/${file.id}/share`)
        .set('Authorization', `Bearer user-id:${user.id}`);
      const { token } = shareResponse.body.data;

      const response = await supertest(app).get(`/api/shared/files/${token}/preview`);

      expect(response.status).toBe(200);
      expect(response.headers['content-disposition']).toContain('inline');
      expect(response.text).toBe(content);
    });

    it('should return 404 for invalid token', async () => {
      const response = await supertest(app).get('/api/shared/files/invalid-token/preview');
      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/shared/files/:token/download', () => {
    it('should download file content for valid token without auth', async () => {
      const content = 'Download content test';
      const file = await uploadTestFile(content);

      const shareResponse = await supertest(app)
        .post(`/api/files/${file.id}/share`)
        .set('Authorization', `Bearer user-id:${user.id}`);
      const { token } = shareResponse.body.data;

      const response = await supertest(app).get(`/api/shared/files/${token}/download`);

      expect(response.status).toBe(200);
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.text).toBe(content);
    });
  });
});
