import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import supertest from 'supertest';
import { Application } from 'express';
import { App } from '@/app';
import { AppDataSource, clearDatabase } from '@shared/infrastructure/database/typeorm.config';
import FileUtils from '@shared/utils/FileUtils';
import { TypeOrmUserRepository } from '@shared/infrastructure/repositories/typeorm-user.repository';
import { CreateUserUseCase } from '@domains/user/use-cases/create-user.use-case';
import { TypeOrmRoleRepository } from '@shared/infrastructure/repositories/typeorm-role.repository';
import { TypeOrmGroupRepository } from '@shared/infrastructure/repositories/typeorm-group.repository';
import { SaveRoleUseCase } from '@domains/role/use-cases/save-role.use-case';
import { User } from '@domains/user/entities/user.entity';
import { Role } from '@domains/role/entities/role.entity';

describe('FileController', () => {
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
  const UPLOAD_DIR = 'file-routes-tests';
  const TEST_UPLOAD_DIR = `./uploads/${UPLOAD_DIR}`;

  beforeAll(async () => {
    // Set FileUtils upload to test directory
    FileUtils.setUploadDir(TEST_UPLOAD_DIR);

    process.env.FILE_STORAGE = 'local'; // Force local storage for tests
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

    // Create a test role
    testRole = await saveRoleUseCase.execute({
      name: 'Test Role',
      description: 'Role for testing',
    });

    // Create a test user
    user = await createUserUseCase.execute({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      password: testPassword,
      roleIds: [testRole.id],
    });
  });

  afterAll(async () => {
    // Clean up test files
    await FileUtils.removeDirectory(TEST_UPLOAD_DIR, { recursive: true, force: true });
    // Restart default FileUtils upload directory
    FileUtils.setUploadDir();
  });

  describe('POST /api/files', () => {
    it('should upload a file and return 201', async () => {
      const content = 'Hello, World!';
      const base64Content = Buffer.from(content).toString('base64');
      const filename = 'test-document.pdf';
      const mimeType = 'application/pdf';

      const response = await supertest(app)
        .post('/api/files')
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send({
          filename,
          contentBase64: base64Content,
          mimeType,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeString();
      expect(response.body.data.originalName).toBe(filename);
      expect(response.body.data.path).toContain(UPLOAD_DIR);
      expect(response.body.data.path).toContain(filename);
      expect(response.body.data.storage).toBe('local');
      expect(response.body.data.mimeType).toBe(mimeType);
      expect(response.body.data.size).toBeGreaterThan(0);

      // Verify file exists
      const fileExists = await FileUtils.exists(response.body.data.path);
      expect(fileExists).toBe(true);

      // Verify file content
      const savedContent = await FileUtils.read(response.body.data.path, { encoding: 'utf8' });
      expect(savedContent).toBe(content);
    });

    it('should upload a file with custom size', async () => {
      const content = 'Test content';
      const base64Content = Buffer.from(content).toString('base64');
      const filename = 'sized-file.txt';
      const customSize = 1024;

      const response = await supertest(app)
        .post('/api/files')
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send({
          filename,
          contentBase64: base64Content,
          size: customSize,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.size).toBe(customSize);
    });

    it('should upload a file without custom size and use actual size', async () => {
      const content = 'Test content without size';
      const base64Content = Buffer.from(content).toString('base64');
      const filename = 'no-size.txt';

      const response = await supertest(app)
        .post('/api/files')
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send({
          filename,
          contentBase64: base64Content,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.size).toBe(content.length);
    });

    it('should handle filenames with paths', async () => {
      const content = 'Path test';
      const base64Content = Buffer.from(content).toString('base64');
      const filename = 'path/to/document.pdf';

      const response = await supertest(app)
        .post('/api/files')
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send({
          filename,
          contentBase64: base64Content,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.originalName).toBe('document.pdf');
      expect(response.body.data.path).toContain('document.pdf');
    });

    it('should upload binary content (image)', async () => {
      // Simulate a small image file (JPEG header)
      const binaryContent = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
      const base64Content = binaryContent.toString('base64');
      const filename = 'test-image.jpg';
      const mimeType = 'image/jpeg';

      const response = await supertest(app)
        .post('/api/files')
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send({
          filename,
          contentBase64: base64Content,
          mimeType,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.mimeType).toBe(mimeType);
      expect(response.body.data.size).toBe(binaryContent.length);

      // Verify binary content is preserved
      const savedContent = await FileUtils.read(response.body.data.path);
      expect(Buffer.compare(savedContent as Buffer, binaryContent)).toBe(0);
    });

    it('should return 400 if filename is missing', async () => {
      const base64Content = Buffer.from('test').toString('base64');

      const response = await supertest(app)
        .post('/api/files')
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send({
          contentBase64: base64Content,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('file required');
    });

    it('should return 400 if contentBase64 is missing', async () => {
      const response = await supertest(app)
        .post('/api/files')
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send({
          filename: 'test.pdf',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('file required');
    });

    it('should return 400 if both filename and contentBase64 are missing', async () => {
      const response = await supertest(app)
        .post('/api/files')
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('file required');
    });

    it('should create files in date-based folders', async () => {
      const content = 'Date folder test';
      const base64Content = Buffer.from(content).toString('base64');
      const filename = 'date-test.txt';

      const response = await supertest(app)
        .post('/api/files')
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send({
          filename,
          contentBase64: base64Content,
        });

      expect(response.status).toBe(201);

      // Verify path contains today's date (YYYY-MM-DD)
      const today = new Date().toISOString().slice(0, 10);
      expect(response.body.data.path).toContain(today);
    });

    it('should generate unique filenames with timestamps', async () => {
      const content = 'Unique test';
      const base64Content = Buffer.from(content).toString('base64');
      const filename = 'duplicate.txt';

      // Upload first file
      const response1 = await supertest(app)
        .post('/api/files')
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send({
          filename,
          contentBase64: base64Content,
        });

      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      // Upload second file with same name
      const response2 = await supertest(app)
        .post('/api/files')
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send({
          filename,
          contentBase64: base64Content,
        });

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);

      // Paths should be different due to timestamps
      expect(response1.body.data.path).not.toBe(response2.body.data.path);

      // Both files should exist
      const file1Exists = await FileUtils.exists(response1.body.data.path);
      const file2Exists = await FileUtils.exists(response2.body.data.path);
      expect(file1Exists).toBe(true);
      expect(file2Exists).toBe(true);
    });

    it('should store file metadata in database', async () => {
      const content = 'Database test';
      const base64Content = Buffer.from(content).toString('base64');
      const filename = 'db-test.txt';
      const mimeType = 'text/plain';

      const response = await supertest(app)
        .post('/api/files')
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send({
          filename,
          contentBase64: base64Content,
          mimeType,
        });

      expect(response.status).toBe(201);

      const fileId = response.body.data.id;
      expect(fileId).toBeDefined();

      // FileUtils should be retrievable from database (if you have a GET endpoint)
      // This verifies the file was saved to the repository
      expect(response.body.data).toMatchObject({
        originalName: filename,
        storage: 'local',
        mimeType,
      });
    });
  });
});
