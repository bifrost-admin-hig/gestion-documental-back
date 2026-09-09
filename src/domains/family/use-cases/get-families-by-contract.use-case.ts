import { IFamilyRepository } from '../repositories/family.repository.interface';
import { Family } from '../entities/family.entity';

export class GetFamiliesByContractUseCase {
  constructor(private readonly familyRepository: IFamilyRepository) {}

  public async execute(contractId: string, groupId?: number): Promise<Family[]> {
    return await this.familyRepository.findByContractId(contractId, groupId);
  }
}
