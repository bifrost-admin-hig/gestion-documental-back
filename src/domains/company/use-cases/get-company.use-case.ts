import { CompanyRepository } from '../repositories/company.repository';
import { Company } from '../entities/company.entity';
import { NotFoundError } from '@shared/domain/errors';

export class GetCompanyUseCase {
  constructor(private readonly companyRepository: CompanyRepository) {}

  async execute(id: string): Promise<Company> {
    const company = await this.companyRepository.findById(id);
    if (!company) {
      throw new NotFoundError('Company not found');
    }

    return company;
  }
}
