import { UserRepository } from '@domains/user/repositories/user.repository';
import { EmailService } from '@shared/infrastructure/email/email-service.interface';
import { NotFoundError, ServerError } from '@shared/domain/errors';
import { UserStatus } from '@domains/user/value-objects/user-status';
import { buildPrimactaNotificationEmail } from '@shared/infrastructure/email/templates/primacta-notification-email.template';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export class SendActivationEmailUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly emailService: EmailService,
    private readonly jwtSecret: string,
    private readonly frontendUrl: string,
  ) {}

  async execute(userId: string): Promise<void> {
    if (!this.frontendUrl) {
      throw new ServerError('FRONTEND_URL is not configured — cannot generate activation link');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }

    if (user.status !== UserStatus.ACTIVE) {
      return; // Solo enviar si el usuario está activo (el cambio de estado ya ocurrió antes de invocar este use-case)
    }

    // Generate a one-time nonce tied to this specific activation link.
    // Saving it to the DB before signing ensures the token is invalidated
    // as soon as the user sets their password (nonce is rotated to null).
    const nonce = crypto.randomUUID();

    await this.userRepository.updatePasswordNonce(user.id, nonce);

    const token = jwt.sign(
      { userId: user.id, nonce, purpose: 'set-password' },
      this.jwtSecret,
      { expiresIn: '48h' },
    );

    const setPasswordUrl = `${this.frontendUrl}/set-password?token=${token}`;

    const title = 'Tu cuenta ha sido activada';
    const html = buildPrimactaNotificationEmail({
      title,
      recipientName: user.firstName,
      message: 'Tu cuenta en Primacta ha sido activada exitosamente. Para comenzar a utilizar la plataforma, debes establecer tu contraseña haciendo clic en el botón a continuación:',
      actionLabel: 'Configurar mi contraseña',
      actionUrl: setPasswordUrl,
      warningMessage: 'Este enlace es válido por 48 horas. Si expira, solicita un nuevo correo de activación a tu administrador. Si no esperabas este mensaje, puedes ignorarlo sin problema.',
    });

    const sent = await this.emailService.send({
      to: user.email.toString(),
      subject: `${title} – Primacta`,
      html,
      text: `Hola ${user.firstName},\n\nTu cuenta en Primacta ha sido activada.\n\nEstablece tu contraseña en el siguiente enlace:\n${setPasswordUrl}\n\nEste enlace es válido por 48 horas.\n\nSi no esperabas este mensaje, ignóralo.\n\nSaludos cordiales,\nEquipo Primacta`,
    });

    if (!sent) {
      throw new ServerError('Failed to send activation email');
    }
  }
}

