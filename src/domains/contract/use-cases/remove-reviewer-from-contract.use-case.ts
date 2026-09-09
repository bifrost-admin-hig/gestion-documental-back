import { ContractReviewerRepository } from '../repositories/contract-reviewer.repository';
import { NotFoundError } from '@shared/domain/errors';

export class RemoveReviewerFromContractUseCase {
  constructor(
    private readonly contractReviewerRepository: ContractReviewerRepository,
  ) {}

  async execute(input: { contractId: string; userId: string }): Promise<void> {
    // Verificar que la asignación existe
    const reviewer = await this.contractReviewerRepository.findByContractAndUser(
      input.contractId,
      input.userId,
    );
    if (!reviewer) {
      throw new NotFoundError('Reviewer assignment not found');
    }

    await this.contractReviewerRepository.deleteByContractAndUser(input.contractId, input.userId);
  }
}
