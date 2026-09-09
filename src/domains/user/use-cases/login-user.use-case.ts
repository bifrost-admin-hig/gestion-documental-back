import { UserRepository } from '@domains/user/repositories/user.repository';
import { User } from '@domains/user/entities/user.entity';
import * as bcrypt from 'bcryptjs';
import { UnauthorizedError, ValidationError } from '@shared/domain/errors';
import { UserStatus } from '../value-objects/user-status';

export class LoginUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(email: string, passwordInput: string): Promise<User> {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new ValidationError('Invalid credentials', 'email');
    }

    const isPasswordValid = await bcrypt.compare(passwordInput, user.password);

    if (!isPasswordValid) {
      throw new ValidationError('Invalid credentials', 'password');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedError('Account is not active');
    }

    return user;
  }
}
