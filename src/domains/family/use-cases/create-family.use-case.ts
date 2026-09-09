import { IFamilyRepository } from '../repositories/family.repository.interface';
import { Family, FamilyProps } from '../entities/family.entity';
import { ConflictError, NotFoundError } from '@shared/domain/errors';
import { GroupRepository } from '@domains/group/repositories/group.repository';
import { ContractRepository } from '@domains/contract/repositories/contract.repository';

export interface CreateFamilyRequest {
  name: string;
  groupId: number;
  contractId: string;
}

export class CreateFamilyUseCase {
  constructor(
    private readonly familyRepository: IFamilyRepository,
    private readonly groupRepository: GroupRepository,
    private readonly contractRepository: ContractRepository,
  ) {}

  public async execute(request: CreateFamilyRequest): Promise<Family> {
    // Validate group exists
    const group = await this.groupRepository.findById(request.groupId);
    if (!group) {
      throw new NotFoundError('Group not found');
    }

    // Validate contract exists
    const contract = await this.contractRepository.findById(request.contractId);
    if (!contract) {
      throw new NotFoundError('Contrato no encontrado');
    }

    // Check if family already exists with the same name
    const existingFamily = await this.familyRepository.findByName(request.name);
    if (existingFamily) {
      throw new ConflictError('Ya existe una familia con este nombre');
    }

    // Create family
    const familyProps: FamilyProps = {
      name: request.name,
      groupId: request.groupId,
      contractId: request.contractId,
    };

    const family = Family.create(familyProps);

    return await this.familyRepository.create(family);
  }
}
