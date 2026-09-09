import { CompanyRepository } from '../repositories/company.repository';
import { GroupRepository } from '../../group/repositories/group.repository';
import { Company } from '../entities/company.entity';
import { NotFoundError, ValidationError } from '@shared/domain/errors';

export interface UpdateCompanyInput {
  id: string;
  name?: string;
  taxId?: string;
  address?: string;
  phone?: string;
  email?: string;
  groupId?: number;
}

export class UpdateCompanyUseCase {
  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly groupRepository: GroupRepository,
  ) {}

  async execute(input: UpdateCompanyInput): Promise<Company> {
    const company = await this.companyRepository.findById(input.id);
    if (!company) {
      throw new NotFoundError('Company not found');
    }

    if (input.taxId && input.taxId !== company.taxId) {
      const exists = await this.companyRepository.existsByTaxId(input.taxId, input.id);
      if (exists) {
        throw new ValidationError(`Company with tax ID ${input.taxId} already exists`, 'taxId');
      }
    }

    company.update({
      name: input.name,
      taxId: input.taxId,
      address: input.address,
      phone: input.phone,
      email: input.email,
    });

    if (input.groupId !== undefined && input.groupId !== company.groupId) {
      const group = await this.groupRepository.findById(input.groupId);
      if (!group) {
        throw new ValidationError('Group not found', 'groupId');
      }
      company.changeGroup(input.groupId);
    }

    return await this.companyRepository.update(company);
  }
}
