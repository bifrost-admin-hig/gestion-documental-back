import { ContractStatus, ContractType, JornadaTrabajo } from '@domains/contract/value-objects/contract-enums';
import { UserStatus } from '@domains/user/value-objects/user-status';
import { SignatureType, SignatureMethod } from '@domains/signature/value-objects/signature-enums';
import {
  SignatureFlowOrderType,
  SignatureFlowParticipantRole,
} from '@domains/signature-flow/value-objects/signature-flow-enums';
import Joi from 'joi';

export const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  password: Joi.string().min(8).required(),
  roleIds: Joi.array().items(Joi.number().integer()).required(),
  rut: Joi.string().trim().max(12).optional().allow('', null),
  phone: Joi.string().trim().min(7).max(20).optional().allow('', null),
});

export const updateUserSchema = Joi.object({
  email: Joi.string().email().optional(),
  firstName: Joi.string().min(2).max(50).optional(),
  lastName: Joi.string().min(2).max(50).optional(),
  roleIds: Joi.array().items(Joi.number().integer()).optional(),
  status: Joi.string().valid(...Object.values(UserStatus)).optional(),
  skipEmail: Joi.boolean().optional(),
  rut: Joi.string().trim().max(12).optional().allow('', null),
  phone: Joi.string().trim().min(7).max(20).optional().allow('', null),
}).min(1);

export const getUserByIdSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

