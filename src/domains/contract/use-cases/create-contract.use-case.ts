import { ContractRepository } from '@domains/contract/repositories/contract.repository';
import { Contract, CreateContractProps } from '@domains/contract/entities/contract.entity';
import { ConflictError, ValidationError } from '@shared/domain/errors';
import { GroupRepository } from '@domains/group/repositories/group.repository';

export class CreateContractUseCase {
  constructor(
    private readonly contractRepository: ContractRepository,
    private readonly groupRepository: GroupRepository,
  ) {}

  public async execute(request: CreateContractProps): Promise<Contract> {
    // Validate group exists
    const group = await this.groupRepository.findById(request.groupId);
    if (!group) {
      throw new ValidationError('Group not found', 'groupId');
    }

    // Check if contract number already exists
    const contractExists = await this.contractRepository.existsByContractNumber(request.contractNumber);
    if (contractExists) {
      throw new ConflictError('Contract with this number already exists');
    }

    const contract = new Contract(request);

    return await this.contractRepository.save(contract);
  }
}
