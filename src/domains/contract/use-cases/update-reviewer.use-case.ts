import { ContractReviewerRepository } from '../repositories/contract-reviewer.repository';
import { NotFoundError } from '@shared/domain/errors';
import { ContractReviewer } from '../entities/contract-reviewer.entity';

export class UpdateReviewerUseCase {
  constructor(
    private readonly contractReviewerRepository: ContractReviewerRepository,
  ) {}

  async execute(input: {
    contractId: string;
    userId: string;
    isPrimary?: boolean;
    validUntil?: DateType | null;
  }): Promise<ContractReviewer> {
    // Buscar el reviewer
    const reviewer = await this.contractReviewerRepository.findByContractAndUser(
      input.contractId,
      input.userId,
    );
    if (!reviewer) {
      throw new NotFoundError('Reviewer assignment not found');
    }

    // Actualizar usando los métodos de negocio de la entidad
    if (input.isPrimary !== undefined) {
      if (input.isPrimary) {
        reviewer.setPrimary();
      } else if (input.validUntil) {
        reviewer.setTemporary(input.validUntil);
      }
    } else if (input.validUntil !== undefined && !reviewer.isPrimary) {
      if (input.validUntil) {
        reviewer.extendValidity(input.validUntil);
      }
    }

    return this.contractReviewerRepository.update({
      id: reviewer.id,
      isPrimary: reviewer.isPrimary,
      validUntil: reviewer.validUntil,
    });
  }
}