export const createContractSchema = Joi.object({
  rutSociedad: Joi.string().trim().min(8).max(12).required(),
  nombreColaborador: Joi.string().trim().min(2).max(100).optional(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().optional().greater(Joi.ref('startDate')).messages({
    'date.greater': 'endDate should be after startDate.',
  }),
  contractType: Joi.string().valid(...Object.values(ContractType)).required(),
  administradorContratoMandante: Joi.string().trim().min(2).max(100).required(),
  administradorContratoEmpresa: Joi.string().trim().min(2).max(100).required(),
  rutAdministradorContrato: Joi.string().trim().min(8).max(12).required(),
  contractNumber: Joi.string().trim().min(1).max(50).required(),
  nombreMandante: Joi.string().trim().min(2).max(100).required(),
  companyId: Joi.string().uuid().optional(),
  division: Joi.string().trim().max(100).optional(),
  divisionId: Joi.string().uuid().optional(),
  area: Joi.string().max(100).optional(),
  areaId: Joi.string().uuid().optional(),
  dotacionPersonal: Joi.number().integer().min(0).optional().default(0),
  dotacionVehiculos: Joi.number().integer().min(0).optional().default(0),
  descripcionServicio: Joi.string().max(1000).optional(),
  nombreProyecto: Joi.string().max(100).optional(),
  turnos: Joi.string().max(255).optional().allow(''),
  jornadaTrabajo: Joi.string().valid(...Object.values(JornadaTrabajo)).required(),
  groupId: Joi.number().integer().positive().required(),
  status: Joi.string().valid(...Object.values(ContractStatus)).optional().default(ContractStatus.DRAFT),
});

export const updateContractSchema = Joi.object({
  rutSociedad: Joi.string().trim().min(8).max(12).optional(),
  nombreColaborador: Joi.string().trim().min(2).max(100).optional(),
  contractNumber: Joi.string().trim().min(1).max(50).optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional().greater(Joi.ref('startDate')).messages({
    'date.greater': 'endDate should be after startDate.',
  }),
  contractType: Joi.string().valid(...Object.values(ContractType)).optional(),
  administradorContratoMandante: Joi.string().trim().min(2).max(100).optional(),
  administradorContratoEmpresa: Joi.string().trim().min(2).max(100).optional(),
  rutAdministradorContrato: Joi.string().trim().min(8).max(12).optional(),
  nombreMandante: Joi.string().trim().min(2).max(100).optional(),
  companyId: Joi.string().uuid().optional(),
  descripcionServicio: Joi.string().max(1000).optional(),
  nombreProyecto: Joi.string().max(100).optional(),
  turnos: Joi.string().max(255).optional().allow(''),
  division: Joi.string().trim().max(100).optional(),
  divisionId: Joi.string().uuid().optional(),
  area: Joi.string().max(100).optional(),
  areaId: Joi.string().uuid().optional(),
  jornadaTrabajo: Joi.string().valid(...Object.values(JornadaTrabajo)).optional(),
  dotacionPersonal: Joi.number().integer().min(0).optional(),
  dotacionVehiculos: Joi.number().integer().min(0).optional(),
  groupId: Joi.number().integer().positive().optional(),
}).min(1);

export const getContractByIdSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

export const createColaboratorSchema = Joi.object({
  tipoDocumento: Joi.string().valid('rut', 'pasaporte', 'dni', 'otro').required(),
  numeroDocumento: Joi.string().min(5).max(50).required(),
  nombre: Joi.string().min(2).max(100).required(),
  apellidoPaterno: Joi.string().min(2).max(100).required(),
  apellidoMaterno: Joi.string().min(2).max(100).optional(),
  nacionalidad: Joi.string().min(2).max(100).required(),
  sexo: Joi.string().valid('masculino', 'femenino', 'otro').required(),
  estadoCivil: Joi.string().valid('soltero', 'casado', 'divorciado', 'viudo', 'union_civil').required(),
  fechaNacimiento: Joi.string().isoDate().required(),
  paisResidencia: Joi.string().length(2).required(),
  region: Joi.string().max(100).when('paisResidencia', {
    is: 'CL',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  comuna: Joi.string().max(100).when('paisResidencia', {
    is: 'CL',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  estadoRegion: Joi.string().max(100).when('paisResidencia', {
    is: Joi.not('CL'),
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  ciudadMunicipio: Joi.string().max(100).when('paisResidencia', {
    is: Joi.not('CL'),
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  direccionResidencia: Joi.string().min(5).max(255).required(),
  telefono: Joi.string().min(7).max(20).required(),
  email: Joi.string().email().required(),
  contactoEmergencia: Joi.string().max(100).optional(),
  telefonoEmergencia: Joi.string().min(7).max(20).optional(),
  profesion: Joi.string().min(2).max(100).required(),
  cargo: Joi.string().min(2).max(100).required(),
  groupId: Joi.number().integer().positive().required(),
  contractIds: Joi.array().items(Joi.string().uuid()).min(1).required().messages({
    'array.min': 'At least one contract is required',
    'any.required': 'Contracts are required',
  }),
});

export const updateColaboratorContractsSchema = Joi.object({
  contractIds: Joi.array().items(Joi.string().uuid()).min(1).required().messages({
    'array.min': 'At least one contract is required',
    'any.required': 'Contracts are required',
  }),
});

export const updateColaboratorSchema = Joi.object({
  // Información básica
  nombre: Joi.string().min(2).max(100).optional(),
  apellidoPaterno: Joi.string().min(2).max(100).optional(),
  apellidoMaterno: Joi.string().min(2).max(100).optional().allow('', null),
  // Información del documento
  tipoDocumento: Joi.string().valid('rut', 'pasaporte', 'dni', 'otro').optional(),
  numeroDocumento: Joi.string().min(5).max(50).optional(),
  // Información personal
  nacionalidad: Joi.string().min(2).max(100).optional(),
  sexo: Joi.string().valid('masculino', 'femenino', 'otro').optional(),
  estadoCivil: Joi.string().valid('soltero', 'casado', 'divorciado', 'viudo', 'union_civil').optional(),
  fechaNacimiento: Joi.string().isoDate().optional(),
  // Ubicación
  paisResidencia: Joi.string().length(2).optional(),
  region: Joi.string().max(100).optional().allow('', null),
  comuna: Joi.string().max(100).optional().allow('', null),
  estadoRegion: Joi.string().max(100).optional().allow('', null),
  ciudadMunicipio: Joi.string().max(100).optional().allow('', null),
  direccionResidencia: Joi.string().min(5).max(255).optional(),
  // Contacto
  telefono: Joi.string().min(7).max(20).optional(),
  email: Joi.string().email().optional(),
  contactoEmergencia: Joi.string().max(100).optional().allow('', null),
  telefonoEmergencia: Joi.string().min(7).max(20).optional().allow('', null),
  // Profesional
  profesion: Joi.string().min(2).max(100).optional(),
  cargo: Joi.string().min(2).max(100).optional(),
  // Grupo
  groupId: Joi.number().integer().positive().optional(),
}).min(1);

export const createDocumentTypeSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
});

export const updateDocumentTypeSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
}).min(1);

export const getDocumentTypeByIdSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

export const createDocumentSubtypeSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  documentTypeId: Joi.string().uuid().required(),
});

export const updateDocumentSubtypeSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  documentTypeId: Joi.string().uuid().optional(),
}).min(1);

export const getDocumentSubtypeByIdSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

export const createDocumentSchema = Joi.object({
  colaboratorIds: Joi.array().items(Joi.string().uuid()).optional().allow(null),
  name: Joi.string().min(2).max(255).required(),
  issuedDate: Joi.date()
    .optional()
    .messages({
      'date.base': 'issuedDate must be a valid date',
    }),
  expirationDate: Joi.date()
    .optional()
    .greater(Joi.ref('issuedDate'))
    .allow(null)
    .messages({
      'date.greater': 'expirationDate must be after issuedDate',
      'date.base': 'expirationDate must be a valid date',
    }),
  description: Joi.string().max(1000).optional().allow('', null),
  documentUrl: Joi.string().optional().allow('', null),
  groupId: Joi.number().integer().positive().required(),
  code: Joi.string().max(100).optional().allow('', null),
  reviewDate: Joi.date().optional().allow(null).messages({
    'date.base': 'reviewDate must be a valid date',
  }),
  responsibleColaboratorId: Joi.string().uuid().optional().allow('', null),
  areaId: Joi.string().uuid().optional().allow('', null),
}).unknown(true);

export const updateDocumentSchema = Joi.object({
  documentTypeId: Joi.string().uuid().optional(),
  documentSubtypeId: Joi.string().uuid().optional(),
  colaboratorIds: Joi.array().items(Joi.string().uuid()).optional().allow(null),
  name: Joi.string().min(2).max(255).optional(),
  issuedDate: Joi.date()
    .optional()
    .messages({
      'date.base': 'issuedDate must be a valid date',
    }),
  expirationDate: Joi.date()
    .optional()
    .greater(Joi.ref('issuedDate'))
    .allow(null)
    .messages({
      'date.base': 'expirationDate must be a valid date',
      'date.greater': 'expirationDate must be after issuedDate',
    }),
  contractId: Joi.string().uuid().optional().allow(null),
  description: Joi.string().max(1000).optional().allow(null, ''),
  documentUrl: Joi.string().optional().allow(null, ''),
  groupId: Joi.number().integer().positive().optional(),
  code: Joi.string().max(100).optional().allow('', null),
  reviewDate: Joi.date().optional().allow(null).messages({
    'date.base': 'reviewDate must be a valid date',
  }),
  responsibleColaboratorId: Joi.string().uuid().optional().allow('', null),
  areaId: Joi.string().uuid().optional().allow('', null),
}).min(1).unknown(true); // Permitir campos desconocidos

export const getDocumentByIdSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

export const createPermissionSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  description: Joi.string().max(255).optional(),
});

