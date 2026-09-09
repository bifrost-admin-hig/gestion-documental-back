import { ColaboratorGroupRepository } from '@domains/colaborator-group/repositories/colaborator-group.repository';
import { Colaborator } from '@domains/colaborators/entities/colaborator.entity';

export class GetColaboratorsFromGroupUseCase {
  constructor(
    private readonly colaboratorGroupRepository: ColaboratorGroupRepository,
  ) {}

  async execute(groupId: number): Promise<Colaborator[]> {
    const group = await this.colaboratorGroupRepository.findById(groupId);
    if (!group) {
      throw new Error('Colaborator group not found');
    }

    return group.colaborators || [];
  }
}
