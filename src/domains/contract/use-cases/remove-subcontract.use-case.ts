import { ContractRepository } from '@domains/contract/repositories/contract.repository';

export class RemoveSubcontractUseCase {
  constructor(private readonly contractRepository: ContractRepository) { }

  public async execute(contractId: string, subcontractId: string): Promise<void> {
    await this.contractRepository.removeSubcontract(contractId, subcontractId);
  }
}