export const updatePermissionSchema = Joi.object({
  name: Joi.string().min(2).max(50).optional(),
  description: Joi.string().max(255).optional(),
}).min(1);

export const createRoleSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  description: Joi.string().max(255).optional(),
});

export const updateRoleSchema = Joi.object({
  name: Joi.string().min(2).max(50).optional(),
  description: Joi.string().max(255).optional(),
}).min(1);

export const assignPermissionsSchema = Joi.object({
  permissionIds: Joi.array().items(Joi.number().integer()).required(),
});

export const assignRoleToUserSchema = Joi.object({
  roleIds: Joi.array().items(Joi.number().integer()).required(),
});

export const assignReviewerSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  isPrimary: Joi.boolean().optional().default(false),
  validUntil: Joi.alternatives()
    .try(
      Joi.date().iso().min('now').messages({
        'date.min': 'validUntil must be a future date.',
      }),
      Joi.string().valid('').optional(),
    )
    .optional(),
}).custom((value, helpers) => {
  // Convertir string vacío a undefined
  if (value.validUntil === '') {
    delete value.validUntil;
  }

  // Si no es primario, debe tener validUntil
  if (value.isPrimary === false && !value.validUntil) {
    return helpers.error('any.invalid', {
      message: 'Non-primary reviewers must have a validUntil date',
    });
  }
  // Si es primario, no debe tener validUntil
  if (value.isPrimary === true && value.validUntil) {
    return helpers.error('any.invalid', {
      message: 'Primary reviewers cannot have a validUntil date',
    });
  }
  return value;
});

