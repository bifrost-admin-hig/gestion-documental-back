import { UserRepository } from '@domains/user/repositories/user.repository';
import { ValidationError, NotFoundError, UnauthorizedError } from '@shared/domain/errors';
import { UserStatus } from '@domains/user/value-objects/user-status';
import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

interface ResetPasswordTokenPayload {
  userId: string;
  nonce: string;
  purpose: 'reset-password';
}

export class ResetPasswordUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtSecret: string,
  ) {}

  async execute(token: string, newPassword: string): Promise<void> {
    if (!newPassword || newPassword.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long', 'newPassword');
    }

    let payload: ResetPasswordTokenPayload;
    try {
      payload = jwt.verify(token, this.jwtSecret) as ResetPasswordTokenPayload;
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }

    if (payload.purpose !== 'reset-password') {
      throw new UnauthorizedError('Invalid token purpose');
    }

    const user = await this.userRepository.findById(payload.userId);
    if (!user) {
      throw new NotFoundError('User', payload.userId);
    }

    // Verifica que el nonce coincida con el almacenado en la BD.
    // Un desajuste significa que el enlace ya fue usado o fue reemplazado
    // por una solicitud de restablecimiento más reciente.
    if (!user.passwordNonce || user.passwordNonce !== payload.nonce) {
      throw new UnauthorizedError('This password reset link has already been used or has been superseded');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedError('Account is not active');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Rota el nonce a null — invalida el token ante cualquier intento posterior.
    await this.userRepository.update({
      id: user.id,
      email: user.email.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      password: hashedPassword,
      status: user.status,
      passwordNonce: null,
      roles: user.roles,
      groups: user.groups,
      createdAt: user.createdAt,
      updatedAt: new Date(),
      deletedAt: user.deletedAt,
    });
  }
}
