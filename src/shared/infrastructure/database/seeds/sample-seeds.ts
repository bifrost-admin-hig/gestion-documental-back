import { TypeOrmDocumentTypeRepository } from '@shared/infrastructure/repositories/typeorm-document-type.repository';
import { TypeOrmDocumentSubtypeRepository } from '@shared/infrastructure/repositories/typeorm-document-subtype.repository';
import { TypeOrmColaboratorRepository } from '@shared/infrastructure/repositories/typeorm-colaborator.repository';
import { TypeOrmColaboratorGroupRepository } from '@shared/infrastructure/repositories/typeorm-colaborator-group.repository';
import { TypeOrmGroupRepository } from '@shared/infrastructure/repositories/typeorm-group.repository';
import { TypeOrmContractRepository } from '@shared/infrastructure/repositories/typeorm-contract.repository';
import { TypeOrmDocumentRepository } from '@shared/infrastructure/repositories/typeorm-document.repository';
import { TypeOrmFileRepository } from '@shared/infrastructure/repositories/typeorm-file.repository';
import { TypeOrmUserRepository } from '@shared/infrastructure/repositories/typeorm-user.repository';
import { DocumentType as DocTypeDomain } from '@domains/document-type/entities/document-type.entity';
import { DocumentSubtype } from '@domains/document-subtype/entities/document-subtype.entity';
import { Colaborator, ColaboratorProps } from '@domains/colaborators/entities/colaborator.entity';
import { Document } from '@domains/document/entities/document.entity';
import { File } from '@domains/file/entities/file.entity';
import { DocumentType as ColabDocType, Gender, CivilStatus } from '@domains/colaborators/value-objects/colaborator-enums';
import { ContractType, JornadaTrabajo, ContractStatus } from '@domains/contract/value-objects/contract-enums';
import { DocumentStatus } from '@domains/document/value-objects/document-enums';
import { StorageType } from '@domains/file/value-objects/storage-type';
import * as fs from 'fs';
import * as path from 'path';

import { TypeOrmRoleRepository } from '@shared/infrastructure/repositories/typeorm-role.repository';
import { TypeOrmPermissionRepository } from '@shared/infrastructure/repositories/typeorm-permission.repository';
import { TypeOrmAreaRepository } from '@shared/infrastructure/repositories/typeorm-area.repository';
import { TypeOrmDivisionRepository } from '@shared/infrastructure/repositories/typeorm-division.repository';
import { TypeOrmCompanyRepository } from '@shared/infrastructure/repositories/typeorm-company.repository';
import { TypeOrmFamilyRepository } from '@shared/infrastructure/repositories/typeorm-family.repository';
import { TypeOrmDocumentModelRepository } from '@shared/infrastructure/repositories/typeorm-document-model.repository';
import { SaveRoleUseCase } from '@domains/role/use-cases/save-role.use-case';
import { AssignPermissionsToRoleUseCase } from '@domains/role/use-cases/assign-permissions-to-role.use-case';
import { CreateUserUseCase } from '@domains/user/use-cases/create-user.use-case';
import { Area } from '@domains/area/entities/area.entity';
import { Division } from '@domains/division/entities/division.entity';
import { Company } from '@domains/company/entities/company.entity';
import { Contract } from '@domains/contract/entities/contract.entity';
import { Family } from '@domains/family/entities/family.entity';
import { DocumentModel } from '@domains/document-model/entities/document-model.entity';

