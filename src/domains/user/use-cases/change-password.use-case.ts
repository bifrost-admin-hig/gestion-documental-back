import { UserRepository } from '../repositories/user.repository';
import * as bcrypt from 'bcryptjs';
import { ValidationError, NotFoundError } from '@shared/domain/errors';

export interface ChangePasswordRequest {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

export class ChangePasswordUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(request: ChangePasswordRequest): Promise<void> {
    const { userId, currentPassword, newPassword } = request;

    // Find user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new ValidationError('Current password is incorrect', 'currentPassword');
    }

    // Validate new password strength (basic validation)
    if (newPassword.length < 8) {
      throw new ValidationError('New password must be at least 8 characters long', 'newPassword');
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update user password - need to provide all required fields
    await this.userRepository.update({
      id: userId,
      email: user.email.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      password: hashedNewPassword,
      roles: user.roles,
      status: user.status,
      groups: user.groups,
      createdAt: user.createdAt,
      updatedAt: new Date(),
      deletedAt: user.deletedAt,
    });
  }
}
