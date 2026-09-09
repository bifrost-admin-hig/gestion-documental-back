/// <reference types="bun" />
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import supertest from 'supertest';
import { Application } from 'express';
import { App } from '@/app';
import { AppDataSource, clearDatabase } from '@shared/infrastructure/database/typeorm.config';
import { DependencyContainer } from '@/dependency-container';
import { FamilyEntity } from '@shared/infrastructure/database/entities/family.entity';
import { DocumentModelEntity } from '@shared/infrastructure/database/entities/document-model.entity';

describe('DocumentController with type/subtype/colaborator', () => {
  let appInstance: App;
  let app: Application;
  let dependencyContainer: DependencyContainer;
  let groupId: number;

  beforeAll(async () => {
    process.env.ENABLE_RBAC = 'false';
    process.env.SHOW_DB_QUERY = 'true';
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
    const permissionRepository = dependencyContainer.getPermissionRepository();
    const groupRepository = dependencyContainer.getGroupRepository();

    const adminGroupsPermission = await permissionRepository.save({ name: 'admin:groups', description: 'Admin groups' });
    const role = await roleRepository.save({
      name: 'default',
      description: 'desc',
      permissions: [adminGroupsPermission],
    });

    const group = await groupRepository.save({ name: 'Test Group', description: 'Group for testing' });
    groupId = group.id!;

    await createUserUseCase.execute({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      password: 'password123',
      roleIds: [role.id!],
      groupId: groupId,
    });
  });

  async function createTypeAndSubtype() {
    const typeRes = await supertest(app)
      .post('/api/documents/types')
      .set('Authorization', 'Bearer user-id:random')
      .send({ name: `Type ${Date.now()}` });
    const typeId = typeRes.body.data.id as string;

    const subtypeRes = await supertest(app)
      .post('/api/documents/subtypes')
      .set('Authorization', 'Bearer user-id:random')
      .send({ name: `Subtype ${Date.now()}`, documentTypeId: typeId });
    const subtypeId = subtypeRes.body.data.id as string;

    return { typeId, subtypeId };
  }

  async function createContract() {
    const now = new Date();
    const startDate = now.toISOString().slice(0, 10);
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const contractDto = {
      rutSociedad: '12.345.678-5',
      nombreColaborador: 'Test Colaborador',
      administradorContratoMandante: 'Admin M',
      administradorContratoEmpresa: 'Admin E',
      rutAdministradorContrato: '23.456.789-6',
      contractNumber: `CN-${Date.now()}-${Math.random().toString(16).slice(2,8)}`,
      nombreMandante: 'Mandante SA',
      startDate,
      endDate,
      contractType: 'consultoria',
      jornadaTrabajo: 'completa',
      groupId,
    };
    const res = await supertest(app)
      .post('/api/contracts')
      .set('Authorization', 'Bearer user-id:random')
      .send(contractDto);
    expect(res.status).toBe(201);
    return res.body.data.id as string;
  }

  async function createDocumentModel(typeId: string, subtypeId: string, existingContractId?: string) {
    const contractId = existingContractId || await createContract();

    const familyRepo = AppDataSource.getRepository(FamilyEntity);
    const modelRepo = AppDataSource.getRepository(DocumentModelEntity);

    const family = await familyRepo.save({
      name: `Family ${Date.now()}-${Math.random()}`,
      contractId,
      groupId,
    });

    const model = await modelRepo.save({
      familyId: family.id,
      documentTypeId: typeId,
      documentSubtypeId: subtypeId,
      groupId,
      requiredExpirationDate: false,
    });

    return { modelId: model.id, familyId: family.id, contractId };
  }

  async function createColaborator(existingContractId?: string) {
    const base = `${Date.now()}-${Math.random().toString(16).slice(2,8)}`;
    const contractId = existingContractId || await createContract();
    const res = await supertest(app)
      .post('/api/colaborators')
      .set('Authorization', 'Bearer user-id:random')
      .send({
        tipoDocumento: 'rut',
        numeroDocumento: `12345678-${base}`,
        nombre: 'Juan',
        apellidoPaterno: 'Perez',
        apellidoMaterno: 'Gomez',
        nacionalidad: 'Chilena',
        sexo: 'masculino',
        estadoCivil: 'soltero',
        fechaNacimiento: '1990-01-01',
        paisResidencia: 'CL',
        region: 'RM',
        comuna: 'Santiago',
        direccionResidencia: 'Av. Siempre Viva 123',
        telefono: '123456789',
        email: `juan-${base}@example.com`,
        profesion: 'Ingeniero',
        cargo: 'Analista',
        contractIds: [contractId],
        groupId,
      });
    expect(res.status).toBe(201);
    return { colaboratorId: res.body.data.id as string, contractId };
  }

  describe('/api/documents', () => {
    it('should create a document with type/subtype and colaborator', async () => {
      const { typeId, subtypeId } = await createTypeAndSubtype();
      const { modelId, contractId } = await createDocumentModel(typeId, subtypeId);
      const { colaboratorId } = await createColaborator(contractId);

      const response = await supertest(app)
        .post('/api/documents')
        .set('Authorization', 'Bearer user-id:random')
        .send({
          documentModelId: modelId,
          colaboratorIds: [colaboratorId],
          name: 'Documento de Prueba',
          issuedDate: '2025-01-01',
          description: 'Desc',
          groupId,
        });
      if (response.status !== 201) {
        console.log('Create error:', response.body);
      }

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Document created successfully');
      expect(response.body.data.documentTypeId).toBe(typeId);
      expect(response.body.data.documentSubtypeId).toBe(subtypeId);
      expect(response.body.data.colaboratorIds).toContain(colaboratorId);
    });

    it('should list documents by type/subtype and by colaborator', async () => {
      const { typeId, subtypeId } = await createTypeAndSubtype();
      const { modelId, contractId } = await createDocumentModel(typeId, subtypeId);
      const { colaboratorId } = await createColaborator(contractId);

      await supertest(app)
        .post('/api/documents')
        .set('Authorization', 'Bearer user-id:random')
        .send({
          documentModelId: modelId,
          colaboratorIds: [colaboratorId],
          name: 'Documento A',
          issuedDate: '2025-01-01',
          groupId,
        });

      const byTypeSubtype = await supertest(app)
        .get(`/api/documents/by-type-subtype/${typeId}/${subtypeId}`)
        .set('Authorization', 'Bearer user-id:random');
      expect(byTypeSubtype.status).toBe(200);
      expect(byTypeSubtype.body.success).toBe(true);
      expect(byTypeSubtype.body.count).toBeGreaterThanOrEqual(1);

      const byColab = await supertest(app)
        .get(`/api/documents/by-colaborator/${colaboratorId}`)
        .set('Authorization', 'Bearer user-id:random');
      expect(byColab.status).toBe(200);
      expect(byColab.body.success).toBe(true);
      expect(byColab.body.count).toBeGreaterThanOrEqual(1);
    });

    it('should update a document fields', async () => {
      const { typeId, subtypeId } = await createTypeAndSubtype();
      const { modelId, contractId } = await createDocumentModel(typeId, subtypeId);
      const { colaboratorId } = await createColaborator(contractId);

      const createRes = await supertest(app)
        .post('/api/documents')
        .set('Authorization', 'Bearer user-id:random')
        .send({ documentModelId: modelId, colaboratorIds: [colaboratorId], name: 'Doc Edit', issuedDate: '2025-01-01', groupId });
      const id = createRes.body.data.id as string;

      const updateRes = await supertest(app)
        .put(`/api/documents/${id}`)
        .set('Authorization', 'Bearer user-id:random')
        .send({ name: 'Doc Edit Updated', comment: 'Cambio' });
      if (updateRes.status !== 200) {
        console.log('Update error:', updateRes.body);
      }

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.success).toBe(true);
      expect(updateRes.body.message).toBe('Document updated successfully');
      expect(updateRes.body.data.name).toBe('Doc Edit Updated');
    });

    it('should not allow duplicate type+subtype+colaborator on create', async () => {
      const { typeId, subtypeId } = await createTypeAndSubtype();
      const { modelId, contractId } = await createDocumentModel(typeId, subtypeId);
      const { colaboratorId } = await createColaborator(contractId);

      const first = await supertest(app)
        .post('/api/documents')
        .set('Authorization', 'Bearer user-id:random')
        .send({ documentModelId: modelId, colaboratorIds: [colaboratorId], name: 'Doc1', issuedDate: '2025-01-01', groupId });
      expect(first.status).toBe(201);

      const dup = await supertest(app)
        .post('/api/documents')
        .set('Authorization', 'Bearer user-id:random')
        .send({ documentModelId: modelId, colaboratorIds: [colaboratorId], name: 'Doc2', issuedDate: '2025-01-02', groupId });
      expect(dup.status).toBe(400);
      expect(dup.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should not allow duplicate type+subtype+colaborator on update', async () => {
      const { typeId, subtypeId } = await createTypeAndSubtype();
      const { modelId, contractId } = await createDocumentModel(typeId, subtypeId);
      const { colaboratorId } = await createColaborator(contractId);

      const other = await createTypeAndSubtype();
      const { modelId: otherModelId } = await createDocumentModel(other.typeId, other.subtypeId, contractId); // Use same contract

      await supertest(app)
        .post('/api/documents')
        .set('Authorization', 'Bearer user-id:random')
        .send({ documentModelId: modelId, colaboratorIds: [colaboratorId], name: 'DocA', issuedDate: '2025-01-01', groupId });
      const b = await supertest(app)
        .post('/api/documents')
        .set('Authorization', 'Bearer user-id:random')
        .send({ documentModelId: otherModelId, colaboratorIds: [colaboratorId], name: 'DocB', issuedDate: '2025-01-01', groupId });
      const bId = b.body.data.id as string;

      const dupUpdate = await supertest(app)
        .put(`/api/documents/${bId}`)
        .set('Authorization', 'Bearer user-id:random')
        .send({ documentModelId: modelId, comment: 'try duplicate' });
      expect(dupUpdate.status).toBe(400);
      expect(dupUpdate.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should enforce uniqueness on type+subtype+contract+colaborator when contractId provided', async () => {
      const { typeId, subtypeId } = await createTypeAndSubtype();
      const { modelId, contractId } = await createDocumentModel(typeId, subtypeId);
      const { colaboratorId } = await createColaborator(contractId);

      // First create succeeds
      const first = await supertest(app)
        .post('/api/documents')
        .set('Authorization', 'Bearer user-id:random')
        .send({ documentModelId: modelId, colaboratorIds: [colaboratorId], contractId, name: 'Doc C1', issuedDate: '2025-01-01', groupId });
      expect(first.status).toBe(201);

      // Duplicate triple should fail
      const dup = await supertest(app)
        .post('/api/documents')
        .set('Authorization', 'Bearer user-id:random')
        .send({ documentModelId: modelId, colaboratorIds: [colaboratorId], contractId, name: 'Doc C2', issuedDate: '2025-01-02', groupId });
      expect(dup.status).toBe(400);
      expect(dup.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should assign documents from type/subtype to all colaborators in a group and skip duplicates', async () => {
      const { typeId, subtypeId } = await createTypeAndSubtype();

      // Create contract first
      const contractId = await createContract();

      // Create model for that contract
      const { modelId } = await createDocumentModel(typeId, subtypeId, contractId);

      // Create 3 colaborators with same contract
      const { colaboratorId: c1 } = await createColaborator(contractId);
      const { colaboratorId: c2 } = await createColaborator(contractId);
      const { colaboratorId: c3 } = await createColaborator(contractId);

      // First bulk assignment
      const bulk1 = await supertest(app)
        .post('/api/documents/assign-to-group')
        .set('Authorization', 'Bearer user-id:random')
        .send({ documentModelId: modelId, colaboratorIds: [c1, c2, c3], name: 'Doc Bulk' });

      if (bulk1.status !== 201) {
        console.log('Bulk error:', bulk1.body);
      }

      expect(bulk1.status).toBe(201);
      expect(bulk1.body.success).toBe(true);
      expect(bulk1.body.data.createdCount).toBe(3);
      expect(bulk1.body.data.skippedCount).toBe(0);
      const createdDocs = bulk1.body.data.created as Array<any>;
      expect(createdDocs.length).toBe(3);
      for (const d of createdDocs) {
        expect(d.issuedDate).toBeNull();
        expect(d.expirationDate).toBeNull();
      }

      // Second bulk assignment should skip all
      const bulk2 = await supertest(app)
        .post('/api/documents/assign-to-group')
        .set('Authorization', 'Bearer user-id:random')
        .send({ documentModelId: modelId, colaboratorIds: [c1, c2, c3], name: 'Doc Bulk 2' });
      expect(bulk2.status).toBe(201);
      expect(bulk2.body.success).toBe(true);
      expect(bulk2.body.data.createdCount).toBe(0);
      expect(bulk2.body.data.skippedCount).toBe(3);
    });
  });
});
