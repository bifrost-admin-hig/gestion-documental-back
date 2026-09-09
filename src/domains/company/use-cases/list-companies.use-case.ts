import { CompanyRepository } from '../repositories/company.repository';
import { Company } from '../entities/company.entity';

export class ListCompaniesUseCase {
  constructor(private readonly companyRepository: CompanyRepository) {}

  async execute(groupId?: number): Promise<Company[]> {
    return await this.companyRepository.findAll(groupId);
  }
}
