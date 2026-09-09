import { ColaboratorGroupRepository } from '@domains/colaborator-group/repositories/colaborator-group.repository';
import { ColaboratorGroup, UpdateColaboratorGroupProps } from '@domains/colaborator-group/entities/colaborator-group.entity';
import { ColaboratorRepository } from '@domains/colaborators/repositories/colaborator.repository';

export class AssignColaboratorsToGroupUseCase {
  constructor(
    private readonly colaboratorGroupRepository: ColaboratorGroupRepository,
    private readonly colaboratorRepository: ColaboratorRepository,
  ) {}

  async execute(input: { groupId: number; colaboratorIds: string[] }): Promise<ColaboratorGroup> {
    const group = await this.colaboratorGroupRepository.findById(input.groupId);
    if (!group) {
      throw new Error('Colaborator group not found');
    }

    const colaborators = await this.colaboratorRepository.findIn(input.colaboratorIds);

    if (colaborators.length !== input.colaboratorIds.length) {
      throw new Error('One or more colaborators not found');
    }

    group.colaborators = colaborators;

    const updateProps: UpdateColaboratorGroupProps = {
      id: input.groupId,
      name: group.name,
      description: group.description,
      colaborators: group.colaborators,
    };

    return this.colaboratorGroupRepository.update(updateProps);
  }
}
