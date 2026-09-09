import { EntityUtils } from '@shared/utils/common';
import { ContractStatus, ContractType, JornadaTrabajo } from '../value-objects/contract-enums';
import { ValidationError } from '@shared/domain/errors';
import { isValid, parseEnum } from '@shared/utils/objects';
import { DateTimeUtils, DateUtils } from '@shared/utils/date';
import { Colaborator, ColaboratorJson } from '@domains/colaborators/entities/colaborator.entity';

interface BaseContractProps {
  rutSociedad: string;
  nombreColaborador?: string;
  administradorContratoMandante: string;
  administradorContratoEmpresa: string;
  rutAdministradorContrato: string;
  contractNumber: string;
  nombreMandante: string;
  division?: string;
  area?: string;
  areaId?: string;
  areaName?: string;
  divisionId?: string;
  divisionName?: string;
  companyId?: string;
  companyName?: string;
  descripcionServicio?: string;
  nombreProyecto?: string;
  turnos?: string;
  startDate?: DateType,
  endDate?: DateType,
  contractType?: string;
  jornadaTrabajo?: string;
  status?: string;
  dotacionPersonal?: number;
  dotacionVehiculos?: number;
  employeeId?: string;
  managerId?: string;
  groupId: number;
  createdAt?: DateType;
  updatedAt?: DateType;
  deletedAt?: DateType | null;
}

export interface CreateContractProps extends BaseContractProps {
  colaborators?: Colaborator[];
  id?: string;
}

export type UpdateContractProps = {
  id: string;
  rutSociedad?: string;
  nombreColaborador?: string;
  administradorContratoMandante?: string;
  administradorContratoEmpresa?: string;
  rutAdministradorContrato?: string;
  contractNumber?: string;
  nombreMandante?: string;
  division?: string;
  area?: string;
  areaId?: string;
  divisionId?: string;
  companyId?: string;
  descripcionServicio?: string;
  nombreProyecto?: string;
  turnos?: string;
  startDate?: DateType;
  endDate?: DateType;
  contractType?: string;
  jornadaTrabajo?: string;
  status?: string;
  dotacionPersonal?: number;
  dotacionVehiculos?: number;
  employeeId?: string;
  managerId?: string;
  groupId?: number;
  userId?: string;
  userRoles?: Array<{ id: number; name: string }>;
};

export type ContractJson = Overlap<BaseContractProps, {
  id: string;
  startDate?: string;
  endDate?: string;
  duration?: number | null;
  isActive: boolean;
  isExpired: boolean;
  createdAt?: string;
  updatedAt?: string;
  colaborators?: ColaboratorJson[];
  deletedAt?: string | null;
}>;


export class Contract {
  id: string;
  rutSociedad: string;
  nombreColaborador?: string;
  startDate: Date;
  endDate: Date;
  contractType: ContractType;
  administradorContratoMandante: string;
  administradorContratoEmpresa: string;
  rutAdministradorContrato: string;
  contractNumber: string;
  nombreMandante: string;
  division?: string;
  area?: string;
  areaId?: string;
  areaName?: string;
  divisionId?: string;
  divisionName?: string;
  companyId?: string;
  companyName?: string;
  dotacionPersonal: number;
  dotacionVehiculos: number;
  descripcionServicio?: string;
  nombreProyecto?: string;
  turnos?: string;
  jornadaTrabajo: JornadaTrabajo;
  status: ContractStatus;
  employeeId?: string;
  managerId?: string;
  groupId: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  colaborators: Colaborator[];

  constructor(props: CreateContractProps) {
    Contract.validateRequired(props);
    EntityUtils.assign(this as Contract, props, {
      id: 'uuid',
      startDate: 'date',
      endDate: 'date',
      contractType: (type?: string) => parseEnum(type, ContractType) ?? ContractType.CONSULTORIA,
      jornadaTrabajo: (jornada?: string) => parseEnum(jornada, JornadaTrabajo) ?? JornadaTrabajo.COMPLETA,
      status: (status?: string) => parseEnum(status, ContractStatus) ?? ContractStatus.DRAFT,
      dotacionPersonal: (dotacion?: number) => dotacion || 0,
      dotacionVehiculos: (dotacion?: number) => dotacion || 0,
      createdAt: 'datetime',
      updatedAt: 'datetime',
      deletedAt: 'datetimeNullable',
      colaborators: (colaborators?: Colaborator[]) => colaborators ?? [],
    });
  }

