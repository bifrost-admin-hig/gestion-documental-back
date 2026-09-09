import { UserRepository } from '@domains/user/repositories/user.repository';
import { EmailService } from '@shared/infrastructure/email/email-service.interface';
import { UserStatus } from '@domains/user/value-objects/user-status';
import { Email } from '@domains/user/value-objects/email';
import { buildPrimactaNotificationEmail } from '@shared/infrastructure/email/templates/primacta-notification-email.template';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export class SendPasswordResetEmailUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly emailService: EmailService,
    private readonly jwtSecret: string,
    private readonly frontendUrl: string,
  ) {}

  /**
   * Nunca lanza ni revela si el correo existe, está inactivo o si el envío falló:
   * el controlador siempre responde con el mismo mensaje genérico para evitar
   * enumeración de usuarios registrados.
   */
  async execute(email: string): Promise<void> {
    if (!Email.isValid(email)) {
      return;
    }

    if (!this.frontendUrl) {
      console.error('[SendPasswordResetEmailUseCase] FRONTEND_URL is not configured — cannot generate reset link');
      return;
    }

    const user = await this.userRepository.findByEmail(email.trim());
    if (!user || user.status !== UserStatus.ACTIVE) {
      return;
    }

    // Mismo mecanismo de nonce de un solo uso que la activación de cuenta:
    // se persiste antes de firmar para poder invalidar el enlace al usarlo.
    const nonce = crypto.randomUUID();
    await this.userRepository.updatePasswordNonce(user.id, nonce);

    const token = jwt.sign(
      { userId: user.id, nonce, purpose: 'reset-password' },
      this.jwtSecret,
      { expiresIn: '1h' },
    );

    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;

    const title = 'Restablece tu contraseña';
    const html = buildPrimactaNotificationEmail({
      title,
      recipientName: user.firstName,
      message: 'Recibimos una solicitud para restablecer la contraseña de tu cuenta en Primacta. Haz clic en el botón a continuación para elegir una nueva contraseña:',
      actionLabel: 'Restablecer mi contraseña',
      actionUrl: resetUrl,
      warningMessage: 'Este enlace es válido por 1 hora. Si no solicitaste este cambio, puedes ignorar este correo: tu contraseña actual seguirá funcionando.',
    });

    const sent = await this.emailService.send({
      to: user.email.toString(),
      subject: `${title} – Primacta`,
      html,
      text: `Hola ${user.firstName},\n\nRecibimos una solicitud para restablecer la contraseña de tu cuenta en Primacta.\n\nRestablece tu contraseña en el siguiente enlace:\n${resetUrl}\n\nEste enlace es válido por 1 hora.\n\nSi no solicitaste este cambio, ignora este correo.\n\nSaludos cordiales,\nEquipo Primacta`,
    });

    if (!sent) {
      console.error(`[SendPasswordResetEmailUseCase] Failed to send password reset email to user ${user.id}`);
    }
  }
}
