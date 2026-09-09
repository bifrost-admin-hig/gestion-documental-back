import { ContractReviewerRepository } from '../repositories/contract-reviewer.repository';
import { ContractReviewer } from '../entities/contract-reviewer.entity';

export class GetContractReviewersUseCase {
  constructor(
    private readonly contractReviewerRepository: ContractReviewerRepository,
  ) {}

  async execute(contractId: string, activeOnly: boolean = false): Promise<ContractReviewer[]> {
    if (activeOnly) {
      return this.contractReviewerRepository.findActiveByContract(contractId);
    }
    return this.contractReviewerRepository.findByContract(contractId);
  }
}
