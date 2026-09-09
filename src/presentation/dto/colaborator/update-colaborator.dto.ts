export interface UpdateColaboratorDto {
  // Información básica
  nombre?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  // Información del documento
  tipoDocumento?: 'rut' | 'pasaporte' | 'dni' | 'otro';
  numeroDocumento?: string;
  // Información personal
  nacionalidad?: string;
  sexo?: 'masculino' | 'femenino' | 'otro';
  estadoCivil?: 'soltero' | 'casado' | 'divorciado' | 'viudo' | 'union_civil';
  fechaNacimiento?: string;
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
