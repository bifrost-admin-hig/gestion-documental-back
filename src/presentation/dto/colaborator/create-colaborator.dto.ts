import { DocumentType, Gender, CivilStatus } from '@domains/colaborators/value-objects/colaborator-enums';

export interface CreateColaboratorDto {
  tipoDocumento: DocumentType;
  numeroDocumento: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno?: string;
  nacionalidad: string;
  sexo: Gender;
  estadoCivil: CivilStatus;
  fechaNacimiento: string; // ISO date string
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
