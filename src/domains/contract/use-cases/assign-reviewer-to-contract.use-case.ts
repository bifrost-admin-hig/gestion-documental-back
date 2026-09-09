import { ContractReviewerRepository } from '../repositories/contract-reviewer.repository';
import { ContractRepository } from '../repositories/contract.repository';
import { UserRepository } from '@domains/user/repositories/user.repository';
import { NotFoundError, ValidationError } from '@shared/domain/errors';
import { ContractReviewer } from '../entities/contract-reviewer.entity';

export class AssignReviewerToContractUseCase {
  constructor(
    private readonly contractReviewerRepository: ContractReviewerRepository,
    private readonly contractRepository: ContractRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(input: {
    contractId: string;
    userId: string;
    isPrimary?: boolean;
    validUntil?: DateType;
  }): Promise<ContractReviewer> {
    // Verificar que el contrato existe
    const contract = await this.contractRepository.findById(input.contractId);
    if (!contract) {
      throw new NotFoundError('Contract not found');
    }

    // Verificar que el usuario existe
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verificar que el usuario tenga el permiso document:review
    if (!user.can('document:review')) {
      throw new ValidationError('User does not have document:review permission', 'userId');
    }

    // Verificar que el usuario no esté ya asignado como revisor activo del contrato
    const existing = await this.contractReviewerRepository.findByContractAndUser(
      input.contractId,
      input.userId,
    );

    if (existing) {
      // Si existe un revisor pero está inactivo/vencido, lo eliminamos para reasignarlo
      if (!existing.isActive()) {
        await this.contractReviewerRepository.deleteByContractAndUser(
          input.contractId,
          input.userId,
        );
      } else {
        // Si el revisor está activo, no permitir duplicados
        throw new ValidationError('User is already assigned as active reviewer for this contract', 'userId');
      }
    }

    // Crear el reviewer
    return this.contractReviewerRepository.save({
      contractId: input.contractId,
      userId: input.userId,
      isPrimary: input.isPrimary,
      validUntil: input.validUntil,
    });
  }
}
