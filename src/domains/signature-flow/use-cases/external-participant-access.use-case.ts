import { randomBytes } from 'crypto';
import { DocumentRepository } from '@domains/document/repositories/document.repository';
import { ColaboratorRepository } from '@domains/colaborators/repositories/colaborator.repository';
import { ValidationError } from '@shared/domain/errors';
import { ExternalParticipantTokenRepository } from '../repositories/external-participant-token.repository';
import { SignatureFlowParticipantRepository } from '../repositories/signature-flow-participant.repository';
import { SignatureFlowRepository } from '../repositories/signature-flow.repository';
import { SignatureFlowParticipantRole, SignatureFlowParticipantStatus, SignatureFlowStatus } from '../value-objects/signature-flow-enums';
import { SignatureCryptoService } from '@shared/security/signature-crypto.service';
import { EmailService } from '@shared/infrastructure/email/email-service.interface';
import { buildPrimactaNotificationEmail } from '@shared/infrastructure/email/templates/primacta-notification-email.template';
import { redactSecret } from '@shared/utils/redact';
import { SignatureCodeNotificationRepository } from '../repositories/signature-code-notification.repository';
import { ProcessFlowParticipantActionUseCase } from './progress-signature-flow.use-case';
import { TypeOrmFileRepository } from '@shared/infrastructure/repositories/typeorm-file.repository';
import { UserSignatureRepository } from '@domains/signature/repositories/user-signature.repository';
import {
  GetSavedSignaturePreviewUseCase,
  type SavedSignaturePreview,
} from '@domains/signature/use-cases/get-saved-signature-preview.use-case';
import { decodeSignatureImage } from '@shared/utils/image';

const EXTERNAL_TOKEN_EXPIRY_HOURS = parseInt(process.env.EXTERNAL_PARTICIPANT_TOKEN_EXPIRY_HOURS ?? '168', 10);
const OTP_EXPIRY_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 3;

export interface ExternalAccessInfo {
  status: 'valid' | 'expired' | 'already_used' | 'invalid';
  participant: {
    id: string;
    role: string;
    name: string;
    email: string;
    status: string;
    canAct: boolean;
    requiresDocumentNumber: boolean;
    canSaveSignature: boolean;
  } | null;
  document: {
    id: string;
    name: string;
    documentUrl: string | null;
  } | null;
  flow: {
    id: string;
    status: string;
  } | null;
  expiresAt: Date | null;
}

export class GetExternalParticipantAccessUseCase {
  constructor(
    private readonly tokenRepository: ExternalParticipantTokenRepository,
    private readonly participantRepository: SignatureFlowParticipantRepository,
    private readonly flowRepository: SignatureFlowRepository,
    private readonly documentRepository: DocumentRepository,
  ) {}

  async execute(token: string): Promise<ExternalAccessInfo> {
    const tokenRecord = await this.tokenRepository.findByToken(token);
    if (!tokenRecord) {
      return { status: 'invalid', participant: null, document: null, flow: null, expiresAt: null };
    }

    if (tokenRecord.isExpired) {
      return { status: 'expired', participant: null, document: null, flow: null, expiresAt: tokenRecord.expiresAt };
    }

    if (tokenRecord.isUsed) {
      return { status: 'already_used', participant: null, document: null, flow: null, expiresAt: tokenRecord.expiresAt };
    }

    const participant = await this.participantRepository.findById(tokenRecord.participantId);
    if (!participant) {
      return { status: 'invalid', participant: null, document: null, flow: null, expiresAt: null };
    }

    const flow = await this.flowRepository.findById(participant.flowId);
    if (!flow) {
      return { status: 'invalid', participant: null, document: null, flow: null, expiresAt: null };
    }

    const document = await this.documentRepository.findById(flow.documentId);
    if (!document) {
      return { status: 'invalid', participant: null, document: null, flow: null, expiresAt: null };
    }

    const isValidator = participant.role === SignatureFlowParticipantRole.VALIDATOR;
    const isSigner = participant.role === SignatureFlowParticipantRole.SIGNER;

    const canAct = participant.status === SignatureFlowParticipantStatus.PENDING
      && ((isValidator && flow.status === SignatureFlowStatus.IN_REVIEW)
        || (isSigner && flow.status === SignatureFlowStatus.IN_SIGNING));

    return {
      status: 'valid',
      participant: {
        id: participant.id,
        role: participant.role,
        name: participant.externalName ?? 'Participante externo',
        email: participant.externalEmail ?? '',
        status: participant.status,
        canAct,
        requiresDocumentNumber: !participant.colaboratorId,
        canSaveSignature: Boolean(participant.colaboratorId),
      },
      document: { id: document.id, name: document.name, documentUrl: document.documentUrl ?? null },
      flow: { id: flow.id, status: flow.status },
      expiresAt: tokenRecord.expiresAt,
    };
  }
}

