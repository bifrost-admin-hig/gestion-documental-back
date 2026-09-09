export interface UpdateContractDto {
  rutSociedad?: string;
  nombreColaborador?: string;
  contractNumber?: string;
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  contractType?: string;
  administradorContratoMandante?: string;
  administradorContratoEmpresa?: string;
  rutAdministradorContrato?: string;
  nombreMandante?: string;
  descripcionServicio?: string;
  nombreProyecto?: string;
  turnos?: string;
  division?: string;
  area?: string;
  dotacionPersonal?: number;
  dotacionVehiculos?: number;
  jornadaTrabajo?: string;
  groupId?: number;
}
