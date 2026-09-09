/// <reference types="bun" />
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import supertest from 'supertest';
import { Application } from 'express';
import { App } from '@/app';
import { AppDataSource, clearDatabase } from '@shared/infrastructure/database/typeorm.config';
import { DependencyContainer } from '@/dependency-container';

describe('DocumentModelController', () => {
  let appInstance: App;
  let app: Application;
  let dependencyContainer: DependencyContainer;
  let familyId: string;
  let documentTypeId: string;
  let documentSubtypeId: string;
  let userId: string;
  let groupId: number;
  let contractId: string;
  let colaboratorId: string;

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

    const createUserUseCase = dependencyContainer.getCreateUserUseCase();
    const roleRepository = dependencyContainer.getRoleRepository();
    const groupRepository = dependencyContainer.getGroupRepository();
    const permissionRepository = dependencyContainer.getPermissionRepository();

    // Create Group
    const group = await groupRepository.save({ name: 'Test Group' });
    groupId = group.id!;

    // Create Permissions
    const permissionData = [
      { name: 'document-model:create', description: 'Create document models' },
      { name: 'document-model:read', description: 'Read document models' },
      { name: 'document-model:update', description: 'Update document models' },
      { name: 'document-model:delete', description: 'Delete document models' },
      { name: 'family:create', description: 'Create families' },
      { name: 'family:read', description: 'Read families' },
      { name: 'document-type:create', description: 'Create document types' },
      { name: 'document-type:read', description: 'Read document types' },
      { name: 'document-subtype:create', description: 'Create document subtypes' },
      { name: 'document-subtype:read', description: 'Read document subtypes' },
      { name: 'contract:create', description: 'Create contracts' },
      { name: 'colaborator:create', description: 'Create colaborators' },
      { name: 'document:create', description: 'Create documents' },
    ];

    const permissions = [];
    for (const p of permissionData) {
      permissions.push(await permissionRepository.save(p));
    }

    // Create Role with Permissions
    const defaultRole = await roleRepository.save({
      name: 'default.role',
      description: 'Default role for tests',
      permissions: permissions,
    });

    const createdUser = await createUserUseCase.execute({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      password: 'password123',
      roleIds: [defaultRole.id!],
      groupId: groupId,
    });

    userId = createdUser.id;

    // Create Contract
    const today = new Date().toISOString().split('T')[0];
    const nextYear = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];
    const contractRes = await supertest(app)
      .post('/api/contracts')
      .set('Authorization', `Bearer user-id:${userId}`)
      .set('Cookie', [`groupId=${groupId}`])
      .send({
        contractNumber: `CN-${Date.now()}`,
        rutSociedad: '76.123.456-7',
        nombreMandante: 'Mandante Test',
        rutAdministradorContrato: '12.345.678-9',
        administradorContratoMandante: 'Admin Mandante',
        administradorContratoEmpresa: 'Admin Empresa',
        nombreColaborador: 'Colaborador Test',
        startDate: today,
        endDate: nextYear,
        contractType: 'consultoria',
        jornadaTrabajo: 'completa',
        groupId,
      });

    if (contractRes.status !== 201) {
      console.error('Contract creation failed:', JSON.stringify(contractRes.body, null, 2));
    }
    contractId = contractRes.body.data.id;

    // Create family
    const familyResponse = await supertest(app)
      .post('/api/families')
      .set('Authorization', `Bearer user-id:${userId}`)
      .set('Cookie', [`groupId=${groupId}`])
      .send({ name: 'Test Family', contractId });

    if (familyResponse.status !== 201) {
      console.error('Family creation failed:', JSON.stringify(familyResponse.body, null, 2));
    }

    familyId = familyResponse.body.data.id;

    // Create document type
    const typeResponse = await supertest(app)
      .post('/api/documents/types')
      .set('Authorization', `Bearer user-id:${userId}`)
      .set('Cookie', [`groupId=${groupId}`])
      .send({ name: 'Test Type' });

    documentTypeId = typeResponse.body.data.id;

    // Create document subtype
    const subtypeResponse = await supertest(app)
      .post('/api/documents/subtypes')
      .set('Authorization', `Bearer user-id:${userId}`)
      .set('Cookie', [`groupId=${groupId}`])
      .send({ name: 'Test Subtype', documentTypeId });

    documentSubtypeId = subtypeResponse.body.data.id;

    // Create contract
    const contractResponse = await supertest(app)
      .post('/api/contracts')
      .set('Authorization', `Bearer user-id:${userId}`)
      .set('Cookie', [`groupId=${groupId}`])
      .send({
        contractNumber: 'CN-TEST-001',
        rutSociedad: '12.345.678-5',
        nombreColaborador: 'Juan Perez',
        administradorContratoMandante: 'Admin Mandante',
        administradorContratoEmpresa: 'Admin Empresa',
        rutAdministradorContrato: '23.456.789-6',
        nombreMandante: 'Mandante SA',
        startDate: '2030-01-01',
        endDate: '2030-12-31',
        contractType: 'consultoria',
        jornadaTrabajo: 'completa',
      });

    if (contractResponse.status !== 201) {
      console.error('Contract creation failed:', JSON.stringify(contractResponse.body, null, 2));
    }

    contractId = contractResponse.body.data.id;

    // Create colaborator
    const colaboratorResponse = await supertest(app)
      .post('/api/colaborators')
      .set('Authorization', `Bearer user-id:${userId}`)
      .set('Cookie', [`groupId=${groupId}`])
      .send({
        tipoDocumento: 'rut',
        numeroDocumento: '12345678-9',
        nombre: 'John',
        apellidoPaterno: 'Doe',
        nacionalidad: 'Chilean',
        sexo: 'masculino',
        estadoCivil: 'soltero',
        fechaNacimiento: '1990-01-01',
        paisResidencia: 'CL',
        region: 'Metropolitana',
        comuna: 'Santiago',
        direccionResidencia: 'Calle Falsa 123',
        email: 'john.doe@example.com',
        telefono: '+56912345678',
        profesion: 'Developer',
        cargo: 'Senior Dev',
        contractIds: [contractId],
      });

    colaboratorId = colaboratorResponse.body.data.id;
  });

  describe('POST /api/document-models', () => {
    it('should create a new document model', async () => {
      const response = await supertest(app)
        .post('/api/document-models')
        .set('Authorization', `Bearer user-id:${userId}`)
        .set('Cookie', [`groupId=${groupId}`])
        .send({
          familyId,
          documentTypeId,
          documentSubtypeId,
          requiredForContract: true,
          requiredForColaborator: false,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.familyId).toBe(familyId);
      expect(response.body.data.documentTypeId).toBe(documentTypeId);
      expect(response.body.data.documentSubtypeId).toBe(documentSubtypeId);
      expect(response.body.data.requiredForContract).toBe(true);
      expect(response.body.data.requiredForColaborator).toBe(false);
    });

    it('should return 404 if family not found', async () => {
      const response = await supertest(app)
        .post('/api/document-models')
        .set('Authorization', `Bearer user-id:${userId}`)
        .set('Cookie', [`groupId=${groupId}`])
        .send({
          familyId: '00000000-0000-0000-0000-000000000000',
          documentTypeId,
          documentSubtypeId,
        });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/document-models', () => {
    it('should return all document models', async () => {
      await supertest(app)
        .post('/api/document-models')
        .set('Authorization', `Bearer user-id:${userId}`)
        .set('Cookie', [`groupId=${groupId}`])
        .send({ familyId, documentTypeId, documentSubtypeId });

      const response = await supertest(app)
        .get('/api/document-models')
        .set('Authorization', `Bearer user-id:${userId}`)
        .set('Cookie', [`groupId=${groupId}`]);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);
    });
  });

  describe('GET /api/document-models/:id', () => {
    it('should return a document model by id', async () => {
      const createResponse = await supertest(app)
        .post('/api/document-models')
        .set('Authorization', `Bearer user-id:${userId}`)
        .set('Cookie', [`groupId=${groupId}`])
        .send({ familyId, documentTypeId, documentSubtypeId });

      const modelId = createResponse.body.data.id;

      const response = await supertest(app)
        .get(`/api/document-models/${modelId}`)
        .set('Authorization', `Bearer user-id:${userId}`)
        .set('Cookie', [`groupId=${groupId}`]);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(modelId);
    });
  });

  describe('GET /api/document-models/family/:familyId', () => {
    it('should return document models by family id', async () => {
      await supertest(app)
        .post('/api/document-models')
        .set('Authorization', `Bearer user-id:${userId}`)
        .set('Cookie', [`groupId=${groupId}`])
        .send({ familyId, documentTypeId, documentSubtypeId });

      const response = await supertest(app)
        .get(`/api/document-models/family/${familyId}`)
        .set('Authorization', `Bearer user-id:${userId}`)
        .set('Cookie', [`groupId=${groupId}`]);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].familyId).toBe(familyId);
    });
  });

  describe('PUT /api/document-models/:id', () => {
    it('should update a document model', async () => {
      const createResponse = await supertest(app)
        .post('/api/document-models')
        .set('Authorization', `Bearer user-id:${userId}`)
        .set('Cookie', [`groupId=${groupId}`])
        .send({
          familyId,
          documentTypeId,
          documentSubtypeId,
          requiredForContract: false,
          requiredForColaborator: false,
        });

      const modelId = createResponse.body.data.id;

      const response = await supertest(app)
        .put(`/api/document-models/${modelId}`)
        .set('Authorization', `Bearer user-id:${userId}`)
        .set('Cookie', [`groupId=${groupId}`])
        .send({
          requiredForContract: true,
          requiredForColaborator: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.requiredForContract).toBe(true);
      expect(response.body.data.requiredForColaborator).toBe(true);
    });
  });

  describe('DELETE /api/document-models/:id', () => {
    it('should soft delete a document model', async () => {
      const createResponse = await supertest(app)
        .post('/api/document-models')
        .set('Authorization', `Bearer user-id:${userId}`)
        .set('Cookie', [`groupId=${groupId}`])
        .send({ familyId, documentTypeId, documentSubtypeId });

      const modelId = createResponse.body.data.id;

      const deleteResponse = await supertest(app)
        .delete(`/api/document-models/${modelId}`)
        .set('Authorization', `Bearer user-id:${userId}`)
        .set('Cookie', [`groupId=${groupId}`]);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);

      const getResponse = await supertest(app)
        .get(`/api/document-models/${modelId}`)
        .set('Authorization', `Bearer user-id:${userId}`)
        .set('Cookie', [`groupId=${groupId}`]);

      expect(getResponse.status).toBe(404);
    });
  });

  describe('POST /api/document-models/assign-documents', () => {
    it('should assign documents to colaborators', async () => {
      // Create model first
      const modelResponse = await supertest(app)
        .post('/api/document-models')
        .set('Authorization', `Bearer user-id:${userId}`)
        .set('Cookie', [`groupId=${groupId}`])
        .send({
          familyId,
          documentTypeId,
          documentSubtypeId,
          requiredForContract: true,
          requiredForColaborator: false,
        });
      const modelId = modelResponse.body.data.id;

      const response = await supertest(app)
        .post('/api/document-models/assign-documents')
        .set('Authorization', `Bearer user-id:${userId}`)
        .set('Cookie', [`groupId=${groupId}`])
        .send({
          documentModelId: modelId,
          contractId,
          colaboratorIds: [colaboratorId],
          comment: 'Assignment test',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.createdCount).toBe(1);
      expect(response.body.data.skippedCount).toBe(0);
    });
  });
});
