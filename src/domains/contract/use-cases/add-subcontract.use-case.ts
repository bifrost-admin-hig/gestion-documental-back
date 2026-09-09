import { ContractRepository } from '@domains/contract/repositories/contract.repository';

export class AddSubcontractUseCase {
  constructor(private readonly contractRepository: ContractRepository) { }

  public async execute(contractId: string, subcontractId: string): Promise<void> {
    await this.contractRepository.addSubcontract(contractId, subcontractId);
  }
}
