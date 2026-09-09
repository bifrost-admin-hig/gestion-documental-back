import { ContractRepository } from '../repositories/contract.repository';
import { Contract } from '../entities/contract.entity';

export class GetParentContractsUseCase {
  constructor(private readonly contractRepo: ContractRepository) {}

  async execute(contractId: string): Promise<Contract[]> {
    return this.contractRepo.findParentContracts(contractId);
  }
}
