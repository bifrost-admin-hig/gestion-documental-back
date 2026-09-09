import { CreateColaboratorGroupDto } from '@presentation/dto/colaborator-group/colaborator-group.dto';
import { ConflictError } from '@shared/domain/errors';
import { ColaboratorGroup } from '@domains/colaborator-group/entities/colaborator-group.entity';
import { ColaboratorGroupRepository } from '@domains/colaborator-group/repositories/colaborator-group.repository';

export class SaveColaboratorGroupUseCase {
  constructor(private readonly colaboratorGroupRepository: ColaboratorGroupRepository) {}

  async execute(input: CreateColaboratorGroupDto): Promise<ColaboratorGroup> {
    const existingGroup = await this.colaboratorGroupRepository.findByName(input.name);
    if (existingGroup) {
      throw new ConflictError('Colaborator group already exists');
    }

    const group = new ColaboratorGroup(input);
    const savedGroup = await this.colaboratorGroupRepository.save(group);
    return savedGroup;
  }
}
