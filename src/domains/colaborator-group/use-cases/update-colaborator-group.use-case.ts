import { ConflictError, NotFoundError } from '@shared/domain/errors';
import { ColaboratorGroup, UpdateColaboratorGroupProps } from '@domains/colaborator-group/entities/colaborator-group.entity';
import { ColaboratorGroupRepository } from '@domains/colaborator-group/repositories/colaborator-group.repository';

export class UpdateColaboratorGroupUseCase {
  constructor(private readonly colaboratorGroupRepository: ColaboratorGroupRepository) {}

  async execute(props: UpdateColaboratorGroupProps): Promise<ColaboratorGroup> {
    const group = await this.colaboratorGroupRepository.findById(props.id);
    if (!group) {
      throw new NotFoundError(`Colaborator group with ID ${props.id} not found`);
    }

    if (props.name) {
      const existing = await this.colaboratorGroupRepository.findByName(props.name);
      if (existing && existing.id !== props.id) {
        throw new ConflictError('Colaborator group name already taken');
      }
    }

    return this.colaboratorGroupRepository.update(props);
  }
}

export class DeleteColaboratorGroupUseCase {
  constructor(private readonly colaboratorGroupRepository: ColaboratorGroupRepository) {}

  async execute(id: number): Promise<void> {
    const group = await this.colaboratorGroupRepository.findById(id);
    if (!group) {
      throw new NotFoundError(`Colaborator group with ID ${id} not found`);
    }

    await this.colaboratorGroupRepository.delete(id);
  }
}
