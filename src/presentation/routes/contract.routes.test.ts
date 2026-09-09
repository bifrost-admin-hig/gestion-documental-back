/// <reference types="bun" />
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import supertest from 'supertest';
import { Application } from 'express';
import { App } from '@/app';
import { AppDataSource, clearDatabase } from '@shared/infrastructure/database/typeorm.config';
import { ContractType, JornadaTrabajo } from '@domains/contract/value-objects/contract-enums';
import { DateUtils } from '@shared/utils/date';
import { DependencyContainer } from '@/dependency-container';
import { ColaboratorStatus, DocumentType, Gender, CivilStatus } from '@domains/colaborators/value-objects/colaborator-enums';
import { ColaboratorRepository } from '@domains/colaborators/repositories/colaborator.repository';
import { CreateColaboratorUseCase } from '@domains/colaborators/use-cases/create-colaborator.use-case';
import { User } from '@domains/user/entities/user.entity';

describe('ContractController', () => {
  let appInstance: App;
  let app: Application;
  let colaboratorRepository: ColaboratorRepository;
  let createColaboratorUseCase: CreateColaboratorUseCase;
  let dependencyContainer: DependencyContainer;
  let user: User;
  let testGroupId: number;

  beforeAll(async () => {
    process.env.ENABLE_RBAC = 'true';
    appInstance = new App();
    await appInstance.initialize();
    app = appInstance.getApp();

    dependencyContainer = new DependencyContainer();
    await dependencyContainer.initialize();
    colaboratorRepository = dependencyContainer.getColaboratorRepository();
    const groupRepository = dependencyContainer.getGroupRepository();
    createColaboratorUseCase = new CreateColaboratorUseCase(colaboratorRepository, groupRepository);
  });

  afterAll(async () => {
    await appInstance.close();
  });

  beforeEach(async () => {
    await clearDatabase(AppDataSource);

    // Create a dummy user for authentication
    const createUserUseCase = dependencyContainer.getCreateUserUseCase();
    const roleRepository = dependencyContainer.getRoleRepository();
    const permissionRepository = dependencyContainer.getPermissionRepository();
    const assignPermissionsToRoleUseCase = dependencyContainer.getAssignPermissionsToRoleUseCase();

    // Create permissions
    const permissions = [
      'contract:create', 'contract:read', 'contract:update', 'contract:delete',
      'contract:assign:reviewer',
      'colaborator:create', 'colaborator:read',
      'document:create', 'document:read',
    ];

    const permissionIds = [];
    for (const name of permissions) {
      const p = await permissionRepository.save({ name, description: `Permission ${name}` });
      permissionIds.push(p.id!);
    }

    // Create admin role (just in case)
    const adminRole = await roleRepository.save({
      name: 'admin.role',
      description: 'Admin role',
    });

    await assignPermissionsToRoleUseCase.execute({
      roleId: adminRole.id!,
      permissionIds,
    });

    // Create a group for contracts
    const groupRepository = dependencyContainer.getGroupRepository();
    const group = await groupRepository.save({ name: 'Test Group' });
    testGroupId = group.id!;

    user = await createUserUseCase.execute({
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      password: 'password123',
      roleIds: [adminRole.id!],
      groupId: testGroupId,
    });
  });

  let id = 1;
  const getNewId = () => `CN-TEST-${id++}`;

  describe('/api/contracts', () => {
    const startDate = DateUtils.toString(new Date(Date.now() + 86400000)); // Tomorrow
    const endDate = futureDate(startDate);

    function futureDate(date: DateType): string {
      return DateUtils.toString(DateUtils.addMonths(date, 1));
    }

    const baseContractDto = {
      contractNumber: '',
      rutSociedad: '12.345.678-5',
      nombreColaborador: 'Juan Perez',
      administradorContratoMandante: 'Admin Mandante',
      administradorContratoEmpresa: 'Admin Empresa',
      rutAdministradorContrato: '23.456.789-6',
      nombreMandante: 'Mandante SA',
      startDate,
      endDate,
      contractType: ContractType.CONSULTORIA,
      jornadaTrabajo: JornadaTrabajo.COMPLETA,
      division: 'Division Test',
      area: 'Area Test',
      descripcionServicio: 'Servicio de prueba',
      nombreProyecto: 'Proyecto Test',
      groupId: 0, // Placeholder
    };

    beforeEach(() => {
      baseContractDto.groupId = testGroupId;
    });

    it('should create a new contract and return 201', async () => {
      baseContractDto.contractNumber = getNewId();
      const response = await supertest(app)
        .post('/api/contracts')
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send(baseContractDto);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Contract created successfully');
      expect(response.body.data.id).toBeString();
      expect(response.body.data).toMatchObject({
        rutSociedad: baseContractDto.rutSociedad,
        nombreColaborador: baseContractDto.nombreColaborador,
        contractNumber: baseContractDto.contractNumber,
        startDate,
        endDate,
      });
    });

    it('should update a contract', async () => {
      baseContractDto.contractNumber = getNewId();
      const createResponse = await supertest(app)
        .post('/api/contracts')
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send(baseContractDto);

      const createdId = createResponse.body.data.id as string;
      const startDate = createResponse.body.data.startDate as string;
      const originalEndDate = createResponse.body.data.endDate as string;

      const newEndDate = futureDate(originalEndDate);
      const descripcionServicio = 'Servicio actualizado';
      const dotacionPersonal = 5;
      const dotacionVehiculos = 2;

      const updateResponse = await supertest(app)
        .put(`/api/contracts/${createdId}`)
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send({
          startDate,
          endDate: newEndDate,
          descripcionServicio,
          dotacionPersonal,
          dotacionVehiculos,
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.message).toBe('Contract updated successfully');
      expect(updateResponse.body.data).toMatchObject({
        startDate,
        endDate: newEndDate,
        descripcionServicio,
        dotacionPersonal,
        dotacionVehiculos,
      });
    });

    it('should get contract by id and return 200', async () => {
      baseContractDto.contractNumber = getNewId();
      const createResponse = await supertest(app)
        .post('/api/contracts')
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send(baseContractDto);

      const contractId = createResponse.body.data.id;

      const response = await supertest(app)
        .get(`/api/contracts/${contractId}`)
        .set('Authorization', `Bearer user-id:${user.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(contractId);
      expect(response.body.body).not.toBeDefined();
      expect(response.body.data.startDate).toBe(startDate);
      expect(response.body.data.endDate).toBe(endDate);
    });

    it('should return 409 if contract number already exists', async () => {
      baseContractDto.contractNumber = getNewId();
      // Create the contract first
      await supertest(app)
        .post('/api/contracts')
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send(baseContractDto);

      // Try to create another contract with the same contract number
      const response = await supertest(app)
        .post('/api/contracts')
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send(baseContractDto);

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('CONFLICT');
    });

    it('should delete a contract and return 200', async () => {
      baseContractDto.contractNumber = getNewId();
      // Create contract first
      const createResponse = await supertest(app)
        .post('/api/contracts')
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send(baseContractDto);

      const contractId = createResponse.body.data.id;

      const response = await supertest(app)
        .delete(`/api/contracts/${contractId}`)
        .set('Authorization', `Bearer user-id:${user.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Contract deleted successfully');
    });

    it('should return 400 if validation fails', async () => {
      const invalidDto = { rutSociedad: '' };

      const response = await supertest(app)
        .post('/api/contracts')
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send(invalidDto);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('/api/contracts/:id/subcontracts', () => {
    const startDate = DateUtils.todayString();
    const endDate = DateUtils.toString(DateUtils.addMonths(startDate, 1));

    const baseContractDto = {
      contractNumber: '',
      rutSociedad: '12.345.678-5',
      nombreColaborador: 'Juan Perez',
      administradorContratoMandante: 'Admin Mandante',
      administradorContratoEmpresa: 'Admin Empresa',
      rutAdministradorContrato: '23.456.789-6',
      nombreMandante: 'Mandante SA',
      startDate,
      endDate,
      contractType: ContractType.CONSULTORIA,
      jornadaTrabajo: JornadaTrabajo.COMPLETA,
      groupId: 0, // Placeholder
    };

    beforeEach(() => {
      baseContractDto.groupId = testGroupId;
    });

    it('should add a subcontract to a contract', async () => {
      // Create parent contract
      baseContractDto.contractNumber = getNewId();
      const parentResponse = await supertest(app)
        .post('/api/contracts')
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send(baseContractDto);

      const parentId = parentResponse.body.data.id;

      // Create subcontract
      baseContractDto.contractNumber = getNewId();
      const subcontractResponse = await supertest(app)
        .post('/api/contracts')
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send(baseContractDto);

      const subcontractId = subcontractResponse.body.data.id;

      // Add subcontract relationship
      const response = await supertest(app)
        .post(`/api/contracts/${parentId}/subcontracts`)
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send({ subcontractId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Subcontract added successfully');
    });

    it('should get all subcontracts of a contract', async () => {
      // Create parent contract
      baseContractDto.contractNumber = getNewId();
      const parentResponse = await supertest(app)
        .post('/api/contracts')
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send(baseContractDto);

      const parentId = parentResponse.body.data.id;

      // Create two subcontracts
      baseContractDto.contractNumber = getNewId();
      const sub1Response = await supertest(app)
        .post('/api/contracts')
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send(baseContractDto);

      const sub1Id = sub1Response.body.data.id;

      baseContractDto.contractNumber = getNewId();
      const sub2Response = await supertest(app)
        .post('/api/contracts')
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send(baseContractDto);

      const sub2Id = sub2Response.body.data.id;

      // Add subcontract relationships
      await supertest(app)
        .post(`/api/contracts/${parentId}/subcontracts`)
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send({ subcontractId: sub1Id });

      await supertest(app)
        .post(`/api/contracts/${parentId}/subcontracts`)
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send({ subcontractId: sub2Id });

      // Get all subcontracts
      const response = await supertest(app)
        .get(`/api/contracts/${parentId}/subcontracts`)
        .set('Authorization', `Bearer user-id:${user.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(2);
      expect(response.body.data).toBeArrayOfSize(2);
      const ids = response.body.data.map((c: any) => c.id);
      expect(ids).toContain(sub1Id);
      expect(ids).toContain(sub2Id);
    });

    it('should remove a subcontract from a contract', async () => {
      // Create parent contract
      baseContractDto.contractNumber = getNewId();
      const parentResponse = await supertest(app)
        .post('/api/contracts')
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send(baseContractDto);

      const parentId = parentResponse.body.data.id;

      // Create subcontract
      baseContractDto.contractNumber = getNewId();
      const subcontractResponse = await supertest(app)
        .post('/api/contracts')
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send(baseContractDto);

      const subcontractId = subcontractResponse.body.data.id;

      // Add subcontract relationship
      await supertest(app)
        .post(`/api/contracts/${parentId}/subcontracts`)
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send({ subcontractId });

      // Remove subcontract relationship
      const response = await supertest(app)
        .delete(`/api/contracts/${parentId}/subcontracts/${subcontractId}`)
        .set('Authorization', `Bearer user-id:${user.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Subcontract removed successfully');

      // Verify it was removed
      const getResponse = await supertest(app)
        .get(`/api/contracts/${parentId}/subcontracts`)
        .set('Authorization', `Bearer user-id:${user.id}`);

      expect(getResponse.body.count).toBe(0);
    });

    it('should return 400 if trying to assign a contract to itself', async () => {
      // Create contract
      baseContractDto.contractNumber = getNewId();
      const contractResponse = await supertest(app)
        .post('/api/contracts')
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send(baseContractDto);

      const contractId = contractResponse.body.data.id;

      // Try to add itself as subcontract
      const response = await supertest(app)
        .post(`/api/contracts/${contractId}/subcontracts`)
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send({ subcontractId: contractId });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 if subcontractId is missing', async () => {
      // Create contract
      baseContractDto.contractNumber = getNewId();
      const contractResponse = await supertest(app)
        .post('/api/contracts')
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send(baseContractDto);

      const contractId = contractResponse.body.data.id;

      // Try to add subcontract without subcontractId
      const response = await supertest(app)
        .post(`/api/contracts/${contractId}/subcontracts`)
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Subcontract ID is required');
    });
  });

  describe('/api/contracts/:id/colaborators', () => {
    const startDate = DateUtils.todayString();
    const endDate = DateUtils.toString(DateUtils.addMonths(startDate, 1));
    let contractId: string;
    let colaboratorId: string;

    const baseContractDto = {
      contractNumber: '',
      rutSociedad: '12.345.678-5',
      nombreColaborador: 'Juan Perez',
      administradorContratoMandante: 'Admin Mandante',
      administradorContratoEmpresa: 'Admin Empresa',
      rutAdministradorContrato: '23.456.789-6',
      nombreMandante: 'Mandante SA',
      startDate,
      endDate,
      contractType: ContractType.CONSULTORIA,
      jornadaTrabajo: JornadaTrabajo.COMPLETA,
      groupId: 0, // Placeholder
    };

    beforeEach(() => {
      baseContractDto.groupId = testGroupId;
    });

    const colaboratorDto = {
      tipoDocumento: DocumentType.RUT,
      numeroDocumento: '12345678-9',
      nombre: 'John',
      apellidoPaterno: 'Doe',
      nacionalidad: 'Chilean',
      sexo: Gender.MASCULINO,
      estadoCivil: CivilStatus.SOLTERO,
      fechaNacimiento: new Date('1990-01-01'),
      paisResidencia: 'CL',
      region: 'Metropolitana',
      comuna: 'Santiago',
      direccionResidencia: 'Av. Test 123',
      telefono: '+56912345678',
      email: 'john.doe@example.com',
      profesion: 'Developer',
      cargo: 'Senior Dev',
      status: ColaboratorStatus.ACTIVE,
    };

    beforeEach(async () => {
      // Create contract
      baseContractDto.contractNumber = getNewId();
      const contractRes = await supertest(app)
        .post('/api/contracts')
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send(baseContractDto);
      contractId = contractRes.body.data.id;

      // Create a different contract for the colaborator
      const otherContractDto = { ...baseContractDto, contractNumber: getNewId() };
      const otherContractRes = await supertest(app)
        .post('/api/contracts')
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send(otherContractDto);
      const otherContractId = otherContractRes.body.data.id;

      // Create colaborator with the other contract
      const colaborator = await createColaboratorUseCase.execute({
        ...colaboratorDto,
        contractIds: [otherContractId],
        groupId: testGroupId,
      });
      colaboratorId = colaborator.id;
    });

    it('should add a colaborator to a contract', async () => {
      const response = await supertest(app)
        .post(`/api/contracts/${contractId}/colaborators`)
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send({ colaboratorId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Colaborator added successfully');
    });

    it('should get all colaborators of a contract', async () => {
      // Add first
      await supertest(app)
        .post(`/api/contracts/${contractId}/colaborators`)
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send({ colaboratorId });

      const response = await supertest(app)
        .get(`/api/contracts/${contractId}/colaborators`)
        .set('Authorization', `Bearer user-id:${user.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(1);
      expect(response.body.data[0].id).toBe(colaboratorId);
    });

    it('should remove a colaborator from a contract', async () => {
      // Add first
      await supertest(app)
        .post(`/api/contracts/${contractId}/colaborators`)
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send({ colaboratorId });

      const response = await supertest(app)
        .delete(`/api/contracts/${contractId}/colaborators/${colaboratorId}`)
        .set('Authorization', `Bearer user-id:${user.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Colaborator removed successfully');

      // Verify removal
      const getResponse = await supertest(app)
        .get(`/api/contracts/${contractId}/colaborators`)
        .set('Authorization', `Bearer user-id:${user.id}`);

      expect(getResponse.body.count).toBe(0);
    });

    it('should return 400 if colaboratorId is missing', async () => {
      const response = await supertest(app)
        .post(`/api/contracts/${contractId}/colaborators`)
        .set('Authorization', `Bearer user-id:${user.id}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Colaborator ID is required');
    });
  });
});