export class SubmitExternalParticipantActionUseCase {
  constructor(
    private readonly tokenRepository: ExternalParticipantTokenRepository,
    private readonly participantRepository: SignatureFlowParticipantRepository,
    private readonly flowRepository: SignatureFlowRepository,
    private readonly processFlowUseCase: ProcessFlowParticipantActionUseCase,
  ) {}

  async execute(token: string, action: 'approve' | 'reject', comment?: string): Promise<void> {
    const tokenRecord = await this.tokenRepository.findByToken(token);
    if (!tokenRecord || tokenRecord.isExpired || tokenRecord.isUsed) {
      throw new ValidationError('El enlace de acceso no es válido o ya fue utilizado.');
    }

    const participant = await this.participantRepository.findById(tokenRecord.participantId);
    if (!participant || participant.role !== SignatureFlowParticipantRole.VALIDATOR) {
      throw new ValidationError('Esta acción no está disponible para este participante.');
    }

    if (participant.status !== SignatureFlowParticipantStatus.PENDING) {
      throw new ValidationError('Este participante ya realizó su acción.');
    }

    await this.processFlowUseCase.executeForExternal({
      participantId: participant.id,
      action,
      comment,
    });

    tokenRecord.usedAt = new Date();
    await this.tokenRepository.update(tokenRecord);
  }
}

export class RequestExternalSignerOtpUseCase {
  constructor(
    private readonly tokenRepository: ExternalParticipantTokenRepository,
    private readonly participantRepository: SignatureFlowParticipantRepository,
    private readonly flowRepository: SignatureFlowRepository,
    private readonly cryptoService: SignatureCryptoService,
    private readonly emailService: EmailService,
    private readonly signatureCodeNotificationRepository?: SignatureCodeNotificationRepository,
  ) {}

  async execute(token: string, method: 'email' | 'sms' = 'email', phoneNumber?: string): Promise<{ redactedEmail: string; redactedPhone?: string }> {
    const tokenRecord = await this.tokenRepository.findByToken(token);
    if (!tokenRecord || tokenRecord.isExpired || tokenRecord.isUsed) {
      throw new ValidationError('El enlace de acceso no es válido o ha expirado.');
    }

    const participant = await this.participantRepository.findById(tokenRecord.participantId);
    if (!participant || participant.role !== SignatureFlowParticipantRole.SIGNER) {
      throw new ValidationError('Esta acción no está disponible para este participante.');
    }

    const flow = await this.flowRepository.findById(participant.flowId);
    if (!flow || flow.status !== SignatureFlowStatus.IN_SIGNING) {
      throw new ValidationError('El documento no está en etapa de firma actualmente.');
    }

    if (participant.status !== SignatureFlowParticipantStatus.PENDING) {
      throw new ValidationError('Este participante ya completó su firma.');
    }

    const externalEmail = participant.externalEmail;
    if (!externalEmail) throw new ValidationError('No hay correo electrónico asociado al participante.');

    const otpCode = this.cryptoService.generateOtpCode();
    const otpHash = this.cryptoService.hashCode(otpCode, tokenRecord.id);
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    tokenRecord.otpHash = otpHash;
    tokenRecord.otpExpiresAt = otpExpiresAt;
    tokenRecord.otpAttempts = 0;
    tokenRecord.otpMethod = method;
    await this.tokenRepository.update(tokenRecord);

    const [user, domain] = externalEmail.split('@');
    const redactedEmail = `${user.substring(0, 2)}***@${domain}`;

    if (method === 'sms') {
      if (!phoneNumber?.trim()) {
        throw new ValidationError('Debe proporcionar un número de teléfono para recibir el código por SMS.');
      }
      const phone = phoneNumber.trim();
      const smsBody = `Tu código de firma electrónica es: ${otpCode}. Válido por ${OTP_EXPIRY_MINUTES} minutos.`;
      await this.sendSmsCode(phone, smsBody);
      await this.logCodeNotification({
        participantId: participant.id,
        channel: 'sms',
        recipient: phone,
        textContent: smsBody,
        otpCode,
      });
      const redactedPhone = phone.length > 4
        ? phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4)
        : '****';
      return { redactedEmail, redactedPhone };
    }

