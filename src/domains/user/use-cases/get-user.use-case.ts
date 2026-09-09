import { UserRepository } from '../repositories/user.repository';
import { User } from '../entities/user.entity';
import { NotFoundError } from '@shared/domain/errors';

export class GetUserByIdUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  public async execute(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User', id);
    }
    return user;
  }
}

export class GetAllUsersUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  public async execute(groupId?: number): Promise<User[]> {
    return await this.userRepository.findAll(groupId);
  }
}

export class GetUserByEmailUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  public async execute(email: string): Promise<User> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundError('User with email ' + email);
    }
    return user;
  }
}
