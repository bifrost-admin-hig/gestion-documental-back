import { ColaboratorRepository } from '../repositories/colaborator.repository';
import { Colaborator, ColaboratorProps } from '../entities/colaborator.entity';
import { DocumentType, Gender, CivilStatus } from '../value-objects/colaborator-enums';
import { ConflictError, ValidationError } from '@shared/domain/errors';
import { GroupRepository } from '@domains/group/repositories/group.repository';

export interface CreateColaboratorRequest {
  tipoDocumento: DocumentType;
  numeroDocumento: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno?: string;
  nacionalidad: string;
  sexo: Gender;
  estadoCivil: CivilStatus;
  fechaNacimiento: Date;
  paisResidencia: string;
  region?: string;
  comuna?: string;
  estadoRegion?: string;
  ciudadMunicipio?: string;
  direccionResidencia: string;
  telefono: string;
  email: string;
  contactoEmergencia?: string;
  telefonoEmergencia?: string;
  profesion: string;
  cargo: string;
  groupId: number;
  contractIds: string[];
}

export class CreateColaboratorUseCase {
  constructor(
    private readonly colaboratorRepository: ColaboratorRepository,
    private readonly groupRepository: GroupRepository,
  ) {}

  public async execute(request: CreateColaboratorRequest): Promise<Colaborator> {
    // Check if document number already exists within the same group (excludes soft-deleted)
    const existingByDocument = await this.colaboratorRepository.findByNumeroDocumentoAndGroupId(
      request.numeroDocumento,
      request.groupId,
    );
    if (existingByDocument) {
      throw new ConflictError('Colaborator with this document number already exists');
    }

    // Check if email already exists within the same group (excludes soft-deleted)
    const existingByEmail = await this.colaboratorRepository.findByEmailAndGroupId(
      request.email,
      request.groupId,
    );
    if (existingByEmail) {
      throw new ConflictError('Colaborator with this email already exists');
    }

    // Validate group exists
    const group = await this.groupRepository.findById(request.groupId);
    if (!group) {
      throw new ValidationError('Group not found', 'groupId');
    }

    const colaboratorProps: ColaboratorProps = {
      ...request,
      fechaNacimiento: new Date(request.fechaNacimiento),
    };

    const colaborator = Colaborator.create(colaboratorProps);
    const savedColaborator = await this.colaboratorRepository.save(colaborator);

    // Assign contracts
    if (request.contractIds && request.contractIds.length > 0) {
      await this.colaboratorRepository.updateContracts(savedColaborator.id, request.contractIds);
    }

    return savedColaborator;
  }
}
