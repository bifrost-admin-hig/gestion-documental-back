import { ContractRepository } from '@domains/contract/repositories/contract.repository';
import { Contract } from '@domains/contract/entities/contract.entity';

export class GetSubcontractsUseCase {
  constructor(private readonly contractRepository: ContractRepository) { }

  public async execute(contractId: string): Promise<Contract[]> {
    return await this.contractRepository.findSubcontracts(contractId);
  }
}
