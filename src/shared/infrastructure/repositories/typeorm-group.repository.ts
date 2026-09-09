import { Repository, DataSource } from 'typeorm';
import { GroupRepository } from '@domains/group/repositories/group.repository';
import { CreateGroupProps, UpdateGroupProps, Group } from '@domains/group/entities/group.entity';
import { GroupEntity } from '../database/entities/group.entity';
import { AppDataSource } from '../database/typeorm.config';
import { ConflictError, NotFoundError } from '@shared/domain/errors';
import { UserEntity } from '../database/entities/user.entity';

export class TypeOrmGroupRepository implements GroupRepository {
  private repository: Repository<GroupEntity>;
  private userRepository: Repository<UserEntity>;

  constructor(dataSource?: DataSource) {
    const ds = dataSource || AppDataSource;
    this.repository = ds.getRepository(GroupEntity);
    this.userRepository = ds.getRepository(UserEntity);
  }

  async findAll(): Promise<Group[]> {
    const entities = await this.repository.find({
      relations: ['users', 'users.roles', 'users.roles.permissions'],
      order: { createdAt: 'DESC' },
    });
    return entities.map(GroupEntity.toDomain);
  }

  async findById(id: number): Promise<Group | null> {
    const entity = await this.repository.findOne({
      where: { id },
      relations: ['users', 'users.roles', 'users.roles.permissions'],
    });
    return entity ? GroupEntity.toDomain(entity) : null;
  }

  async findByName(name: string): Promise<Group | null> {
    const entity = await this.repository.findOne({
      where: { name },
      relations: ['users', 'users.roles', 'users.roles.permissions'],
    });
    return entity ? GroupEntity.toDomain(entity) : null;
  }

  async findByUserId(userId: string): Promise<Group | null> {
    const entity = await this.repository
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.users', 'user')
      .where('user.id = :userId', { userId })
      .getOne();

    if (!entity) return null;

    // Load full relations
    const fullEntity = await this.repository.findOne({
      where: { id: entity.id },
      relations: ['users', 'users.roles', 'users.roles.permissions'],
    });

    return fullEntity ? GroupEntity.toDomain(fullEntity) : null;
  }

  async existsByName(name: string): Promise<boolean> {
    const count = await this.repository.count({ where: { name } });
    return count > 0;
  }

  async save(props: CreateGroupProps): Promise<Group> {
    const domain = new Group(props);
    const entity = new GroupEntity();
    entity.name = domain.name;
    entity.description = domain.description;
    entity.users = [];

    const savedEntity = await this.repository.save(entity);
    const reloaded = await this.repository.findOne({
      where: { id: savedEntity.id },
      relations: ['users', 'users.roles', 'users.roles.permissions'],
    });
    return GroupEntity.toDomain(reloaded!);
  }

  async update(props: UpdateGroupProps): Promise<Group> {
    const entity = await this.repository.findOne({ where: { id: props.id } });
    if (!entity) {
      throw new NotFoundError('Group not found');
    }

    entity.name = props.name;
    entity.description = props.description;

    const savedEntity = await this.repository.save(entity);
    const reloaded = await this.repository.findOne({
      where: { id: savedEntity.id },
      relations: ['users', 'users.roles', 'users.roles.permissions'],
    });
    return GroupEntity.toDomain(reloaded!);
  }

  async delete(id: number): Promise<void> {
    await this.repository.delete(id);
  }

  async addUserToGroup(groupId: number, userId: string, permission?: string): Promise<void> {
    const group = await this.repository.findOne({
      where: { id: groupId },
      relations: ['users'],
    });
    if (!group) {
      throw new NotFoundError('Group not found');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check if user already belongs to this group
    const isAlreadyInThisGroup = group.users.some(u => u.id === user.id);
    if (isAlreadyInThisGroup) {
      // User is already in this group, no action needed
      return;
    }

    // Check if user belongs to another group
    const currentGroup = await this.findByUserId(userId);

    if (currentGroup) {
      // User already has a group
      if (permission === 'user:change:group') {
        // Permission allows changing groups, remove from current group first
        await this.removeUserFromGroup(currentGroup.id!, userId);
      } else {
        // Permission does not allow changing (or permission is 'group:assign:user')
        throw new ConflictError(
          `User already belongs to group "${currentGroup.name}". Use "user:change:group" permission to change groups.`,
        );
      }
    }

    // Add user to the new group
    group.users.push(user);
    await this.repository.save(group);
  }

  async removeUserFromGroup(groupId: number, userId: string): Promise<void> {
    const group = await this.repository.findOne({
      where: { id: groupId },
      relations: ['users'],
    });
    if (!group) {
      throw new NotFoundError('Group not found');
    }

    group.users = group.users.filter(u => u.id !== userId);
    await this.repository.save(group);
  }

  async findUsersByGroupId(groupId: number): Promise<Group | null> {
    return this.findById(groupId);
  }
}
