import { ContractType, JornadaTrabajo } from '@domains/contract/value-objects/contract-enums';

export interface CreateContractDto {
  rutSociedad: string;
  nombreColaborador: string;
  startDate: Date; // ISO date string
  endDate: Date; // ISO date string
  contractType: ContractType;
  administradorContratoMandante: string;
  administradorContratoEmpresa: string;
  rutAdministradorContrato: string;
  contractNumber: string;
  nombreMandante: string;
  division?: string;
  area?: string;
  dotacionPersonal?: number;
  dotacionVehiculos?: number;
  descripcionServicio?: string;
  nombreProyecto?: string;
  turnos?: string;
  jornadaTrabajo: JornadaTrabajo;
  groupId: number;
}
