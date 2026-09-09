import { ContractRepository } from '../repositories/contract.repository';
import { Contract } from '../entities/contract.entity';

export class GetContractsByColaboratorUseCase {
  constructor(private readonly contractRepository: ContractRepository) {}

  public async execute(colaboratorId: string): Promise<Contract[]> {
    return await this.contractRepository.findByColaboratorId(colaboratorId);
  }
}
