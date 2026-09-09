/// <reference types="bun" />
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import supertest from 'supertest';
import { Application } from 'express';
import { App } from '@/app';
import { AppDataSource, clearDatabase } from '@shared/infrastructure/database/typeorm.config';
import { DocumentType, Gender, CivilStatus } from '@domains/colaborators/value-objects/colaborator-enums';
import { ContractType, JornadaTrabajo } from '@domains/contract/value-objects/contract-enums';
import { DateUtils } from '@shared/utils/date';
import { DependencyContainer } from '@/dependency-container';

describe('ColaboratorController - Contracts', () => {
  let appInstance: App;
  let app: Application;
  let dependencyContainer: DependencyContainer;

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
    const permissionRepository = dependencyContainer.getPermissionRepository();
    const groupRepository = dependencyContainer.getGroupRepository();

    const adminGroupsPermission = await permissionRepository.save({ name: 'admin:groups', description: 'Admin groups' });
    const role = await roleRepository.save({
      name: 'default',
      description: 'desc',
      permissions: [adminGroupsPermission],
    });

    const group = await groupRepository.save({ name: 'Default Group', description: 'Desc' });

    await createUserUseCase.execute({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      password: 'password123',
      roleIds: [role.id!],
      groupId: group.id,
    });
  });

  let id = 1;
  const getNewId = () => `COL-TEST-${id++}`;

  describe('POST /api/colaborators - Create with contracts', () => {
    it('should create a colaborator with a contract', async () => {
      const startDate = DateUtils.todayString();
      const endDate = DateUtils.toString(DateUtils.addMonths(startDate, 1));

      // Create contract first
      const contractDto = {
        contractNumber: getNewId(),
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
      };

      const contractRes = await supertest(app)
        .post('/api/contracts')
        .set('Authorization', 'Bearer user-id:random')
        .send(contractDto);

      const contractId = contractRes.body.data.id;

      // Create colaborator with contract
      const colaboratorDto = {
        tipoDocumento: DocumentType.RUT,
        numeroDocumento: '12345678-9',
        nombre: 'John',
        apellidoPaterno: 'Doe',
        nacionalidad: 'Chilean',
        sexo: Gender.MASCULINO,
        estadoCivil: CivilStatus.SOLTERO,
        fechaNacimiento: '1990-01-01',
        paisResidencia: 'CL',
        region: 'Metropolitana',
        comuna: 'Santiago',
        direccionResidencia: 'Av. Test 123',
        telefono: '+56912345678',
        email: 'john.doe@example.com',
        profesion: 'Developer',
        cargo: 'Senior Dev',
        contractIds: [contractId],
      };

      const response = await supertest(app)
        .post('/api/colaborators')
        .set('Authorization', 'Bearer user-id:random')
        .send(colaboratorDto);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.numeroDocumento).toBe('12345678-9');
    });

    it('should return 400 if contractIds is missing', async () => {
      const colaboratorDto = {
        tipoDocumento: DocumentType.RUT,
        numeroDocumento: '98765432-1',
        nombre: 'Jane',
        apellidoPaterno: 'Smith',
        nacionalidad: 'Chilean',
        sexo: Gender.FEMENINO,
        estadoCivil: CivilStatus.SOLTERO,
        fechaNacimiento: '1992-05-15',
        paisResidencia: 'CL',
        region: 'Valparaíso',
        comuna: 'Viña del Mar',
        direccionResidencia: 'Calle Test 456',
        telefono: '+56987654321',
        email: 'jane.smith@example.com',
        profesion: 'Designer',
        cargo: 'Senior Designer',
        // contractIds is missing
      };

      const response = await supertest(app)
        .post('/api/colaborators')
        .set('Authorization', 'Bearer user-id:random')
        .send(colaboratorDto);

      expect(response.status).toBe(400);
    });

    it('should return 400 if contractIds is empty', async () => {
      const colaboratorDto = {
        tipoDocumento: DocumentType.RUT,
        numeroDocumento: '11111111-1',
        nombre: 'Test',
        apellidoPaterno: 'User',
        nacionalidad: 'Chilean',
        sexo: Gender.OTRO,
        estadoCivil: CivilStatus.SOLTERO,
        fechaNacimiento: '1995-03-20',
        paisResidencia: 'CL',
        region: 'Biobío',
        comuna: 'Concepción',
        direccionResidencia: 'Av. Test 789',
        telefono: '+56911111111',
        email: 'test.user@example.com',
        profesion: 'Tester',
        cargo: 'QA',
        contractIds: [],
      };

      const response = await supertest(app)
        .post('/api/colaborators')
        .set('Authorization', 'Bearer user-id:random')
        .send(colaboratorDto);

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/colaborators/:id/contracts - Update contracts', () => {
    it('should update colaborator contracts', async () => {
      const startDate = DateUtils.todayString();
      const endDate = DateUtils.toString(DateUtils.addMonths(startDate, 1));

      // Create two contracts
      const contract1Dto = {
        contractNumber: getNewId(),
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
      };

      const contract1Res = await supertest(app)
        .post('/api/contracts')
        .set('Authorization', 'Bearer user-id:random')
        .send(contract1Dto);

      const contract1Id = contract1Res.body.data.id;

      const contract2Dto = {
        ...contract1Dto,
        contractNumber: getNewId(),
      };

      const contract2Res = await supertest(app)
        .post('/api/contracts')
        .set('Authorization', 'Bearer user-id:random')
        .send(contract2Dto);

      const contract2Id = contract2Res.body.data.id;

      // Create colaborator with first contract
      const colaboratorDto = {
        tipoDocumento: DocumentType.RUT,
        numeroDocumento: '22222222-2',
        nombre: 'Update',
        apellidoPaterno: 'Test',
        nacionalidad: 'Chilean',
        sexo: Gender.MASCULINO,
        estadoCivil: CivilStatus.CASADO,
        fechaNacimiento: '1988-07-10',
        paisResidencia: 'CL',
        region: 'Metropolitana',
        comuna: 'Santiago',
        direccionResidencia: 'Calle Update 123',
        telefono: '+56922222222',
        email: 'update.test@example.com',
        profesion: 'Manager',
        cargo: 'Project Manager',
        contractIds: [contract1Id],
      };

      const colaboratorRes = await supertest(app)
        .post('/api/colaborators')
        .set('Authorization', 'Bearer user-id:random')
        .send(colaboratorDto);

      const colaboratorId = colaboratorRes.body.data.id;

      // Update to second contract
      const response = await supertest(app)
        .put(`/api/colaborators/${colaboratorId}/contracts`)
        .set('Authorization', 'Bearer user-id:random')
        .send({ contractIds: [contract2Id] });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Colaborator contracts updated successfully');
    });

    it('should allow multiple contracts', async () => {
      const startDate = DateUtils.todayString();
      const endDate = DateUtils.toString(DateUtils.addMonths(startDate, 1));

      // Create two contracts
      const contract1Dto = {
        contractNumber: getNewId(),
        rutSociedad: '12.345.678-5',
        nombreColaborador: 'Multi Contract',
        administradorContratoMandante: 'Admin Mandante',
        administradorContratoEmpresa: 'Admin Empresa',
        rutAdministradorContrato: '23.456.789-6',
        nombreMandante: 'Mandante SA',
        startDate,
        endDate,
        contractType: ContractType.CONSULTORIA,
        jornadaTrabajo: JornadaTrabajo.COMPLETA,
      };

      const contract1Res = await supertest(app)
        .post('/api/contracts')
        .set('Authorization', 'Bearer user-id:random')
        .send(contract1Dto);

      const contract1Id = contract1Res.body.data.id;

      const contract2Dto = {
        ...contract1Dto,
        contractNumber: getNewId(),
      };

      const contract2Res = await supertest(app)
        .post('/api/contracts')
        .set('Authorization', 'Bearer user-id:random')
        .send(contract2Dto);

      const contract2Id = contract2Res.body.data.id;

      // Create colaborator with one contract
      const colaboratorDto = {
        tipoDocumento: DocumentType.RUT,
        numeroDocumento: '33333333-3',
        nombre: 'Multi',
        apellidoPaterno: 'Contract',
        nacionalidad: 'Chilean',
        sexo: Gender.FEMENINO,
        estadoCivil: CivilStatus.SOLTERO,
        fechaNacimiento: '1991-11-25',
        paisResidencia: 'CL',
        region: 'Metropolitana',
        comuna: 'Santiago',
        direccionResidencia: 'Multi St 456',
        telefono: '+56933333333',
        email: 'multi.contract@example.com',
        profesion: 'Consultant',
        cargo: 'Senior Consultant',
        contractIds: [contract1Id],
      };

      const colaboratorRes = await supertest(app)
        .post('/api/colaborators')
        .set('Authorization', 'Bearer user-id:random')
        .send(colaboratorDto);

      const colaboratorId = colaboratorRes.body.data.id;

      // Update to both contracts
      const response = await supertest(app)
        .put(`/api/colaborators/${colaboratorId}/contracts`)
        .set('Authorization', 'Bearer user-id:random')
        .send({ contractIds: [contract1Id, contract2Id] });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 if contractIds is empty', async () => {
      const startDate = DateUtils.todayString();
      const endDate = DateUtils.toString(DateUtils.addMonths(startDate, 1));

      // Create contract
      const contractDto = {
        contractNumber: getNewId(),
        rutSociedad: '12.345.678-5',
        nombreColaborador: 'Empty Test',
        administradorContratoMandante: 'Admin Mandante',
        administradorContratoEmpresa: 'Admin Empresa',
        rutAdministradorContrato: '23.456.789-6',
        nombreMandante: 'Mandante SA',
        startDate,
        endDate,
        contractType: ContractType.CONSULTORIA,
        jornadaTrabajo: JornadaTrabajo.COMPLETA,
      };

      const contractRes = await supertest(app)
        .post('/api/contracts')
        .set('Authorization', 'Bearer user-id:random')
        .send(contractDto);

      const contractId = contractRes.body.data.id;

      // Create colaborator
      const colaboratorDto = {
        tipoDocumento: DocumentType.RUT,
        numeroDocumento: '44444444-4',
        nombre: 'Empty',
        apellidoPaterno: 'Test',
        nacionalidad: 'Chilean',
        sexo: Gender.MASCULINO,
        estadoCivil: CivilStatus.DIVORCIADO,
        fechaNacimiento: '1985-02-14',
        paisResidencia: 'CL',
        region: 'Metropolitana',
        comuna: 'Santiago',
        direccionResidencia: 'Empty Ave 789',
        telefono: '+56944444444',
        email: 'empty.test@example.com',
        profesion: 'Analyst',
        cargo: 'Data Analyst',
        contractIds: [contractId],
      };

      const colaboratorRes = await supertest(app)
        .post('/api/colaborators')
        .set('Authorization', 'Bearer user-id:random')
        .send(colaboratorDto);

      const colaboratorId = colaboratorRes.body.data.id;

      // Try to update with empty array
      const response = await supertest(app)
        .put(`/api/colaborators/${colaboratorId}/contracts`)
        .set('Authorization', 'Bearer user-id:random')
        .send({ contractIds: [] });

      expect(response.status).toBe(400);
    });
  });
});
