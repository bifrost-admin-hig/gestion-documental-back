import { CreateGroupProps, UpdateGroupProps, Group } from '../entities/group.entity';

export interface GroupRepository {
  findById(id: number): Promise<Group | null>;
  findAll(): Promise<Group[]>;
  findByName(name: string): Promise<Group | null>;
  findByUserId(userId: string): Promise<Group | null>;
  existsByName(name: string): Promise<boolean>;
  save(props: CreateGroupProps): Promise<Group>;
  update(props: UpdateGroupProps): Promise<Group>;
  delete(id: number): Promise<void>;
  addUserToGroup(groupId: number, userId: string, permission?: string): Promise<void>;
  removeUserFromGroup(groupId: number, userId: string): Promise<void>;
  findUsersByGroupId(groupId: number): Promise<Group | null>;
}
