import { GroupRepository } from '../repositories/group.repository';
import { UpdateGroupProps, Group } from '../entities/group.entity';
import { NotFoundError, ConflictError } from '@shared/domain/errors';

export class UpdateGroupUseCase {
  constructor(private readonly groupRepository: GroupRepository) {}

  public async execute(props: UpdateGroupProps): Promise<Group> {
    const group = await this.groupRepository.findById(props.id);
    if (!group) {
      throw new NotFoundError('Group', props.id.toString());
    }

    if (props.name && props.name !== group.name) {
      const exists = await this.groupRepository.existsByName(props.name);
      if (exists) {
        throw new ConflictError('Group with this name already exists');
      }
    }

    return await this.groupRepository.update(props);
  }
}

export class DeleteGroupUseCase {
  constructor(private readonly groupRepository: GroupRepository) {}

  public async execute(id: number): Promise<void> {
    const group = await this.groupRepository.findById(id);
    if (!group) {
      throw new NotFoundError('Group', id.toString());
    }

    await this.groupRepository.delete(id);
  }
}
