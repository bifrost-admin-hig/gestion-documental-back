import { CompanyRepository } from '../repositories/company.repository';
import { NotFoundError } from '@shared/domain/errors';

export class DeleteCompanyUseCase {
  constructor(private readonly companyRepository: CompanyRepository) {}

  async execute(id: string): Promise<void> {
    const company = await this.companyRepository.findById(id);
    if (!company) {
      throw new NotFoundError('Company not found');
    }

    await this.companyRepository.delete(id);
  }
}
