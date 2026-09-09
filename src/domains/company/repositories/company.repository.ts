import { Company } from '../entities/company.entity';

export interface CompanyRepository {
  findById(id: string): Promise<Company | null>;
  findAll(groupId?: number): Promise<Company[]>;
  save(company: Company): Promise<Company>;
  update(company: Company): Promise<Company>;
  delete(id: string): Promise<void>;
  existsByTaxId(taxId: string, excludeId?: string): Promise<boolean>;
}
