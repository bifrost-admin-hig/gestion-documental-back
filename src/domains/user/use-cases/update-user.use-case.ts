import { UserRepository } from '../repositories/user.repository';
import { UpdateUserProps, User } from '../entities/user.entity';
import { NotFoundError, ConflictError } from '@shared/domain/errors';
import { RoleRepository } from '@domains/role/repositories/role.repository';

export class UpdateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
  ) {}

  public async execute(props: UpdateUserProps): Promise<User> {
    const user = await this.userRepository.findById(props.id);
    if (!user) {
      throw new NotFoundError('User', props.id);
    }

    // Check if email is being updated and if it's already in use
    if (props.email) {
      const emailStr = typeof props.email === 'string' ? props.email : props.email.toString();
      if (emailStr !== user.email.toString()) {
        const existingUser = await this.userRepository.findByEmail(emailStr);
        if (existingUser) {
          throw new ConflictError('Email is already in use by another user');
        }
      }
    }

    return await this.userRepository.update(props);
  }
}

export class DeleteUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  public async execute(id: string): Promise<void> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User', id);
    }

    await this.userRepository.delete(id);
  }
}
