import { CompanyRepository } from '../repositories/company.repository';
import { GroupRepository } from '../../group/repositories/group.repository';
import { Company } from '../entities/company.entity';
import { ValidationError } from '@shared/domain/errors';

export interface CreateCompanyInput {
  name: string;
  taxId: string;
  address?: string;
  phone?: string;
  email?: string;
  groupId: number;
}

export class CreateCompanyUseCase {
  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly groupRepository: GroupRepository,
  ) {}

  async execute(input: CreateCompanyInput): Promise<Company> {
    const exists = await this.companyRepository.existsByTaxId(input.taxId);
    if (exists) {
      throw new ValidationError(`Company with tax ID ${input.taxId} already exists`, 'taxId');
    }

    const group = await this.groupRepository.findById(input.groupId);
    if (!group) {
      throw new ValidationError('Group not found', 'groupId');
    }

    const company = new Company(input);
    return await this.companyRepository.save(company);
  }
}
