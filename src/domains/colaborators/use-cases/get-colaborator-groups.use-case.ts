import { ColaboratorRepository } from '@domains/colaborators/repositories/colaborator.repository';
import { ColaboratorGroupRepository } from '@domains/colaborator-group/repositories/colaborator-group.repository';
import { ColaboratorGroup } from '@domains/colaborator-group/entities/colaborator-group.entity';
import { NotFoundError } from '@shared/domain/errors';

export class GetColaboratorGroupsUseCase {
  constructor(
    private readonly colaboratorRepository: ColaboratorRepository,
    private readonly colaboratorGroupRepository: ColaboratorGroupRepository,
  ) {}

  async execute(colaboratorId: string): Promise<ColaboratorGroup[]> {
    const colaborator = await this.colaboratorRepository.findById(colaboratorId);
    if (!colaborator) {
      throw new NotFoundError(`Colaborator with ID ${colaboratorId} not found`);
    }

    const allGroups = await this.colaboratorGroupRepository.findAll();
    const colaboratorGroups = allGroups.filter(group =>
      group.colaborators?.some(c => c.id === colaboratorId),
    );

    return colaboratorGroups;
  }
}
