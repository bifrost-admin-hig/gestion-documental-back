import { GroupRepository } from '../repositories/group.repository';
import { UserRepository } from '@domains/user/repositories/user.repository';
import { NotFoundError } from '@shared/domain/errors';

export class AddUserToGroupUseCase {
  constructor(
    private readonly groupRepository: GroupRepository,
    private readonly userRepository: UserRepository,
  ) {}

  public async execute(groupId: number, userId: string, permission?: string): Promise<void> {
    const group = await this.groupRepository.findById(groupId);
    if (!group) throw new NotFoundError('Group', groupId.toString());

    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundError('User', userId);

    await this.groupRepository.addUserToGroup(groupId, userId, permission);
  }
}

export class RemoveUserFromGroupUseCase {
  constructor(
    private readonly groupRepository: GroupRepository,
    private readonly userRepository: UserRepository,
  ) {}

  public async execute(groupId: number, userId: string): Promise<void> {
    const group = await this.groupRepository.findById(groupId);
    if (!group) throw new NotFoundError('Group', groupId.toString());

    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundError('User', userId);

    await this.groupRepository.removeUserFromGroup(groupId, userId);
  }
}

export class AssignGroupToUserUseCase {
  constructor(
    private readonly groupRepository: GroupRepository,
    private readonly userRepository: UserRepository,
  ) {}

  public async execute(userId: string, groupId: number, permission?: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundError('User', userId);

    const group = await this.groupRepository.findById(groupId);
    if (!group) throw new NotFoundError('Group', groupId.toString());

    // Reuse the same logic as AddUserToGroupUseCase
    await this.groupRepository.addUserToGroup(groupId, userId, permission);
  }
}
