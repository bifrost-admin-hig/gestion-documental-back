import { UserRepository } from '@domains/user/repositories/user.repository';
import { RoleRepository } from '@domains/role/repositories/role.repository';
import { GroupRepository } from '@domains/group/repositories/group.repository';
import { User } from '@domains/user/entities/user.entity';
import { Role } from '@domains/role/entities/role.entity';
import { ConflictError, ValidationError } from '@shared/domain/errors';
import { UserStatus } from '@domains/user/value-objects/user-status';
import bcrypt from 'bcryptjs';

export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  roleIds?: number[];
  groupId?: number;
  status?: UserStatus;
  rut?: string;
  phone?: string;
}

export class CreateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly groupRepository: GroupRepository,
  ) {}

  public async execute(request: CreateUserRequest): Promise<User> {
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(request.email);
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(request.password, 12);

    // Fetch roles
    if (!request.roleIds?.length) {
      throw new ValidationError('At least one role is required', 'roles');
    }
    const roles = await Promise.all(
      request.roleIds.map(roleId => this.roleRepository.findById(roleId)),
    );
    if (roles.some(r => !r)) {
      throw new ValidationError('One or more roles not found');
    }

    // Create user (inactive by default — must be activated by an admin)
    const user = new User({
      email: request.email.toLowerCase(),
      firstName: request.firstName,
      lastName: request.lastName,
      password: hashedPassword,
      status: request.status ?? UserStatus.INACTIVE,
      rut: request.rut,
      phone: request.phone,
      roles: roles.filter((r): r is Role => r !== null),
    });

    const savedUser = await this.userRepository.save(user);

    // If groupId is provided, assign user to group
    if (request.groupId) {
      await this.groupRepository.addUserToGroup(request.groupId, savedUser.id);
    }

    return savedUser;
  }
}
