import { Family } from '../entities/family.entity';

export interface IFamilyRepository {
  findAll(groupId?: number): Promise<Family[]>;
  findByContractId(contractId: string, groupId?: number): Promise<Family[]>;
  findById(id: string): Promise<Family | null>;
  findByName(name: string): Promise<Family | null>;
  create(family: Family): Promise<Family>;
  update(family: Family): Promise<Family>;
  delete(id: string): Promise<void>;
  softDelete(id: string): Promise<void>;
  restore(id: string): Promise<void>;
}