    const title = 'Código de firma electrónica';
    const message = 'Usa el siguiente código para continuar con el proceso de firma:';
    const warningMessage = `Este código es válido por ${OTP_EXPIRY_MINUTES} minutos y solo puede utilizarse una vez. No lo compartas con nadie.`;
    const html = buildPrimactaNotificationEmail({
      title,
      recipientName: participant.externalName ?? 'Participante',
      message,
      code: otpCode,
      warningMessage,
    });
    const text = `Tu código de firma es: ${otpCode}. Válido por ${OTP_EXPIRY_MINUTES} minutos.`;

    await this.emailService.send({
      to: externalEmail,
      subject: title,
      text,
      html,
    });

    await this.logCodeNotification({
      participantId: participant.id,
      channel: 'email',
      recipient: externalEmail,
      subject: title,
      htmlContent: html,
      textContent: text,
      otpCode,
    });

    return { redactedEmail };
  }

  /**
   * Registra el envío para trazabilidad, censurando el código real antes de guardarlo:
   * el texto plano del código nunca toca la base de datos, solo llega a la bandeja/teléfono
   * del firmante. Si falla, no interrumpe el proceso de firma (no crítico).
   */
  private async logCodeNotification(params: {
    participantId: string;
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
        participantId: params.participantId,
        channel: params.channel,
        recipient: params.recipient,
        subject: params.subject ?? null,
        htmlContent: redactSecret(params.htmlContent ?? null, params.otpCode),
        textContent: redactSecret(params.textContent ?? null, params.otpCode),
        sentAt: new Date(),
      });
    } catch (err) {
      console.warn('[RequestExternalSignerOtpUseCase] No se pudo registrar el log del código enviado (no crítico):', err);
    }
  }

  private async sendSmsCode(phoneNumber: string, body: string): Promise<void> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    const smsProvider = process.env.SMS_PROVIDER?.toLowerCase();

    if (smsProvider !== 'twilio') {
      throw new ValidationError('El proveedor SMS no está configurado. Usa el método por correo electrónico.');
    }

    if (!accountSid || !authToken || !fromNumber) {
      throw new ValidationError('La configuración de SMS no está disponible. Usa el método por correo electrónico.');
    }

    try {
      const twilioModule = await import('twilio');
      const client = twilioModule.default(accountSid, authToken);
      await client.messages.create({
        body,
        from: fromNumber,
        to: phoneNumber,
      });
    } catch {
      throw new ValidationError('No se pudo enviar el SMS. Intenta con el método por correo electrónico.');
    }
  }
}

export class ValidateExternalSignerOtpUseCase {
  constructor(
    private readonly tokenRepository: ExternalParticipantTokenRepository,
    private readonly participantRepository: SignatureFlowParticipantRepository,
    private readonly cryptoService: SignatureCryptoService,
    private readonly processFlowUseCase: ProcessFlowParticipantActionUseCase,
    private readonly colaboratorRepository?: ColaboratorRepository,
    private readonly fileRepository?: TypeOrmFileRepository,
    private readonly userSignatureRepository?: UserSignatureRepository,
  ) {}