export async function runSampleSeeds(): Promise<void> {
  if (process.env.NODE_ENV !== 'development') return;

  const typeRepo = new TypeOrmDocumentTypeRepository();
  const subtypeRepo = new TypeOrmDocumentSubtypeRepository();
  const colaboratorRepo = new TypeOrmColaboratorRepository();
  const colaboratorGroupRepo = new TypeOrmColaboratorGroupRepository();
  const groupRepo = new TypeOrmGroupRepository();
  const contractRepo = new TypeOrmContractRepository();

  const typeNames = ['Personal', 'Legal', 'Operacional'];
  const types: string[] = [];
  for (const name of typeNames) {
    const exists = await typeRepo.findByName(name);
    if (exists) {
      types.push(exists.id);
      continue;
    }
    const saved = await typeRepo.save(DocTypeDomain.create({ name }));
    types.push(saved.id);
  }

  const subtypeNames = ['Ficha', 'Acuerdo', 'Procedimiento'];
  const subtypes: string[] = [];
  for (let i = 0; i < subtypeNames.length; i++) {
    const name = subtypeNames[i];
    const typeId = types[i % types.length];
    const exists = await subtypeRepo.findByName(name);
    if (exists) {
      subtypes.push(exists.id);
      continue;
    }
    const saved = await subtypeRepo.save(DocumentSubtype.create({ name, documentTypeId: typeId }));
    subtypes.push(saved.id);
  }

  /* Create Group */
  let testGroup = await groupRepo.findById(1);
  if (!testGroup) {
    testGroup = await groupRepo.save({
      name: 'Grupo de Pruebas',
      description: 'Grupo de pruebas',
    });
  }

  /* Create Contracts */
  const now = new Date();
  const key = now.toISOString().slice(0, 19).replace(/[^\dT]/g, '').replace('T', '-');
  const today = now.toISOString().split('T');
  const contractsData = [
    {
      rutSociedad: '12.345.678-5',
      nombreColaborador: 'Colaborador S1',
      administradorContratoMandante: 'Admin Mandante',
      administradorContratoEmpresa: 'Admin Empresa',
      rutAdministradorContrato: '23.456.789-6',
      contractNumber: `CN-${key}-S1`,
      nombreMandante: 'Mandante SA',
      startDate: today[0],
      endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      contractType: ContractType.CONSULTORIA,
      jornadaTrabajo: JornadaTrabajo.COMPLETA,
      groupId: 1,
    },
    {
      rutSociedad: '98.765.432-1',
      nombreColaborador: 'Colaborador S2',
      administradorContratoMandante: 'Admin Mandante',
      administradorContratoEmpresa: 'Admin Empresa',
      rutAdministradorContrato: '65.432.109-8',
      contractNumber: `CN-${key}-S2`,
      nombreMandante: 'Mandante SPA',
      startDate: today[0],
      endDate: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      contractType: ContractType.HONORARIOS,
      jornadaTrabajo: JornadaTrabajo.PARCIAL,
      groupId: 1,
    },
    {
      rutSociedad: '77.777.777-7',
      nombreColaborador: 'Colaborador S3',
      administradorContratoMandante: 'Admin Mandante',
      administradorContratoEmpresa: 'Admin Empresa',
      rutAdministradorContrato: '11.111.111-1',
      contractNumber: `CN-${key}-S3`,
      nombreMandante: 'Mandante Ltda',
      startDate: today[0],
      endDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      contractType: ContractType.OBRA_FAENA,
      jornadaTrabajo: JornadaTrabajo.TURNO,
      groupId: 1,
    },
  ];

  const contractIds: string[] = [];
  for (const c of contractsData) {
    let contract = await contractRepo.findByContractNumber(c.contractNumber);
    if (!contract) {
      contract = await contractRepo.save(c as any);
    }
    contractIds.push(contract.id);
  }

  const colaboradoresData = [
    {
      tipoDocumento: ColabDocType.RUT,
      numeroDocumento: '11.111.111-1',
      nombre: 'Juan',
      apellidoPaterno: 'Pérez',
      apellidoMaterno: 'Gómez',
      nacionalidad: 'CL',
      sexo: Gender.MASCULINO,
      estadoCivil: CivilStatus.SOLTERO,
      fechaNacimiento: new Date('1990-01-01'),
      paisResidencia: 'CL',
      region: 'Metropolitana',
      comuna: 'Santiago',
      direccionResidencia: 'Av. Siempre Viva 123',
      telefono: '+56911111111',
      email: 'juan.perez@example.com',
      contactoEmergencia: 'María',
      telefonoEmergencia: '+56922222222',
      profesion: 'Ingeniero',
      cargo: 'Analista',
      groupId: 1,
    },
    {
      tipoDocumento: ColabDocType.RUT,
      numeroDocumento: '22.222.222-2',
      nombre: 'María',
      apellidoPaterno: 'López',
      apellidoMaterno: 'Soto',
      nacionalidad: 'CL',
      sexo: Gender.FEMENINO,
      estadoCivil: CivilStatus.CASADO,
      fechaNacimiento: new Date('1988-05-10'),
      paisResidencia: 'CL',
      region: 'Metropolitana',
      comuna: 'Providencia',
      direccionResidencia: 'Los Leones 456',
      telefono: '+56933333333',
      email: 'maria.lopez@example.com',
      contactoEmergencia: 'Juan',
      telefonoEmergencia: '+56944444444',
      profesion: 'Abogada',
      cargo: 'Consultora',
      groupId: 1,
    },
    {
      tipoDocumento: ColabDocType.RUT,
      numeroDocumento: '33.333.333-3',
      nombre: 'Pedro',
      apellidoPaterno: 'Ramírez',
      apellidoMaterno: 'Fuentes',
      nacionalidad: 'CL',
      sexo: Gender.MASCULINO,
      estadoCivil: CivilStatus.SOLTERO,
      fechaNacimiento: new Date('1995-09-20'),
      paisResidencia: 'CL',
      region: 'Valparaíso',
      comuna: 'Viña del Mar',
      direccionResidencia: 'Av. Libertad 789',
      telefono: '+56955555555',
      email: 'pedro.ramirez@example.com',
      contactoEmergencia: 'Sofía',
      telefonoEmergencia: '+56966666666',
      profesion: 'Técnico',
      cargo: 'Operario',
      groupId: 1,
    },
    {
      tipoDocumento: ColabDocType.RUT,
      numeroDocumento: '44.444.444-4',
      nombre: 'Ana',
      apellidoPaterno: 'Rojas',
      apellidoMaterno: 'Vega',
      nacionalidad: 'CL',
      sexo: Gender.FEMENINO,
      estadoCivil: CivilStatus.SOLTERO,
      fechaNacimiento: new Date('1992-03-12'),
      paisResidencia: 'CL',
      region: 'Biobío',
      comuna: 'Concepción',
      direccionResidencia: 'Calle Nueva 12',
      telefono: '+56977777777',
      email: 'ana.rojas@example.com',
      contactoEmergencia: 'Carlos',
      telefonoEmergencia: '+56988888888',
      profesion: 'Diseñadora',
      cargo: 'UX',
      groupId: 1,
    },
    {
      tipoDocumento: ColabDocType.RUT,
      numeroDocumento: '55.555.555-5',
      nombre: 'Carlos',
      apellidoPaterno: 'Silva',
      apellidoMaterno: 'Paredes',
      nacionalidad: 'CL',
      sexo: Gender.MASCULINO,
      estadoCivil: CivilStatus.SOLTERO,
      fechaNacimiento: new Date('1991-07-22'),
      paisResidencia: 'CL',
      region: 'Metropolitana',
      comuna: 'Ñuñoa',
      direccionResidencia: 'Los Alerces 321',
      telefono: '+56999999999',
      email: 'carlos.silva@example.com',
      contactoEmergencia: 'Ana',
      telefonoEmergencia: '+56900000000',
      profesion: 'Desarrollador',
      cargo: 'Backend',
      groupId: 1,
    },
    {
      tipoDocumento: ColabDocType.RUT,
      numeroDocumento: '66.666.666-6',
      nombre: 'Sofía',
      apellidoPaterno: 'Martínez',
      apellidoMaterno: 'Díaz',
      nacionalidad: 'CL',
      sexo: Gender.FEMENINO,
      estadoCivil: CivilStatus.CASADO,
      fechaNacimiento: new Date('1989-11-05'),
      paisResidencia: 'CL',
      region: 'Los Lagos',
      comuna: 'Puerto Montt',
      direccionResidencia: 'Av. Austral 456',
      telefono: '+56912121212',
      email: 'sofia.martinez@example.com',
      contactoEmergencia: 'Diego',
      telefonoEmergencia: '+56913131313',
      profesion: 'Analista',
      cargo: 'QA',
      groupId: 1,
    },
    {
      tipoDocumento: ColabDocType.RUT,
      numeroDocumento: '77.777.777-7',
      nombre: 'Diego',
      apellidoPaterno: 'Torres',
      apellidoMaterno: 'Campos',
      nacionalidad: 'CL',
      sexo: Gender.MASCULINO,
      estadoCivil: CivilStatus.SOLTERO,
      fechaNacimiento: new Date('1993-02-17'),
      paisResidencia: 'CL',
      region: 'Coquimbo',
      comuna: 'La Serena',
      direccionResidencia: 'Calle Sol 789',
      telefono: '+56923232323',
      email: 'diego.torres@example.com',
      contactoEmergencia: 'Sofía',
      telefonoEmergencia: '+56934343434',
      profesion: 'Project Manager',
      cargo: 'PM',
      groupId: 1,
    },
  ] satisfies ColaboratorProps[];

  const colaboratorIds: string[] = [];
  for (let i = 0; i < colaboradoresData.length; i++) {
    const c = colaboradoresData[i];
    const exists = await colaboratorRepo.findByEmail(c.email);
    if (exists) {
      colaboratorIds.push(exists.id);
      continue;
    }
    const saved = await colaboratorRepo.save(Colaborator.create({
      ...c,
      contractIds: [contractIds[i % contractIds.length]],
    }));
    colaboratorIds.push(saved.id);
  }

  /* Create Colaborator Groups */
  const groupNames = ['Equipo A', 'Equipo B', 'Equipo C'];
  const groups: { id: number; name: string; description?: string }[] = [];
  let groupIndex = 0;
  for (const name of groupNames) {
    let found = await colaboratorGroupRepo.findByName(name);
    if (!found) {
      // Assign specific contract based on index rotation
      const assignedContractId = contractIds[groupIndex % contractIds.length];
      const created = await colaboratorGroupRepo.save({
        name,
        description: 'Grupo de prueba',
        colaborators: [] as any,
        contractId: assignedContractId,
      });
      found = created;
    }
    groups.push({ id: (found as any).id, name: found!.name, description: (found as any).description });
    groupIndex++;
  }

  const [A, B, C] = groups;
  const cids = colaboratorIds;
  if (cids.length >= 7 && groups.length >= 3) {
    const groupAColabs = [cids[0], cids[3], cids[4], cids[5]];
    const groupBColabs = [cids[1], cids[3], cids[4], cids[6]];
    const groupCColabs = [cids[2], cids[3], cids[5], cids[6]];

    await colaboratorGroupRepo.update({ id: A.id, colaborators: groupAColabs.map(id => ({ id } as any)) });
    await colaboratorGroupRepo.update({ id: B.id, colaborators: groupBColabs.map(id => ({ id } as any)) });
    await colaboratorGroupRepo.update({ id: C.id, colaborators: groupCColabs.map(id => ({ id } as any)) });
  }

  /* Create Documents with different statuses */
  const documentRepo = new TypeOrmDocumentRepository();
  const fileRepo = new TypeOrmFileRepository();
  const userRepo = new TypeOrmUserRepository();
  const familyRepo = new TypeOrmFamilyRepository();
  const documentModelRepo = new TypeOrmDocumentModelRepository();

  // Create Families for each Contract (required for Document Models)
  const familiesByContractId: Record<string, Family> = {};
  for (let i = 0; i < contractIds.length; i++) {
    const contractId = contractIds[i];
    const name = `Familia de Muestra Contrato ${i + 1}`;

    let family = await familyRepo.findByName(name);
    if (!family) {
      family = await familyRepo.create(Family.create({
        name,
        groupId: 1,
        contractId,
      }));
    }
    familiesByContractId[contractId] = family;
  }

  // Get first user to use as createdBy
  const users = await userRepo.findAll();
  const createdById = users.length > 0 ? users[0].id : null;

  // Helper function to copy test files to uploads folder
  const copyTestFile = async (testFileName: string, destinationFileName: string): Promise<File> => {
    const testsDir = path.join(process.cwd(), 'tests');
    const uploadsDir = path.join(process.cwd(), 'uploads');

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const sourcePath = path.join(testsDir, testFileName);
    const destPath = path.join(uploadsDir, destinationFileName);

    fs.copyFileSync(sourcePath, destPath);

    const stats = fs.statSync(destPath);
    const mimeType = testFileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';

    const file = new File({
      originalName: testFileName,
      path: `uploads/${destinationFileName}`,
      storage: 'local' as StorageType,
      mimeType,
      size: stats.size,
    });

    return await fileRepo.save(file);
  };

  const documentsData = [
    {
      name: 'Documento en Borrador',
      documentTypeId: types[0],
      documentSubtypeId: subtypes[0],
      contractId: contractIds[0],
      colaboratorIds: [colaboratorIds[0], colaboratorIds[1]],
      description: 'Documento de prueba en estado borrador',
      status: DocumentStatus.DRAFT,
      issuedDate: now,
      expirationDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
      requiredForContract: true,
      requiredForColaborator: false,
      createdBy: createdById,
      groupId: 1,
    },
    {
      name: 'Documento en Revisión',
      documentTypeId: types[1],
      documentSubtypeId: subtypes[1],
      contractId: contractIds[1],
      colaboratorIds: [colaboratorIds[2], colaboratorIds[3]],
      description: 'Documento de prueba en estado de revisión',
      status: DocumentStatus.IN_REVIEW,
      issuedDate: now,
      expirationDate: new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000),
      requiredForContract: false,
      requiredForColaborator: true,
      createdBy: createdById,
      groupId: 1,
      testFile: 'test-document-1.pdf',
    },
    {
      name: 'Documento Aprobado',
      documentTypeId: types[2],
      documentSubtypeId: subtypes[2],
      contractId: contractIds[2],
      colaboratorIds: [colaboratorIds[4], colaboratorIds[5]],
      description: 'Documento de prueba aprobado',
      status: DocumentStatus.APPROVED,
      issuedDate: now,
      expirationDate: new Date(now.getTime() + 730 * 24 * 60 * 60 * 1000),
      requiredForContract: true,
      requiredForColaborator: true,
      createdBy: createdById,
      groupId: 1,
      testFile: 'test-document-2.pdf',
    },
    {
      name: `Documento Rechazado-${Date.now()}`,
      documentTypeId: types[0],
      documentSubtypeId: subtypes[0],
      contractId: contractIds[2],
      colaboratorIds: [colaboratorIds[6]],
      description: 'Documento de prueba rechazado',
      status: DocumentStatus.REJECTED,
      issuedDate: now,
      expirationDate: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
      requiredForContract: false,
      requiredForColaborator: false,
      createdBy: createdById,
      groupId: 1,
      comment: 'Rechazado por incumplir requisitos',
      testFile: 'test-document-3.pdf',
    },
    {
      name: 'Documento Rechazado con Comentarios',
      documentTypeId: types[2],
      documentSubtypeId: subtypes[2],
      contractId: contractIds[0],
      colaboratorIds: [colaboratorIds[0], colaboratorIds[3]],
      description: 'Documento rechazado con comentarios para corrección',
      status: DocumentStatus.REJECTED_WITH_COMMENTS,
      issuedDate: now,
      expirationDate: new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000),
      requiredForContract: true,
      requiredForColaborator: false,
      createdBy: createdById,
      groupId: 1,
      comment: 'Favor revisar las firmas y volver a enviar',
      testFile: 'test-image-1.jpg',
    },
    {
      name: 'Documento Expirado',
      documentTypeId: types[1],
      documentSubtypeId: subtypes[1],
      contractId: contractIds[2],
      colaboratorIds: [colaboratorIds[1], colaboratorIds[4]],
      description: 'Documento que ya ha expirado',
      status: DocumentStatus.EXPIRED,
      issuedDate: new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000),
      expirationDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      requiredForContract: false,
      requiredForColaborator: true,
      createdBy: createdById,
      groupId: 1,
      testFile: 'test-image-2.png',
    },
    {
      name: 'Documento Obsoleto',
      documentTypeId: types[1],
      documentSubtypeId: subtypes[1],
      contractId: contractIds[0],
      colaboratorIds: [colaboratorIds[2], colaboratorIds[5]],
      description: 'Documento marcado como obsoleto',
      status: DocumentStatus.OBSOLETE,
      issuedDate: new Date(now.getTime() - 200 * 24 * 60 * 60 * 1000),
      expirationDate: new Date(now.getTime() + 100 * 24 * 60 * 60 * 1000),
      requiredForContract: false,
      requiredForColaborator: false,
      createdBy: createdById,
      groupId: 1,
      testFile: 'test-document-1.pdf',
    },
    {
      name: 'Documento Archivado',
      documentTypeId: types[2],
      documentSubtypeId: subtypes[2],
      contractId: contractIds[1],
      colaboratorIds: [colaboratorIds[3], colaboratorIds[6]],
      description: 'Documento archivado para registro histórico',
      status: DocumentStatus.ARCHIVED,
      issuedDate: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
      expirationDate: null,
      requiredForContract: true,
      requiredForColaborator: true,
      createdBy: createdById,
      groupId: 1,
      testFile: 'test-document-2.pdf',
    },
  ];

  for (const docData of documentsData) {
    const { testFile, documentTypeId, documentSubtypeId, requiredForContract, requiredForColaborator, ...documentProps } = docData as any;
    const contractId = (docData as any).contractId;

    const family = familiesByContractId[contractId];

    if (!family) {
      console.error(`Family not found for contract ${contractId}, cannot create document model`);
      continue;
    }

    // Find or Create Document Model - reuse if it already exists for this family/type/subtype
    let documentModel = await documentModelRepo.findByFamilyTypeSubtype(
      family.id,
      documentTypeId,
      documentSubtypeId,
      1, // groupId
    );

    if (!documentModel) {
      documentModel = await documentModelRepo.create(DocumentModel.create({
        familyId: family.id,
        documentTypeId,
        documentSubtypeId,
        requiredForContract: requiredForContract || false,
        requiredForColaborator: requiredForColaborator || false,
        groupId: 1,
      }));
    }

    // Create the document
    const document = Document.create({
      ...documentProps,
      documentModelId: documentModel.id,
    });
    const savedDocument = await documentRepo.save(document);

    // Attach file if status is not DRAFT
    if (testFile && documentProps.status !== DocumentStatus.DRAFT) {
      const fileExtension = path.extname(testFile);
      const destinationFileName = `${savedDocument.id}${fileExtension}`;

      try {
        const file = await copyTestFile(testFile, destinationFileName);

        // Update document with file ID (not path)
        savedDocument.documentUrl = file.id;
        await documentRepo.update(savedDocument);

        // console.log(`  ✅ Documento "${documentProps.name}" creado con archivo adjunto`);
      } catch (_error) {
        // console.log(`  ⚠️  Documento "${documentProps.name}" creado pero no se pudo adjuntar archivo:`, error);
      }
    } else {
      // console.log(`  ✅ Documento "${documentProps.name}" creado (sin archivo)`);
    }
  }

  await runRequestedSeeds();
}

