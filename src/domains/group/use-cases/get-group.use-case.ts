import { GroupRepository } from '../repositories/group.repository';
import { Group } from '../entities/group.entity';
import { NotFoundError } from '@shared/domain/errors';

export class GetGroupByIdUseCase {
  constructor(private readonly groupRepository: GroupRepository) {}

  public async execute(id: number): Promise<Group> {
    const group = await this.groupRepository.findById(id);
    if (!group) {
      throw new NotFoundError('Group', id.toString());
    }
    return group;
  }
}