  private static validateRequired(props: CreateContractProps): void {
    if (!props.rutSociedad?.trim()) {
      throw new ValidationError('RUT de sociedad is required', 'rutSociedad');
    }
    if (!props.administradorContratoMandante?.trim()) {
      throw new ValidationError('Administrador contrato mandante is required', 'administradorContratoMandante');
    }
    if (!props.administradorContratoEmpresa?.trim()) {
      throw new ValidationError('Administrador contrato empresa is required', 'administradorContratoEmpresa');
    }
    if (!props.rutAdministradorContrato?.trim()) {
      throw new ValidationError('RUT administrador contrato is required', 'rutAdministradorContrato');
    }
    if (!props.contractNumber?.trim()) {
      throw new ValidationError('Contract number is required', 'contractNumber');
    }
    if (!props.nombreMandante?.trim()) {
      throw new ValidationError('Nombre mandante is required', 'nombreMandante');
    }
    if (!props.groupId || props.groupId <= 0) {
      throw new ValidationError('Group ID is required and must be positive', 'groupId');
    }
    if (props.contractType && !isValid(props.contractType, ContractType)) {
      throw new ValidationError('Invalid contract type', 'contractType');
    }
    if (props.jornadaTrabajo && !isValid(props.jornadaTrabajo, JornadaTrabajo)) {
      throw new ValidationError('Invalid jornadaTrabajo', 'jornadaTrabajo');
    }
    if (props.status && !isValid(props.status, ContractStatus)) {
      throw new ValidationError('Invalid contract status', 'status');
    }
  }
  // Business methods
  public activate(): void {
    if (this.status === ContractStatus.TERMINATED) {
      throw new ValidationError('Cannot activate a terminated contract', 'status');
    }
    this.status = ContractStatus.ACTIVE;
  }

  public suspend(): void {
    if (this.status === ContractStatus.TERMINATED) {
      throw new ValidationError('Cannot suspend a terminated contract', 'status');
    }
    this.status = ContractStatus.SUSPENDED;
  }

  public terminate(): void {
    this.status = ContractStatus.TERMINATED;
  }

  public updateNombreColaborador(nombre: string): void {
    if (!nombre?.trim()) {
      throw new ValidationError('Nombre colaborador is required', 'nombreColaborador');
    }
    this.nombreColaborador = nombre.trim();
  }

  public updateRutSociedad(rutSociedad: string): void {
    if (!rutSociedad?.trim()) {
      throw new ValidationError('RUT Sociedad is required', 'rutSociedad');
    }
    this.rutSociedad = rutSociedad.trim();
  }

  public updateContractNumber(contractNumber: string): void {
    if (!contractNumber?.trim()) {
      throw new ValidationError('Contract number is required', 'contractNumber');
    }
    this.contractNumber = contractNumber.trim();
  }

  public updateContractType(contractType: string): void {
    if (!contractType) {
      throw new ValidationError('Contract type is required', 'contractType');
    }
    this.contractType = parseEnum(contractType, ContractType) ?? ContractType.PLAZO_FIJO;
  }

  public updateStartDate(startDate: DateType): void {
    const parsedDate = DateUtils.parse(startDate, true);
    if (!parsedDate) {
      throw new ValidationError('Start date is required', 'startDate');
    }
    this.startDate = parsedDate;
  }

  public updateAdministradorContratoMandante(administrador: string): void {
    if (!administrador?.trim()) {
      throw new ValidationError('Administrador contrato mandante is required', 'administradorContratoMandante');
    }
    this.administradorContratoMandante = administrador.trim();
  }

  public updateAdministradorContratoEmpresa(administrador: string): void {
    if (!administrador?.trim()) {
      throw new ValidationError('Administrador contrato empresa is required', 'administradorContratoEmpresa');
    }
    this.administradorContratoEmpresa = administrador.trim();
  }