async function runRequestedSeeds(): Promise<void> {
  const userRepository = new TypeOrmUserRepository();
  const roleRepository = new TypeOrmRoleRepository();
  const permissionRepository = new TypeOrmPermissionRepository();
  const groupRepository = new TypeOrmGroupRepository();
  const areaRepository = new TypeOrmAreaRepository();
  const divisionRepository = new TypeOrmDivisionRepository();
  const companyRepository = new TypeOrmCompanyRepository();
  const contractRepository = new TypeOrmContractRepository();
  const documentTypeRepository = new TypeOrmDocumentTypeRepository();
  const documentSubtypeRepository = new TypeOrmDocumentSubtypeRepository();
  const familyRepository = new TypeOrmFamilyRepository();
  const documentModelRepository = new TypeOrmDocumentModelRepository();
  const colaboratorRepository = new TypeOrmColaboratorRepository();

  const saveRoleUseCase = new SaveRoleUseCase(roleRepository);
  const assignPermissionsToRoleUseCase = new AssignPermissionsToRoleUseCase(roleRepository, permissionRepository);
  const createUserUseCase = new CreateUserUseCase(userRepository, roleRepository, groupRepository);

  // 1. Create 'advisor' role
  const advisorRoleName = 'advisor';
  let advisorRole = await roleRepository.findByName(advisorRoleName);
  if (!advisorRole) {
    advisorRole = await saveRoleUseCase.execute({ name: advisorRoleName, description: 'Advisor' });
    const allPermissions = await permissionRepository.findAll();
    const excludedExactNames = ['user:change:group'];
    const ownerPermissionIds = allPermissions
      .filter(p => p.id && !p.name.startsWith('admin:') && !excludedExactNames.includes(p.name))
      .map(p => p.id!);

    if (advisorRole.id && ownerPermissionIds.length > 0) {
      await assignPermissionsToRoleUseCase.execute({ roleId: advisorRole.id, permissionIds: ownerPermissionIds });
    }
  }

  // 2. Create Groups and related entities
  for (let i = 1; i <= 2; i++) {
    const groupName = `Group S${i}`;
    let group = await groupRepository.findByName(groupName);
    if (!group) {
      group = await groupRepository.save({ name: groupName, description: `Description for ${groupName}` });
    }

    if (!group || !group.id) continue;

    // Users
    for (let u = 1; u <= 2; u++) {
      const email = `userS${i}-${u}@example.com`;
      const existingUser = await userRepository.findByEmail(email);
      if (!existingUser) {
        await createUserUseCase.execute({
          email,
          firstName: `User S${i}`,
          lastName: `${u}`,
          password: 'Password123!',
          roleIds: advisorRole?.id ? [advisorRole.id] : [],
          groupId: group.id,
        });
      }
    }

    // Areas
    const areas: Area[] = [];
    for (let a = 1; a <= 2; a++) {
      const areaName = `Area S${i}-${a}`;
      let area = (await areaRepository.findAll()).find(ar => ar.name === areaName);
      if (!area) {
        area = await areaRepository.create(new Area({
          name: areaName,
          description: `Description for ${areaName}`,
          groupId: group.id,
        }));
      }
      areas.push(area);

      // Divisions per Area
      for (let d = 1; d <= 2; d++) {
        const divisionName = `Division S${i}-${a}-${d}`;
        const division = (await divisionRepository.findAll()).find(div => div.name === divisionName);
        if (!division) {
          await divisionRepository.create(new Division({
            name: divisionName,
            description: `Description for ${divisionName}`,
            groupId: group.id,
            areaId: area.id!,
          }));
        }
      }
    }

    // Companies
    for (let c = 1; c <= 2; c++) {
      const companyName = `Company S${i}-${c}`;
      const taxId = `11.111.11${i}-${c}`; // Simple tax ID
      if (!(await companyRepository.existsByTaxId(taxId))) {
        await companyRepository.save(new Company({
          name: companyName,
          taxId: taxId,
          groupId: group.id,
        }));
      }
    }

    // Contracts
    const contracts: Contract[] = [];
    for (let cn = 1; cn <= 2; cn++) {
      const contractNumber = `CNT-S${i}-${cn}`;
      if (!(await contractRepository.existsByContractNumber(contractNumber))) {
        // Pick an area and division
        const area = areas[(cn - 1) % areas.length];
        const divisions = await divisionRepository.findAll();
        const division = divisions.find(d => d.areaId === area.id);

        if (!division) continue;

        const contract = await contractRepository.save(new Contract({
          rutSociedad: `77.777.77${i}-${cn}`,
          nombreColaborador: `Colaborador Contract S${i}-${cn}`,
          startDate: new Date(),
          endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
          contractType: ContractType.INDEFINIDO,
          administradorContratoMandante: `Admin Mandante S${i}-${cn}`,
          administradorContratoEmpresa: `Admin Empresa S${i}-${cn}`,
          rutAdministradorContrato: `12.345.67${i}-${cn}`,
          contractNumber: contractNumber,
          nombreMandante: `Mandante S${i}-${cn}`,
          divisionId: division.id!,
          areaId: area.id,
          jornadaTrabajo: JornadaTrabajo.COMPLETA,
          status: ContractStatus.ACTIVE,
          dotacionPersonal: 10,
          dotacionVehiculos: 2,
          groupId: group.id!,
        }));
        contracts.push(contract);
      } else {
        const contract = await contractRepository.findByContractNumber(contractNumber);
        if (contract) contracts.push(contract);
      }
    }

    // Colaborators
    for (let col = 1; col <= 4; col++) {
      const docNumber = `10.000.00${i}-${col}`;
      const existingCol = await colaboratorRepository.findByNumeroDocumento(docNumber);
      if (!existingCol) {
        const colaborator = Colaborator.create({
          tipoDocumento: ColabDocType.RUT,
          numeroDocumento: docNumber,
          nombre: `Colaborator S${i}`,
          apellidoPaterno: `Paterno ${col}`,
          apellidoMaterno: `Materno ${col}`,
          nacionalidad: 'CL',
          sexo: Gender.MASCULINO,
          estadoCivil: CivilStatus.SOLTERO,
          fechaNacimiento: new Date('1990-01-01'),
          paisResidencia: 'CL',
          region: 'Metropolitana',
          comuna: 'Santiago',
          direccionResidencia: `Direccion S${i}-${col}`,
          telefono: `+5691234567${col}`,
          email: `colaboratorS${i}-${col}@example.com`,
          profesion: 'Developer',
          cargo: 'Senior',
          contractIds: contracts.map(c => c.id),
          groupId: group.id!,
        });
        await colaboratorRepository.save(colaborator);
      }
    }

    // Document Types and Subtypes
    const docTypes: DocTypeDomain[] = [];
    for (let dt = 1; dt <= 3; dt++) {
      const typeName = `DocType S${i}-${dt}`;
      let docType = await documentTypeRepository.findByName(typeName);
      if (!docType) {
        docType = await documentTypeRepository.save(DocTypeDomain.create({ name: typeName }));
      }
      docTypes.push(docType);

      for (let dst = 1; dst <= 3; dst++) {
        const subtypeName = `DocSubtype S${i}-${dt}-${dst}`;
        if (!(await documentSubtypeRepository.existsByNameAndDocumentTypeId(subtypeName, docType.id))) {
          await documentSubtypeRepository.save(DocumentSubtype.create({
            name: subtypeName,
            documentTypeId: docType.id,
          }));
        }
      }
    }

    // Families and Models
    for (let f = 1; f <= 2; f++) {
      const familyName = `Family S${i}-${f}`;
      let family = await familyRepository.findByName(familyName);
      if (!family) {
        // Assign contract: alternate between available contracts
        const contract = contracts[(f - 1) % contracts.length];
        family = await familyRepository.create(Family.create({
          name: familyName,
          groupId: group.id,
          contractId: contract.id,
        }));
      }

      // 3 Models per family
      for (let m = 1; m <= 3; m++) {
        // Alternate mandatory fields
        const requiredExpirationDate = m % 3 === 0;
        const requiredForContract = m % 3 === 1;
        const requiredForColaborator = m % 3 === 2;

        // Pick a type and subtype
        const docType = docTypes[(m - 1) % docTypes.length];
        const subtypes = await documentSubtypeRepository.findByDocumentTypeId(docType.id);
        const subtype = subtypes[0];

        const existingModel = await documentModelRepository.findByFamilyTypeSubtype(family.id, docType.id, subtype.id, group.id);

        if (!existingModel) {
          await documentModelRepository.create(DocumentModel.create({
            groupId: group.id,
            familyId: family.id,
            documentTypeId: docType.id,
            documentSubtypeId: subtype.id,
            requiredExpirationDate,
            requiredForContract,
            requiredForColaborator,
          }));
        }
      }
    }
  }
}
