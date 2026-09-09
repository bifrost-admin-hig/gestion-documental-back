import { Repository } from '@shared/domain/base-entity';
import { Colaborator } from '../entities/colaborator.entity';
import { ColaboratorStatus, DocumentType } from '../value-objects/colaborator-enums';

export interface ColaboratorRepository extends Repository<Colaborator> {
  findAll(groupId?: number, filters?: { contractId?: string }): Promise<Colaborator[]>;
  findByNumeroDocumento(numeroDocumento: string): Promise<Colaborator | null>;
  findByNumeroDocumentoAndGroupId(numeroDocumento: string, groupId: number): Promise<Colaborator | null>;
  findByEmail(email: string): Promise<Colaborator | null>;
  findByEmailAndGroupId(email: string, groupId: number): Promise<Colaborator | null>;
  findByNombre(nombre: string): Promise<Colaborator[]>;
  findByStatus(status: ColaboratorStatus): Promise<Colaborator[]>;
  findByDocumentType(tipo: DocumentType): Promise<Colaborator[]>;
  findByNacionalidad(nacionalidad: string): Promise<Colaborator[]>;
  findByPaisResidencia(pais: string): Promise<Colaborator[]>;
  findByRegion(region: string): Promise<Colaborator[]>;
  findByComuna(comuna: string): Promise<Colaborator[]>;
  findByCargo(cargo: string): Promise<Colaborator[]>;
  findActiveColaborators(): Promise<Colaborator[]>;
  searchByName(searchTerm: string): Promise<Colaborator[]>;
  findIn(ids: string[]): Promise<Colaborator[]>;
  findByIdWithGroups(id: string): Promise<Colaborator | null>;
  findByUserId(userId: string): Promise<Colaborator | null>;
  updateContracts(colaboratorId: string, contractIds: string[]): Promise<void>;
}