export const updateReviewerSchema = Joi.object({
  isPrimary: Joi.boolean().optional(),
  validUntil: Joi.date().iso().optional().allow(null).min('now').messages({
    'date.min': 'validUntil must be a future date.',
  }),
}).min(1);

export const createColaboratorGroupSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  contractId: Joi.string().uuid().required(),
  description: Joi.string().max(1000).optional(),
});

export const updateColaboratorGroupSchema = Joi.object({
  name: Joi.string().min(2).max(255).optional(),
  contractId: Joi.string().uuid().optional(),
  description: Joi.string().max(1000).optional(),
}).min(1);

export const assignColaboratorsToGroupSchema = Joi.object({
  colaboratorIds: Joi.array().items(Joi.string().uuid()).required(),
});

export const createFamilySchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  groupId: Joi.number().integer().positive().required(),
  contractId: Joi.string().uuid().required(),
});

export const updateFamilySchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  groupId: Joi.number().integer().positive().optional(),
  contractId: Joi.string().uuid().optional(),
}).min(1);

export const assignDocumentsFromFamilySchema = Joi.object({
  familyId: Joi.string().uuid().required(),
  colaboratorIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
  comment: Joi.string().max(500).optional().allow(''),
});

export const createCompanySchema = Joi.object({
  groupId: Joi.number().integer().required(),
  name: Joi.string().min(2).max(200).required(),
  rut: Joi.string().min(8).max(12).required(),
  address: Joi.string().max(300).optional().allow(''),
  contactName: Joi.string().max(150).optional().allow(''),
  contactPhone: Joi.string().max(20).optional().allow(''),
  contactEmail: Joi.string().email().max(100).optional().allow(''),
});

export const updateCompanySchema = Joi.object({
  groupId: Joi.number().integer().optional(),
  name: Joi.string().min(2).max(200).optional(),
  rut: Joi.string().min(8).max(12).optional(),
  address: Joi.string().max(300).optional().allow(''),
  contactName: Joi.string().max(150).optional().allow(''),
  contactPhone: Joi.string().max(20).optional().allow(''),
  contactEmail: Joi.string().email().max(100).optional().allow(''),
}).min(1);

export const createDocumentModelSchema = Joi.object({
  groupId: Joi.number().integer().required(),
  familyId: Joi.string().uuid().required(),
  documentTypeId: Joi.string().uuid().required(),
  documentSubtypeId: Joi.string().uuid().required(),
  requiredForContract: Joi.boolean().optional(),
  requiredForColaborator: Joi.boolean().optional(),
  requiredExpirationDate: Joi.boolean().optional().default(false),
  requiresApproval: Joi.boolean().optional().default(true),
  requiresSignature: Joi.boolean().optional().default(false),
});

export const updateDocumentModelSchema = Joi.object({
  groupId: Joi.number().integer().optional(),
  documentTypeId: Joi.string().uuid().optional(),
  documentSubtypeId: Joi.string().uuid().optional(),
  requiredForContract: Joi.boolean().optional(),
  requiredForColaborator: Joi.boolean().optional(),
  requiredExpirationDate: Joi.boolean().optional(),
  requiresApproval: Joi.boolean().optional(),
  requiresSignature: Joi.boolean().optional(),
}).min(1);

const documentTemplateFieldSchema = Joi.object({
  id: Joi.string().required(),
  name: Joi.string().min(1).max(100).required(),
  label: Joi.string().min(1).max(200).required(),
  fieldType: Joi.string().valid('text', 'number', 'date', 'select', 'textarea').required(),
  required: Joi.boolean().required(),
  order: Joi.number().integer().min(0).required(),
  options: Joi.array().items(Joi.string()).optional(),
});

export const createDocumentTemplateSchema = Joi.object({
  title: Joi.string().min(2).max(255).required(),
  documentDate: Joi.string().isoDate().required(),
  description: Joi.string().max(2000).optional().allow(''),
  groupId: Joi.number().integer().positive().optional(),
  fields: Joi.array().items(documentTemplateFieldSchema).optional().default([]),
});

export const createDocumentTemplateVersionSchema = Joi.object({
  title: Joi.string().min(2).max(255).optional(),
  documentDate: Joi.string().isoDate().optional(),
  description: Joi.string().max(2000).optional().allow(''),
  fields: Joi.array().items(documentTemplateFieldSchema).optional(),
}).min(1);

