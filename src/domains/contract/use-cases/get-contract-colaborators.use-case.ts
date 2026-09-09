import { ContractRepository } from '@domains/contract/repositories/contract.repository';
import { Colaborator } from '@domains/colaborators/entities/colaborator.entity';

export class GetContractColaboratorsUseCase {
  constructor(private readonly contractRepository: ContractRepository) { }

  public async execute(contractId: string): Promise<Colaborator[]> {
    return this.contractRepository.findColaborators(contractId);
  }
}
