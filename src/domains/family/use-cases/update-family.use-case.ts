import { IFamilyRepository } from '../repositories/family.repository.interface';
import { Family } from '../entities/family.entity';
import { NotFoundError, ConflictError } from '@shared/domain/errors';
import { GroupRepository } from '@domains/group/repositories/group.repository';
import { ContractRepository } from '@domains/contract/repositories/contract.repository';

export interface UpdateFamilyRequest {
  name?: string;
  groupId?: number;
  contractId?: string;
}

export class UpdateFamilyUseCase {
  constructor(
    private readonly familyRepository: IFamilyRepository,
    private readonly groupRepository: GroupRepository,
    private readonly contractRepository: ContractRepository,
  ) {}

  public async execute(id: string, request: UpdateFamilyRequest): Promise<Family> {
    const family = await this.familyRepository.findById(id);
    if (!family) {
      throw new NotFoundError('Familia no encontrada');
    }

    // Validate group if changing
    if (request.groupId && request.groupId !== family.groupId) {
      const group = await this.groupRepository.findById(request.groupId);
      if (!group) {
        throw new NotFoundError('Group not found');
      }
      family.changeGroup(request.groupId);
    }

    // Validate contract if changing
    if (request.contractId && request.contractId !== family.contractId) {
      const contract = await this.contractRepository.findById(request.contractId);
      if (!contract) {
        throw new NotFoundError('Contrato no encontrado');
      }
      family.changeContract(request.contractId);
    }

    // Check if another family already exists with the same name
    if (request.name) {
      const existingFamily = await this.familyRepository.findByName(request.name);
      if (existingFamily && existingFamily.id !== id) {
        throw new ConflictError('Ya existe una familia con este nombre');
      }
      family.updateName(request.name);
    }

    return await this.familyRepository.update(family);
  }
}

export class DeleteFamilyUseCase {
  constructor(private readonly familyRepository: IFamilyRepository) {}

  public async execute(id: string): Promise<void> {
    const family = await this.familyRepository.findById(id);
    if (!family) {
      throw new NotFoundError('Familia no encontrada');
    }

    await this.familyRepository.softDelete(id);
  }
}
