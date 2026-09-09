import { DocumentRepository } from '@domains/document/repositories/document.repository';
import { DocumentHistoryRepository } from '@domains/document/repositories/document-history.repository';
import { SignatureRepository } from '../repositories/signature.repository';
import { SignatureVerificationCodeRepository } from '../repositories/signature-verification-code.repository';
import { Signature } from '../entities/signature.entity';
import { SignatureVerificationCode } from '../entities/signature-verification-code.entity';
import { SignatureStatus, SignatureType, SignatureMethod } from '../value-objects/signature-enums';
import { SignatureCryptoService } from '@shared/security/signature-crypto.service';
import { EmailService } from '@shared/infrastructure/email/email-service.interface';
import { buildPrimactaNotificationEmail } from '@shared/infrastructure/email/templates/primacta-notification-email.template';
import { redactSecret } from '@shared/utils/redact';
import { UserRepository } from '@domains/user/repositories/user.repository';
import { ColaboratorRepository } from '@domains/colaborators/repositories/colaborator.repository';
import { SignatureFlowRepository } from '@domains/signature-flow/repositories/signature-flow.repository';
import { SignatureFlowParticipantRepository } from '@domains/signature-flow/repositories/signature-flow-participant.repository';
import { SignatureCodeNotificationRepository } from '@domains/signature-flow/repositories/signature-code-notification.repository';
import {
  SignatureFlowOrderType,
  SignatureFlowParticipantRole,
  SignatureFlowParticipantStatus,
  SignatureFlowStatus,
} from '@domains/signature-flow/value-objects/signature-flow-enums';
import { NotFoundError, ValidationError, ServerError } from '@shared/domain/errors';

const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 3;

export interface InitiateSignatureParams {
  documentId: string;
  userId: string;
  signatureType?: SignatureType;
  signatureMethod?: SignatureMethod;
  phoneNumber?: string;
}

export interface InitiateSignatureResult {
  signatureId: string;
}

export class InitiateSignatureUseCase {
  constructor(
    private readonly signatureRepository: SignatureRepository,
    private readonly signatureCodeRepository: SignatureVerificationCodeRepository,
    private readonly documentRepository: DocumentRepository,
    private readonly documentHistoryRepository: DocumentHistoryRepository,
    private readonly userRepository: UserRepository,
    private readonly colaboratorRepository: ColaboratorRepository,
    private readonly signatureFlowRepository: SignatureFlowRepository,
    private readonly signatureFlowParticipantRepository: SignatureFlowParticipantRepository,
    private readonly cryptoService: SignatureCryptoService,
    private readonly emailService: EmailService,
    private readonly signatureCodeNotificationRepository?: SignatureCodeNotificationRepository,
  ) {}

  async execute(params: InitiateSignatureParams): Promise<InitiateSignatureResult> {
    const {
      documentId,
      userId,
      signatureType = SignatureType.SIMPLE,
      signatureMethod = SignatureMethod.EMAIL,
      phoneNumber,
    } = params;

    const document = await this.documentRepository.findById(documentId);
    if (!document) {
      throw new NotFoundError('Documento no encontrado');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('Usuario no encontrado');
    }

    if (signatureMethod === SignatureMethod.EMAIL && !user.email) {
      throw new ValidationError('El usuario no tiene un correo electrónico registrado');
    }

    const activeFlow = await this.signatureFlowRepository.findActiveByDocumentId(documentId);
    let pendingSignerParticipantId: string | null = null;
    if (activeFlow) {
      if (activeFlow.status === SignatureFlowStatus.IN_REVIEW) {
        throw new ValidationError('El documento aún está en etapa de revisión y no puede firmarse');
      }

      if (activeFlow.status !== SignatureFlowStatus.IN_SIGNING) {
        throw new ValidationError('El flujo de firma no está disponible para firmar en este momento');
      }

      const participants = await this.signatureFlowParticipantRepository.findByFlowId(activeFlow.id);
      const pendingSigner = participants.find((participant) => (
        participant.role === SignatureFlowParticipantRole.SIGNER
        && participant.userId === userId
        && participant.status === SignatureFlowParticipantStatus.PENDING
        && this.isCurrentStepSigner(participant, participants, activeFlow.signerOrderType)
      ));

      if (!pendingSigner) {
        throw new ValidationError('No tienes una firma pendiente en el flujo activo para este documento');
      }
      pendingSignerParticipantId = pendingSigner.id;
    }

    const colaborator = await this.colaboratorRepository.findByUserId(userId);
    if (!colaborator) {
      throw new ValidationError(
        'El usuario no está asociado a ningún colaborador. No es posible confirmar la identidad del firmante.',
      );
    }

    const signature = Signature.create({
      documentId,
      userId,
      signatureType,
      signatureMethod,
      status: SignatureStatus.PENDING,
    });

    const savedSignature = await this.signatureRepository.save(signature);

    const otpCode = this.cryptoService.generateOtpCode();
    const codeHash = this.cryptoService.hashCode(otpCode, savedSignature.id);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

    const verificationCode = SignatureVerificationCode.create({
      signatureId: savedSignature.id,
      codeHash,
      attempts: 0,
      maxAttempts: MAX_ATTEMPTS,
      expiresAt,
    });

    await this.signatureCodeRepository.save(verificationCode);

    document.updateSignatureStatus(SignatureStatus.PENDING);
    await this.documentRepository.save(document);

    if (signatureMethod === SignatureMethod.SMS) {
      const resolvedPhone = (phoneNumber?.trim() || colaborator.telefono?.trim() || '');
      if (!resolvedPhone) {
        throw new ValidationError('No existe un telefono disponible para enviar el codigo SMS.');
      }

      const smsBody = `Tu código de verificación para firmar tu documento en Primacta es: ${otpCode}`;
      await this.sendSmsCode(resolvedPhone, smsBody);
      await this.logCodeNotification({
        signatureId: savedSignature.id,
        participantId: pendingSignerParticipantId,
        channel: 'sms',
        recipient: resolvedPhone,
        textContent: smsBody,
        otpCode,
      });
    } else {
      const title = 'Código de verificación para firma de documento';
      const html = buildPrimactaNotificationEmail({
        title,
        recipientName: user.firstName,
        message: `Has iniciado el proceso de firma para el documento: ${document.name}. Usa el siguiente código para continuar:`,
        code: otpCode,
        warningMessage: `Este código es válido por ${OTP_EXPIRY_MINUTES} minutos y solo puede utilizarse una vez. No lo compartas con nadie.`,
      });
      const text = `Su código de verificación es: ${otpCode}. Válido por ${OTP_EXPIRY_MINUTES} minutos.`;

      const emailSent = await this.emailService.send({
        to: user.email.toString(),
        subject: title,
        html,
        text,
      });

      if (!emailSent) {
        throw new ServerError('No se pudo enviar el correo con el código de verificación. Intenta nuevamente.');
      }

      await this.logCodeNotification({
        signatureId: savedSignature.id,
        participantId: pendingSignerParticipantId,
        channel: 'email',
        recipient: user.email.toString(),
        subject: title,
        htmlContent: html,
        textContent: text,
        otpCode,
      });
    }

    return { signatureId: savedSignature.id };
  }

