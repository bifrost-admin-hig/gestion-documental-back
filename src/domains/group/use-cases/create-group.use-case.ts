import { GroupRepository } from '../repositories/group.repository';
import { CreateGroupProps, Group } from '../entities/group.entity';
import { ConflictError } from '@shared/domain/errors';

export class CreateGroupUseCase {
  constructor(private readonly groupRepository: GroupRepository) {}

  public async execute(props: CreateGroupProps): Promise<Group> {
    const exists = await this.groupRepository.existsByName(props.name);
    if (exists) {
      throw new ConflictError('Group with this name already exists');
    }

    return await this.groupRepository.save(props);
  }
}

export class GetAllGroupsUseCase {
  constructor(private readonly groupRepository: GroupRepository) {}

  public async execute(): Promise<Group[]> {
    return await this.groupRepository.findAll();
  }
}
