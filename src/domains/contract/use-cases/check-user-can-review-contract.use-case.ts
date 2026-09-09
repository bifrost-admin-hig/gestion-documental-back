import { ContractReviewerRepository } from '../repositories/contract-reviewer.repository';

export interface CheckUserCanReviewContractResult {
  canReview: boolean;
  hasReviewers: boolean;
  isUserReviewer: boolean;
}

export class CheckUserCanReviewContractUseCase {
  constructor(
    private readonly contractReviewerRepository: ContractReviewerRepository,
  ) {}

  async execute(contractId: string, userId: string): Promise<CheckUserCanReviewContractResult> {
    const reviewers = await this.contractReviewerRepository.findActiveByContract(contractId);
    const hasReviewers = reviewers.length > 0;
    const isUserReviewer = reviewers.some(reviewer => reviewer.userId === userId && reviewer.isActive());

    return {
      canReview: hasReviewers && isUserReviewer,
      hasReviewers,
      isUserReviewer,
    };
  }
}
