import { ColaboratorRepository } from '@domains/colaborators/repositories/colaborator.repository';

export interface UpdateColaboratorContractsRequest {
  colaboratorId: string;
  contractIds: string[];
}

export class UpdateColaboratorContractsUseCase {
  constructor(private readonly colaboratorRepository: ColaboratorRepository) {}

  public async execute(request: UpdateColaboratorContractsRequest): Promise<void> {
    if (!request.contractIds || request.contractIds.length === 0) {
      throw new Error('At least one contract is required');
    }

    await this.colaboratorRepository.updateContracts(request.colaboratorId, request.contractIds);
  }
}
