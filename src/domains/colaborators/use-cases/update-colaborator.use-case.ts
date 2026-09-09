import { ColaboratorRepository } from '../repositories/colaborator.repository';
import { Colaborator } from '../entities/colaborator.entity';
import { NotFoundError, ConflictError, ValidationError } from '@shared/domain/errors';
import { DocumentType, Gender, CivilStatus } from '../value-objects/colaborator-enums';
import { GroupRepository } from '@domains/group/repositories/group.repository';

export interface UpdateColaboratorRequest {
  id: string;
  // Información básica
  nombre?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  // Información del documento
  tipoDocumento?: DocumentType;
  numeroDocumento?: string;
  // Información personal
  nacionalidad?: string;
  sexo?: Gender;
  estadoCivil?: CivilStatus;
  fechaNacimiento?: Date;
  // Ubicación
  paisResidencia?: string;
  region?: string;
  comuna?: string;
  estadoRegion?: string;
  ciudadMunicipio?: string;
  direccionResidencia?: string;
  // Contacto
  telefono?: string;
  email?: string;
  contactoEmergencia?: string;
  telefonoEmergencia?: string;
  // Profesional
  profesion?: string;
  cargo?: string;
  // Grupo
  groupId?: number;
}

export class UpdateColaboratorUseCase {
  constructor(
    private readonly colaboratorRepository: ColaboratorRepository,
    private readonly groupRepository: GroupRepository,
  ) {}

  public async execute(request: UpdateColaboratorRequest): Promise<Colaborator> {
    const colaborator = await this.colaboratorRepository.findById(request.id);

    if (!colaborator) {
      throw new NotFoundError(`Colaborator with id ${request.id} not found`);
    }

    // If email is being updated, check if it's already in use
    if (request.email && request.email !== colaborator.email) {
      const existingByEmail = await this.colaboratorRepository.findByEmail(request.email);
      if (existingByEmail) {
        throw new ConflictError('Email is already in use by another colaborator');
      }
    }

    // If numero documento is being updated, check if it's already in use
    if (request.numeroDocumento && request.numeroDocumento !== colaborator.numeroDocumento) {
      const existingByDocument = await this.colaboratorRepository.findByNumeroDocumento(request.numeroDocumento);
      if (existingByDocument) {
        throw new ConflictError('Document number is already in use by another colaborator');
      }
    }

    // Update basic info (nombres, apellidos)
    if (request.nombre !== undefined || request.apellidoPaterno !== undefined || request.apellidoMaterno !== undefined) {
      colaborator.updateBasicInfo(
        request.nombre || colaborator.nombre,
        request.apellidoPaterno || colaborator.apellidoPaterno,
        request.apellidoMaterno !== undefined ? request.apellidoMaterno : colaborator.apellidoMaterno,
      );
    }

    // Update document info
    if (request.tipoDocumento !== undefined || request.numeroDocumento !== undefined) {
      colaborator.updateDocumentInfo(
        request.tipoDocumento || colaborator.tipoDocumento,
        request.numeroDocumento || colaborator.numeroDocumento,
      );
    }

    // Update personal info
    if (request.nacionalidad !== undefined || request.sexo !== undefined ||
        request.estadoCivil !== undefined || request.fechaNacimiento !== undefined) {
      colaborator.updatePersonalInfo(
        request.nacionalidad || colaborator.nacionalidad,
        request.sexo || colaborator.sexo,
        request.estadoCivil || colaborator.estadoCivil,
        request.fechaNacimiento || colaborator.fechaNacimiento,
      );
    }

    // Update location info
    if (request.paisResidencia !== undefined || request.region !== undefined ||
        request.comuna !== undefined || request.estadoRegion !== undefined ||
        request.ciudadMunicipio !== undefined) {
      colaborator.updateLocationInfo(
        request.paisResidencia || colaborator.paisResidencia,
        request.region !== undefined ? request.region : colaborator.region,
        request.comuna !== undefined ? request.comuna : colaborator.comuna,
        request.estadoRegion !== undefined ? request.estadoRegion : colaborator.estadoRegion,
        request.ciudadMunicipio !== undefined ? request.ciudadMunicipio : colaborator.ciudadMunicipio,
      );
    }

    // Update contact info if provided
    if (request.telefono || request.email) {
      colaborator.updateContactInfo(
        request.telefono || colaborator.telefono,
        request.email || colaborator.email,
      );
    }

    // Update address if provided
    if (request.direccionResidencia) {
      colaborator.updateDireccion(request.direccionResidencia);
    }

    // Update emergency contact if provided
    if (request.contactoEmergencia !== undefined || request.telefonoEmergencia !== undefined) {
      colaborator.updateEmergencyContact(
        request.contactoEmergencia,
        request.telefonoEmergencia,
      );
    }

    // Update profesion if provided
    if (request.profesion) {
      colaborator.updateProfesion(request.profesion);
    }

    // Update cargo if provided
    if (request.cargo) {
      colaborator.updateCargo(request.cargo);
    }

    // Update group if provided
    if (request.groupId !== undefined && request.groupId !== colaborator.groupId) {
      const group = await this.groupRepository.findById(request.groupId);
      if (!group) {
        throw new ValidationError('Group not found', 'groupId');
      }
      colaborator.changeGroup(request.groupId);
    }

    return await this.colaboratorRepository.update(colaborator);
  }

  public async activate(id: string): Promise<Colaborator> {
    const colaborator = await this.colaboratorRepository.findById(id);

    if (!colaborator) {
      throw new NotFoundError(`Colaborator with id ${id} not found`);
    }

    colaborator.activate();

    return await this.colaboratorRepository.update(colaborator);
  }

  public async suspend(id: string): Promise<Colaborator> {
    const colaborator = await this.colaboratorRepository.findById(id);

    if (!colaborator) {
      throw new NotFoundError(`Colaborator with id ${id} not found`);
    }

    colaborator.suspend();

    return await this.colaboratorRepository.update(colaborator);
  }

  public async deactivate(id: string): Promise<Colaborator> {
    const colaborator = await this.colaboratorRepository.findById(id);

    if (!colaborator) {
      throw new NotFoundError(`Colaborator with id ${id} not found`);
    }

    colaborator.deactivate();

    return await this.colaboratorRepository.update(colaborator);
  }

  public async terminate(id: string): Promise<Colaborator> {
    const colaborator = await this.colaboratorRepository.findById(id);

    if (!colaborator) {
      throw new NotFoundError(`Colaborator with id ${id} not found`);
    }

    colaborator.terminate();

    return await this.colaboratorRepository.update(colaborator);
  }
}

export class DeleteColaboratorUseCase {
  constructor(private readonly colaboratorRepository: ColaboratorRepository) {}

  public async execute(id: string): Promise<void> {
    const colaborator = await this.colaboratorRepository.findById(id);
    if (!colaborator) {
      throw new NotFoundError('Colaborator', id);
    }

    colaborator.softDelete();
    await this.colaboratorRepository.update(colaborator);
  }
}