  async execute(
    token: string,
    code: string,
    ipAddress: string,
    documentNumber?: string,
    timezone?: string,
    signatureImage?: string,
    saveSignatureForFuture?: boolean,
  ): Promise<void> {
    const tokenRecord = await this.tokenRepository.findByToken(token);
    if (!tokenRecord || tokenRecord.isExpired || tokenRecord.isUsed) {
      throw new ValidationError('El enlace de acceso no es válido o ha expirado.');
    }

    if (!tokenRecord.otpHash || tokenRecord.isOtpExpired) {
      throw new ValidationError('No hay un código activo. Solicita uno nuevo.');
    }

    const participant = await this.participantRepository.findById(tokenRecord.participantId);
    if (!participant || participant.role !== SignatureFlowParticipantRole.SIGNER) {
      throw new ValidationError('Participante no encontrado.');
    }

    const isValid = this.cryptoService.verifyCode(code, tokenRecord.otpHash, tokenRecord.id);

    if (!isValid) {
      tokenRecord.otpAttempts += 1;
      await this.tokenRepository.update(tokenRecord);

      if (tokenRecord.otpAttempts >= OTP_MAX_ATTEMPTS) {
        throw new ValidationError('Has superado el número máximo de intentos. Solicita un nuevo código.');
      }
      const remaining = OTP_MAX_ATTEMPTS - tokenRecord.otpAttempts;
      throw new ValidationError(`Código incorrecto. Te quedan ${remaining} intento(s).`);
    }

    if (!signatureImage) {
      throw new ValidationError('Debes dibujar tu firma para completar el proceso.');
    }
    const signatureImageBuffer = decodeSignatureImage(signatureImage);

    const signedAt = new Date();
    const signatureTokenHash = this.cryptoService.generateTokenHash({
      documentId: participant.flowId,
      userId: participant.externalEmail ?? participant.id,
      signedAt,
      ipAddress,
    });

    const resolvedDocumentNumber = participant.colaboratorId && this.colaboratorRepository
      ? (await this.colaboratorRepository.findById(participant.colaboratorId))?.numeroDocumento ?? null
      : documentNumber ?? null;

    let signatureImageFileId: string | null = null;
    if (this.fileRepository) {
      const savedImage = await this.fileRepository.saveBuffer(signatureImageBuffer, 'signature.png', 'image/png');
      signatureImageFileId = savedImage.id;

      if (saveSignatureForFuture && participant.colaboratorId && this.userSignatureRepository) {
        await this.userSignatureRepository.upsertForColaborator(participant.colaboratorId, savedImage.id);
      }
    }

    tokenRecord.signatureTokenHash = signatureTokenHash;
    tokenRecord.ipAddress = ipAddress;
    tokenRecord.documentNumber = resolvedDocumentNumber;
    tokenRecord.timezone = timezone ?? null;
    tokenRecord.signatureImageFileId = signatureImageFileId;
    tokenRecord.usedAt = signedAt;
    tokenRecord.otpHash = null;
    await this.tokenRepository.update(tokenRecord);

    try {
      await this.processFlowUseCase.markExternalSignerSignedFromToken(participant.id, signedAt);
    } catch (err) {
      // Token is already committed as used — signing intent is recorded.
      // Post-signing side effects (notifications, PDF stamping) are non-critical.
      console.error('[ValidateExternalSignerOtpUseCase] Post-signing flow processing failed (non-critical):', err);
    }
  }
}

/** Busca la firma guardada del colaborador vinculado a un token de acceso externo, si tiene una. */
export class GetExternalSignerSavedSignatureUseCase {
  constructor(
    private readonly tokenRepository: ExternalParticipantTokenRepository,
    private readonly participantRepository: SignatureFlowParticipantRepository,
    private readonly getSavedSignaturePreviewUseCase: GetSavedSignaturePreviewUseCase,
  ) {}

  async execute(token: string): Promise<SavedSignaturePreview> {
    const tokenRecord = await this.tokenRepository.findByToken(token);
    if (!tokenRecord || tokenRecord.isExpired || tokenRecord.isUsed) {
      return { available: false };
    }

    const participant = await this.participantRepository.findById(tokenRecord.participantId);
    if (!participant?.colaboratorId) {
      return { available: false };
    }

    return this.getSavedSignaturePreviewUseCase.execute({ colaboratorId: participant.colaboratorId });
  }
}

export function generateExternalToken(): string {
  return randomBytes(32).toString('hex');
}

export function buildExternalTokenExpiry(): Date {
  return new Date(Date.now() + EXTERNAL_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
}