// Signature schemas
export const initiateSignatureSchema = Joi.object({
  documentId: Joi.string().uuid().required(),
  signatureType: Joi.string().valid(...Object.values(SignatureType)).optional(),
  signatureMethod: Joi.string().valid(...Object.values(SignatureMethod)).optional(),
  phoneNumber: Joi.string().trim().min(7).max(30).optional(),
});

export const validateSignatureCodeSchema = Joi.object({
  signatureId: Joi.string().uuid().required(),
  code: Joi.string().length(6).pattern(/^\d{6}$/).required(),
  timezone: Joi.string().max(64).optional(),
  signatureImage: Joi.string().max(500000).required(),
  saveSignatureForFuture: Joi.boolean().optional(),
});

export const cancelSignatureSchema = Joi.object({
  signatureId: Joi.string().uuid().required(),
});

// Signature Flow schemas
const signatureFlowParticipantSchema = Joi.object({
  userId: Joi.string().uuid().optional(),
  colaboratorId: Joi.string().uuid().optional(),
  externalName: Joi.string().max(255).optional(),
  externalEmail: Joi.string().email().max(255).optional(),
  role: Joi.string().valid(...Object.values(SignatureFlowParticipantRole)).required(),
  order: Joi.number().integer().min(1).optional(),
}).or('userId', 'externalEmail', 'colaboratorId');

export const createSignatureFlowSchema = Joi.object({
  documentId: Joi.string().uuid().required(),
  orderType: Joi.string().valid(...Object.values(SignatureFlowOrderType)).optional(),
  signerOrderType: Joi.string().valid(...Object.values(SignatureFlowOrderType)).optional(),
  participants: Joi.array().items(signatureFlowParticipantSchema).min(1).required(),
  reminderEnabled: Joi.boolean().optional(),
  reminderIntervalMinutes: Joi.number().integer().min(1440).optional(),
  autoCloseEnabled: Joi.boolean().optional(),
  autoCloseIntervalMinutes: Joi.number().integer().min(1440).optional(),
});

export const updateSignatureFlowSchema = Joi.object({
  orderType: Joi.string().valid(...Object.values(SignatureFlowOrderType)).optional(),
  signerOrderType: Joi.string().valid(...Object.values(SignatureFlowOrderType)).optional(),
}).or('orderType', 'signerOrderType');

export const addSignatureFlowParticipantSchema = Joi.object({
  userId: Joi.string().uuid().optional(),
  colaboratorId: Joi.string().uuid().optional(),
  externalName: Joi.string().max(255).optional(),
  externalEmail: Joi.string().email().max(255).optional(),
  role: Joi.string().valid(...Object.values(SignatureFlowParticipantRole)).required(),
  order: Joi.number().integer().min(1).optional(),
}).or('userId', 'externalEmail', 'colaboratorId');

export const processSignatureFlowParticipantActionSchema = Joi.object({
  action: Joi.string().valid('approve', 'reject').required(),
  comment: Joi.string().max(1000).optional().allow('', null),
});

export const resendSignatureFlowNotificationSchema = Joi.object({
  participantIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
});

export const skipSignerSchema = Joi.object({
  comment: Joi.string().trim().min(1).max(1000).required(),
});

export const closeSignatureFlowSchema = Joi.object({
  comment: Joi.string().trim().min(1).max(1000).required(),
});

export const reopenSignatureFlowSchema = Joi.object({
  comment: Joi.string().trim().min(1).max(1000).required(),
});

// Landing settings schemas
export const updateLandingSettingsSchema = Joi.object({
  phone: Joi.string().trim().max(50).optional().allow('', null),
  email: Joi.string().trim().email().max(255).optional().allow('', null),
  address: Joi.string().trim().max(500).optional().allow('', null),
  showPhone: Joi.boolean().optional(),
  showEmail: Joi.boolean().optional(),
  showAddress: Joi.boolean().optional(),
  notificationEmails: Joi.array().items(Joi.string().trim().email()).optional(),
});

export const submitLandingContactSchema = Joi.object({
  nombre: Joi.string().trim().min(1).max(100).required(),
  apellido: Joi.string().trim().min(1).max(100).required(),
  correo: Joi.string().trim().email().max(255).required(),
  cargo: Joi.string().trim().min(1).max(100).required(),
  empresa: Joi.string().trim().min(1).max(150).required(),
  telefono: Joi.string().trim().min(1).max(50).required(),
  mensaje: Joi.string().trim().min(1).max(5000).required(),
});
