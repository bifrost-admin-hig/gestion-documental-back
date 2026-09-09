export enum ColaboratorStatus {
  ACTIVE = 'activo',
  INACTIVE = 'inactivo',
  SUSPENDED = 'suspendido',
  TERMINATED = 'terminado'
}

export enum DocumentType {
  RUT = 'rut',
  PASAPORTE = 'pasaporte',
  DNI = 'dni',
  OTRO = 'otro'
}

export enum Gender {
  MASCULINO = 'masculino',
  FEMENINO = 'femenino',
  OTRO = 'otro'
}

export enum CivilStatus {
  SOLTERO = 'soltero',
  CASADO = 'casado',
  DIVORCIADO = 'divorciado',
  VIUDO = 'viudo',
  UNION_CIVIL = 'union_civil'
}

export const isValidColaboratorStatus = (status: string): status is ColaboratorStatus => {
  return Object.values(ColaboratorStatus).includes(status as ColaboratorStatus);
};

export const isValidDocumentType = (type: string): type is DocumentType => {
  return Object.values(DocumentType).includes(type as DocumentType);
};

export const isValidGender = (gender: string): gender is Gender => {
  return Object.values(Gender).includes(gender as Gender);
};

export const isValidCivilStatus = (status: string): status is CivilStatus => {
  return Object.values(CivilStatus).includes(status as CivilStatus);
};
