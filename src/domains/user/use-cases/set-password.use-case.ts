import { UserRepository } from '@domains/user/repositories/user.repository';
import { ValidationError, NotFoundError, UnauthorizedError } from '@shared/domain/errors';
import { UserStatus } from '@domains/user/value-objects/user-status';
import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

interface SetPasswordTokenPayload {
  userId: string;
  nonce: string;
  purpose: 'set-password';
}

export class SetPasswordUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtSecret: string,
  ) {}

  async execute(token: string, newPassword: string): Promise<void> {
    if (!newPassword || newPassword.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long', 'newPassword');
    }

    let payload: SetPasswordTokenPayload;
    try {
      payload = jwt.verify(token, this.jwtSecret) as SetPasswordTokenPayload;
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }

    if (payload.purpose !== 'set-password') {
      throw new UnauthorizedError('Invalid token purpose');
    }

    const user = await this.userRepository.findById(payload.userId);
    if (!user) {
      throw new NotFoundError('User', payload.userId);
    }

    // Verify the nonce matches what is stored in the DB.
    // A mismatch means the token was already used or a newer activation
    // email was sent, invalidating this link.
    if (!user.passwordNonce || user.passwordNonce !== payload.nonce) {
      throw new UnauthorizedError('This activation link has already been used or has been superseded');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Rotate nonce to null — invalidates the token for any subsequent attempt.
    await this.userRepository.update({
      id: user.id,
      email: user.email.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      password: hashedPassword,
      status: UserStatus.ACTIVE,
      passwordNonce: null,
      roles: user.roles,
      groups: user.groups,
      createdAt: user.createdAt,
      updatedAt: new Date(),
      deletedAt: user.deletedAt,
    });
  }
}