  public updateRutAdministradorContrato(rut: string): void {
    if (!rut?.trim()) {
      throw new ValidationError('RUT administrador contrato is required', 'rutAdministradorContrato');
    }
    this.rutAdministradorContrato = rut.trim();
  }

  public updateNombreMandante(nombre: string): void {
    if (!nombre?.trim()) {
      throw new ValidationError('Nombre mandante is required', 'nombreMandante');
    }
    this.nombreMandante = nombre.trim();
  }

  public updateDescripcionServicio(descripcion?: string): void {
    this.descripcionServicio = descripcion?.trim();
  }

  public updateDivision(division?: string): void {
    this.division = division?.trim();
  }

  public updateArea(area?: string): void {
    this.area = area?.trim();
  }

  public updateNombreProyecto(nombreProyecto?: string): void {
    this.nombreProyecto = nombreProyecto?.trim();
  }

  public updateTurnos(turnos?: string): void {
    this.turnos = turnos?.trim() || undefined;
  }

  public changeGroup(groupId: number): void {
    if (!groupId || groupId <= 0) {
      throw new ValidationError('Group ID must be positive', 'groupId');
    }
    this.groupId = groupId;
  }

  public updateJornadaTrabajo(jornadaTrabajo: string): void {
    this.jornadaTrabajo = parseEnum(jornadaTrabajo, JornadaTrabajo) ?? JornadaTrabajo.COMPLETA;
  }

  public updateDotaciones(personal: number, vehiculos: number): void {
    if (personal < 0 || vehiculos < 0) {
      throw new ValidationError('Dotaciones cannot be negative', 'dotaciones');
    }
    this.dotacionPersonal = personal;
    this.dotacionVehiculos = vehiculos;
  }

  public extendContract(endDate?: DateType): void {
    endDate = DateUtils.parse(endDate, true) ?? undefined;
    if (!endDate || !DateUtils.isAfter(endDate, this.startDate)) {
      throw new ValidationError('New end date must be after start date', 'endDate');
    }
    this.endDate = endDate;
  }

  public isActive(): boolean {
    return this.status === ContractStatus.ACTIVE;
  }

  public isEditable(): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(this.startDate);
    start.setHours(0, 0, 0, 0);
    return start > today;
  }

  public get isExpired(): boolean {
    if (!this.endDate || !(this.endDate instanceof Date)) return false;
    return DateUtils.isAfter(new Date(), this.endDate);
  }

  public getDuration(): number | null {
    if (!this.endDate || !(this.endDate instanceof Date)) return null;
    const diffTime = this.endDate.getTime() - this.startDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // days
  }

  public softDelete(): void {
    this.deletedAt = new Date();
    this.updatedAt = new Date();
  }

  public restore(): void {
    this.deletedAt = null;
    this.updatedAt = new Date();
  }

  public toJSON(): ContractJson {
    return {
      id: this.id,
      rutSociedad: this.rutSociedad,
      nombreColaborador: this.nombreColaborador,
      administradorContratoMandante: this.administradorContratoMandante,
      administradorContratoEmpresa: this.administradorContratoEmpresa,
      rutAdministradorContrato: this.rutAdministradorContrato,
      contractNumber: this.contractNumber,
      nombreMandante: this.nombreMandante,
      companyId: this.companyId,
      companyName: this.companyName,
      division: this.division,
      area: this.area,
      descripcionServicio: this.descripcionServicio,
      nombreProyecto: this.nombreProyecto,
      contractType: this.contractType,
      jornadaTrabajo: this.jornadaTrabajo,
      turnos: this.turnos,
      status: this.status,
      dotacionPersonal: this.dotacionPersonal,
      dotacionVehiculos: this.dotacionVehiculos,
      groupId: this.groupId,
      startDate: DateUtils.toString(this.startDate),
      endDate: DateUtils.toString(this.endDate),
      duration: this.getDuration(),
      isActive: this.isActive(),
      isExpired: this.isExpired,
      colaborators: this.colaborators?.map((colaborator) => colaborator.toJSON()) ?? [],
      createdAt: DateTimeUtils.toString(this.createdAt),
      updatedAt: DateTimeUtils.toString(this.updatedAt),
      deletedAt: DateTimeUtils.toString(this.deletedAt, true),
    };
  }
}

