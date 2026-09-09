import { ContractStatus, ContractType, JornadaTrabajo } from '@domains/contract/value-objects/contract-enums';
import { Contract } from '@domains/contract/entities/contract.entity';
import { DateUtils } from '@shared/utils/date';

export interface ContractResponseDto {
  id: string;
  rutSociedad: string;
  nombreColaborador?: string;
  startDate: string; // ISO date string
  endDate?: string; // ISO date string, optional
  contractType: ContractType;
  administradorContratoMandante: string;
  administradorContratoEmpresa: string;
  rutAdministradorContrato: string;
  contractNumber: string;
  nombreMandante: string;
  companyId?: string;
  companyName?: string;
  division?: string;
  area?: string;
  dotacionPersonal: number;
  dotacionVehiculos: number;
  descripcionServicio?: string;
  nombreProyecto?: string;
  turnos?: string;
  jornadaTrabajo: JornadaTrabajo;
  status: ContractStatus;
  groupId: number;
  duration?: number | null; // days
  isActive: boolean;
  isExpired: boolean;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  deletedAt?: string | null; // ISO date string, optional
}

export function toContractResponseDto(contract: Contract): ContractResponseDto {
  const json = contract.toJSON();
  return {
    id: json.id,
    rutSociedad: json.rutSociedad,
    nombreColaborador: json.nombreColaborador,
    startDate: DateUtils.toString(json.startDate)!,
    endDate: DateUtils.toString(json.endDate),
    contractType: json.contractType as ContractType,
    administradorContratoMandante: json.administradorContratoMandante,
    administradorContratoEmpresa: json.administradorContratoEmpresa,
    rutAdministradorContrato: json.rutAdministradorContrato,
    contractNumber: json.contractNumber,
    nombreMandante: json.nombreMandante,
    companyId: json.companyId,
    companyName: json.companyName,
    division: json.division,
    area: json.area,
    dotacionPersonal: json.dotacionPersonal ?? 0,
    dotacionVehiculos: json.dotacionVehiculos ?? 0,
    descripcionServicio: json.descripcionServicio,
    nombreProyecto: json.nombreProyecto,
    turnos: json.turnos,
    jornadaTrabajo: json.jornadaTrabajo as JornadaTrabajo,
    status: json.status as ContractStatus,
    groupId: json.groupId,
    duration: json.duration,
    isActive: json.isActive,
    isExpired: json.isExpired,
    createdAt: DateUtils.toString(json.createdAt)!,
    updatedAt: DateUtils.toString(json.updatedAt)!,
    deletedAt: DateUtils.toString(json.deletedAt),
  };
}
