import { Contract, CreateContractProps, UpdateContractProps } from '../entities/contract.entity';
import { ContractStatus, ContractType, JornadaTrabajo } from '../value-objects/contract-enums';
import { Colaborator } from '@domains/colaborators/entities/colaborator.entity';

export interface ContractRepository {
  findByRutSociedad(rutSociedad: string): Promise<Contract[]>;
  findByNombreColaborador(nombre: string): Promise<Contract[]>;
  findByStatus(status: ContractStatus): Promise<Contract[]>;
  findByContractType(type: ContractType): Promise<Contract[]>;
  findByNombreMandante(nombreMandante: string): Promise<Contract[]>;
  findByDivision(division: string): Promise<Contract[]>;
  findByArea(area: string): Promise<Contract[]>;
  findByJornadaTrabajo(jornada: JornadaTrabajo): Promise<Contract[]>;
  findByContractNumber(contractNumber: string): Promise<Contract | null>;
  existsByContractNumber(contractNumber: string): Promise<boolean>;
  findActiveContracts(): Promise<Contract[]>;
  findExpiredContracts(): Promise<Contract[]>;
  findContractsEndingBefore(date: Date): Promise<Contract[]>;
  findById(id: string): Promise<Contract | null>;
  findAll(groupId?: number): Promise<Contract[]>;
  save(contract: CreateContractProps): Promise<Contract>;
  update(contract: UpdateContractProps): Promise<Contract>;
  delete(id: string): Promise<void>;
  // Subcontract management
  addSubcontract(contractId: string, subcontractId: string): Promise<void>;
  removeSubcontract(contractId: string, subcontractId: string): Promise<void>;
  findSubcontracts(contractId: string): Promise<Contract[]>;
  findParentContracts(contractId: string): Promise<Contract[]>;
  // Colaborator management
  addColaborator(contractId: string, colaboratorId: string): Promise<void>;
  removeColaborator(contractId: string, colaboratorId: string): Promise<void>;
  findColaborators(contractId: string): Promise<Colaborator[]>;
  findByColaboratorId(colaboratorId: string): Promise<Contract[]>;
}
