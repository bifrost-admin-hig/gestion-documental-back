import { CreateUserProps, UpdateUserProps, User } from '../entities/user.entity';
import { UserStatus } from '../value-objects/user-status';

export interface UserRepository {
  assignRoleToUser(userId: string, roleId: number): Promise<void>;
  findById(id: string): Promise<User | null>;
  findAll(groupId?: number): Promise<User[]>;
  findByEmail(email: string): Promise<User | null>;
  findByStatus(status: UserStatus): Promise<User[]>;
  findByRoleId(roleId: number): Promise<User[]>;
  existsByEmail(email: string): Promise<boolean>;
  save(request: CreateUserProps): Promise<User>;
  update(request: UpdateUserProps): Promise<User>;
  updatePasswordNonce(userId: string, nonce: string | null): Promise<void>;
  delete(id: string): Promise<void>;
}
