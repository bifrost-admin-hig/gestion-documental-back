import { ColaboratorStatus, DocumentType, Gender, CivilStatus } from '@domains/colaborators/value-objects/colaborator-enums';

export interface ColaboratorResponseDto {
  id: string;
  tipoDocumento: DocumentType;
  numeroDocumento: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno?: string;
  nombreCompleto: string;
  nacionalidad: string;
  sexo: Gender;
  estadoCivil: CivilStatus;
  fechaNacimiento: Date;
  edad: number;
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
  status: ColaboratorStatus;
  isActive: boolean;
  userId?: string | null;
  contractIds?: string[];
  groupId?: number;
  createdAt: Date;
  updatedAt: Date;
}

export const toColaboratorResponseDto = (colaborator: any): ColaboratorResponseDto => {
  return {
    id: colaborator.id,
    tipoDocumento: colaborator.tipoDocumento,
    numeroDocumento: colaborator.numeroDocumento,
    nombre: colaborator.nombre,
    apellidoPaterno: colaborator.apellidoPaterno,
    apellidoMaterno: colaborator.apellidoMaterno,
    nombreCompleto: colaborator.getNombreCompleto(),
    nacionalidad: colaborator.nacionalidad,
    sexo: colaborator.sexo,
    estadoCivil: colaborator.estadoCivil,
    fechaNacimiento: colaborator.fechaNacimiento,
    edad: colaborator.getAge(),
    paisResidencia: colaborator.paisResidencia,
    region: colaborator.region,
    comuna: colaborator.comuna,
    estadoRegion: colaborator.estadoRegion,
    ciudadMunicipio: colaborator.ciudadMunicipio,
    direccionResidencia: colaborator.direccionResidencia,
    telefono: colaborator.telefono,
    email: colaborator.email,
    contactoEmergencia: colaborator.contactoEmergencia,
    telefonoEmergencia: colaborator.telefonoEmergencia,
    profesion: colaborator.profesion,
    cargo: colaborator.cargo,
    status: colaborator.status,
    isActive: colaborator.isActive(),
    userId: colaborator.userId ?? null,
    contractIds: colaborator.contractIds,
    groupId: colaborator.groupId,
    createdAt: colaborator.createdAt,
    updatedAt: colaborator.updatedAt,
  };
};