  private isCurrentStepSigner(
    participant: { order: number | null },
    participants: Array<{ role: string; status: string; order: number | null }>,
    orderType: SignatureFlowOrderType,
  ): boolean {
    if (orderType !== SignatureFlowOrderType.SEQUENTIAL) return true;
    if (participant.order === null) return true;

    const pendingOrders = participants
      .filter((p) => p.role === SignatureFlowParticipantRole.SIGNER)
      .filter((p) => p.status === SignatureFlowParticipantStatus.PENDING)
      .filter((p) => p.order !== null)
      .map((p) => p.order as number);

    if (pendingOrders.length === 0) return true;

    return participant.order === Math.min(...pendingOrders);
  }

  private async sendSmsCode(phoneNumber: string, body: string): Promise<void> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    const smsProvider = process.env.SMS_PROVIDER?.toLowerCase();

    if (smsProvider !== 'twilio') {
      throw new ServerError('El proveedor SMS configurado no es compatible. Configura SMS_PROVIDER=twilio.');
    }

    if (!accountSid || !authToken || !fromNumber) {
      throw new ServerError('Configuracion incompleta de Twilio. Revisa las variables de entorno del servidor.');
    }

    try {
      const twilioModule = await import('twilio');
      const client = twilioModule.default(accountSid, authToken);
      await client.messages.create({
        body,
        from: fromNumber,
        to: phoneNumber,
      });
    } catch (error) {
      console.warn('[InitiateSignatureUseCase] Error al enviar SMS por Twilio:', error);
      const twilioCode = (error as { code?: number })?.code;
      const friendlyMessage = twilioCode === 21608
        ? 'No se pudo enviar el SMS. Verifica que el número de teléfono sea correcto o intenta con el método por correo.'
        : 'No se pudo enviar el SMS con el código de verificación. Intenta nuevamente o usa el método por correo.';
      throw new ServerError(friendlyMessage);
    }
  }

  /**
   * Registra el envío para trazabilidad, censurando el código real antes de guardarlo:
   * el texto plano del código nunca toca la base de datos, solo llega a la bandeja/teléfono
   * del firmante. Si falla, no interrumpe el proceso de firma (no crítico).
   */
  private async logCodeNotification(params: {
    signatureId: string;
    participantId: string | null;
    channel: 'email' | 'sms';
    recipient: string;
    subject?: string;
    htmlContent?: string;
    textContent?: string;
    otpCode: string;
  }): Promise<void> {
    if (!this.signatureCodeNotificationRepository) return;

    try {
      await this.signatureCodeNotificationRepository.create({
        signatureId: params.signatureId,
        participantId: params.participantId,
        channel: params.channel,
        recipient: params.recipient,
        subject: params.subject ?? null,
        htmlContent: redactSecret(params.htmlContent ?? null, params.otpCode),
        textContent: redactSecret(params.textContent ?? null, params.otpCode),
        sentAt: new Date(),
      });
    } catch (err) {
      console.warn('[InitiateSignatureUseCase] No se pudo registrar el log del código enviado (no crítico):', err);
    }
  }
}
