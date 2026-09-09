import { ContractRepository } from '@domains/contract/repositories/contract.repository';

export class RemoveColaboratorFromContractUseCase {
  constructor(private readonly contractRepository: ContractRepository) { }

  public async execute(contractId: string, colaboratorId: string): Promise<void> {
    await this.contractRepository.removeColaborator(contractId, colaboratorId);
  }
}
