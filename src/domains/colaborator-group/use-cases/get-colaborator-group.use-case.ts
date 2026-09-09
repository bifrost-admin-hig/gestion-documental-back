import { NotFoundError } from '@shared/domain/errors';
import { ColaboratorGroup } from '@domains/colaborator-group/entities/colaborator-group.entity';
import { ColaboratorGroupRepository } from '@domains/colaborator-group/repositories/colaborator-group.repository';

export class GetColaboratorGroupByIdUseCase {
  constructor(private readonly colaboratorGroupRepository: ColaboratorGroupRepository) {}

  async execute(id: number): Promise<ColaboratorGroup> {
    const group = await this.colaboratorGroupRepository.findById(id);
    if (!group) {
      throw new NotFoundError(`Colaborator group with ID ${id} not found`);
    }
    return group;
  }
}

export class GetAllColaboratorGroupsUseCase {
  constructor(private readonly colaboratorGroupRepository: ColaboratorGroupRepository) {}

  async execute(groupId?: number): Promise<ColaboratorGroup[]> {
    return this.colaboratorGroupRepository.findAll(groupId);
  }
}
