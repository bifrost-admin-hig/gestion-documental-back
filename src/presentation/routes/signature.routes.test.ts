/// <reference types="bun" />
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import supertest from 'supertest';
import { Application } from 'express';
import { App } from '@/app';
import { AppDataSource, clearDatabase } from '@shared/infrastructure/database/typeorm.config';
import { DependencyContainer } from '@/dependency-container';

// PNG 1x1 transparente válido, usado como imagen de firma de prueba.
const SAMPLE_SIGNATURE_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

describe('SignatureController', () => {
  let appInstance: App;
  let app: Application;
  let dependencyContainer: DependencyContainer;
  let userId: string;
  let groupId: number;

  beforeAll(async () => {
    process.env.ENABLE_RBAC = 'false';
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

    const createUserUseCase = dependencyContainer.getCreateUserUseCase();
    const roleRepository = dependencyContainer.getRoleRepository();
    const groupRepository = dependencyContainer.getGroupRepository();

    const role = await roleRepository.save({ name: 'default', description: 'desc', permissions: [] });
    const group = await groupRepository.save({ name: 'Test Group', description: 'group' });
    groupId = group.id!;

    const user = await createUserUseCase.execute({
      email: 'signer@example.com',
      firstName: 'Firma',
      lastName: 'Test',
      password: 'password123',
      roleIds: [role.id!],
      groupId,
    });
    userId = user.id;
  });

  // ─── Public endpoint ───────────────────────────────────────────────────────

  describe('GET /api/signatures/verify/:tokenHash', () => {
    it('should return 404 when token hash does not exist', async () => {
      const res = await supertest(app)
        .get('/api/signatures/verify/nonexistent-token-hash');

      expect(res.status).toBe(404);
    });

    it('should not require authentication', async () => {
      const res = await supertest(app)
        .get('/api/signatures/verify/nonexistent-token-hash');

      // Should not be 401 — public route
      expect(res.status).not.toBe(401);
    });
  });

  // ─── Protected endpoints ───────────────────────────────────────────────────

  describe('POST /api/signatures/initiate', () => {
    it('should return 400 when body is missing required fields', async () => {
      const res = await supertest(app)
        .post('/api/signatures/initiate')
        .set('Authorization', `Bearer user-id:${userId}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 400 when documentId is not a valid UUID', async () => {
      const res = await supertest(app)
        .post('/api/signatures/initiate')
        .set('Authorization', `Bearer user-id:${userId}`)
        .send({ documentId: 'not-a-uuid' });

      expect(res.status).toBe(400);
    });

    it('should return 404 when document does not exist', async () => {
      const res = await supertest(app)
        .post('/api/signatures/initiate')
        .set('Authorization', `Bearer user-id:${userId}`)
        .send({ documentId: '00000000-0000-0000-0000-000000000001' });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/signatures/validate', () => {
    it('should return 400 when body is missing required fields', async () => {
      const res = await supertest(app)
        .post('/api/signatures/validate')
        .set('Authorization', `Bearer user-id:${userId}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 400 when code field is missing', async () => {
      const res = await supertest(app)
        .post('/api/signatures/validate')
        .set('Authorization', `Bearer user-id:${userId}`)
        .send({ signatureId: '00000000-0000-0000-0000-000000000001' });

      expect(res.status).toBe(400);
    });

    it('should return 404 when signature does not exist', async () => {
      const res = await supertest(app)
        .post('/api/signatures/validate')
        .set('Authorization', `Bearer user-id:${userId}`)
        .send({
          signatureId: '00000000-0000-0000-0000-000000000001',
          code: '123456',
          signatureImage: SAMPLE_SIGNATURE_IMAGE,
        });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/signatures/cancel', () => {
    it('should return 400 when body is missing required fields', async () => {
      const res = await supertest(app)
        .post('/api/signatures/cancel')
        .set('Authorization', `Bearer user-id:${userId}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 404 when signature does not exist', async () => {
      const res = await supertest(app)
        .post('/api/signatures/cancel')
        .set('Authorization', `Bearer user-id:${userId}`)
        .send({ signatureId: '00000000-0000-0000-0000-000000000001' });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/signatures/document/:documentId', () => {
    it('should return empty array when document has no signatures', async () => {
      const res = await supertest(app)
        .get('/api/signatures/document/00000000-0000-0000-0000-000000000001')
        .set('Authorization', `Bearer user-id:${userId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
      expect(res.body.count).toBe(0);
    });
  });
});
