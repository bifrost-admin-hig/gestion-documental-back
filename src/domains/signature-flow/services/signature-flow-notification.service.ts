import { SignatureFlowParticipant } from '../entities/signature-flow-participant.entity';
import {
  SignatureFlowOrderType,
  SignatureFlowNotificationType,
  SignatureFlowParticipantRole,
  REMINDER_GROUP_KEY_PREFIX,
} from '../value-objects/signature-flow-enums';
import { UserRepository } from '@domains/user/repositories/user.repository';
import { InAppNotificationRepository } from '@domains/notification/repositories/in-app-notification.repository';
import { InAppNotification } from '@domains/notification/entities/in-app-notification.entity';
import { EmailService, EmailOptions } from '@shared/infrastructure/email/email-service.interface';
import { EmailQueueService } from '@shared/infrastructure/email/email-queue.service';
import {
  buildFrontendUrl,
  buildPrimactaNotificationEmail,
} from '@shared/infrastructure/email/templates/primacta-notification-email.template';
import { SignatureFlowNotificationRepository } from '../repositories/signature-flow-notification.repository';
import { ExternalParticipantTokenRepository } from '../repositories/external-participant-token.repository';
import { ExternalParticipantToken } from '../entities/external-participant-token.entity';
import { generateExternalToken, buildExternalTokenExpiry } from '../use-cases/external-participant-access.use-case';

export interface NotificationLogContext {
  participantId: string;
  flowId: string;
  type?: SignatureFlowNotificationType;
  triggeredBy?: string | null;
}

export interface NotificationLogEntry extends NotificationLogContext {
  emailJobId?: string | null;
}

export interface EmailWithParticipant {
  participantId: string;
  flowId: string;
  options: EmailOptions;
}

export interface ReminderConfig {
  enabled: boolean;
  intervalMinutes: number;
}

export class SignatureFlowNotificationService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly inAppNotificationRepository: InAppNotificationRepository,
    private readonly emailService: EmailService,
    private readonly emailQueueService?: EmailQueueService,
    private readonly notificationLogRepository?: SignatureFlowNotificationRepository,
    private readonly externalTokenRepository?: ExternalParticipantTokenRepository,
  ) {}

  pickParticipantsToNotify(
    orderType: SignatureFlowOrderType,
    participants: SignatureFlowParticipant[],
  ): SignatureFlowParticipant[] {
    if (orderType !== SignatureFlowOrderType.SEQUENTIAL) return participants;

    const ordered = participants.filter((p) => p.order !== null);
    if (ordered.length === 0) return participants;

    const firstOrder = Math.min(...ordered.map((p) => p.order as number));
    const firstBatch = participants.filter((p) => p.order === firstOrder);
    return firstBatch.length > 0 ? firstBatch : participants;
  }

  /**
   * Notifica participantes internos (con cuenta) durante el progreso del flujo,
   * o cuando el responsable reenvía manualmente. Envía in-app + email (directo o
   * encolado según configuración) y deja registro en el log de notificaciones.
   */
  async notifyParticipantsForCurrentStep(
    participants: SignatureFlowParticipant[],
    documentId: string,
    documentName: string,
    orderType: SignatureFlowOrderType,
    type: SignatureFlowNotificationType = SignatureFlowNotificationType.INITIAL,
    triggeredBy: string | null = null,
    reminderConfig?: ReminderConfig,
  ): Promise<void> {
    const toNotify = this.pickParticipantsToNotify(orderType, participants);

    for (const participant of toNotify) {
      if (!participant.userId) continue;

      const isValidator = participant.role === SignatureFlowParticipantRole.VALIDATOR;
      const title = isValidator ? 'Documento pendiente de revision' : 'Documento pendiente de firma';
      const message = isValidator
        ? `Tienes un documento pendiente de revisar: ${documentName}`
        : `Tienes un documento pendiente de firmar: ${documentName}`;

      await this.inAppNotificationRepository.save(new InAppNotification({
        userId: participant.userId,
        title,
        message,
        entityType: 'document',
        entityId: documentId,
      }));

      const user = await this.userRepository.findById(participant.userId);
      if (!user?.email) continue;

      const actionUrl = buildFrontendUrl(`/signature-flows?documentId=${encodeURIComponent(documentId)}`);
      const actionLabel = isValidator ? 'Revisar' : 'Firmar';
      const html = buildPrimactaNotificationEmail({
        title,
        recipientName: user.firstName,
        message,
        actionLabel,
        actionUrl,
      });

      const options: EmailOptions = {
        to: user.email.toString(),
        subject: title,
        text: actionUrl ? `${message}\n\n${actionLabel}: ${actionUrl}` : message,
        html,
      };

      await this.sendOrEnqueue(options, {
        participantId: participant.id,
        flowId: participant.flowId,
        type,
        triggeredBy,
      });

      if (reminderConfig?.enabled) {
        await this.scheduleReminderInternal(participant, documentId, documentName, reminderConfig.intervalMinutes);
      }
    }
  }

  /**
   * Crea notificaciones in-app para participantes internos y retorna los datos de email
   * (junto al participante al que corresponde cada uno) sin enviarlos. Usado por
   * create-signature-flow para encolar el batch inicial.
   *
   * No agenda recordatorios aquí: eso debe hacerse recién después de que el correo inicial
   * ya quedó encolado (con scheduleRemindersForParticipants), para que el recordatorio no quede
   * registrado con una fecha anterior a la notificación inicial ni compita con su envío si este
   * se demora o falla.
   */
  async collectEmailsForParticipants(
    participants: SignatureFlowParticipant[],
    documentId: string,
    documentName: string,
    orderType: SignatureFlowOrderType,
  ): Promise<EmailWithParticipant[]> {
    const toNotify = this.pickParticipantsToNotify(orderType, participants);
    const emails: EmailWithParticipant[] = [];

    for (const participant of toNotify) {
      if (!participant.userId) continue;

      const isValidator = participant.role === SignatureFlowParticipantRole.VALIDATOR;
      const title = isValidator ? 'Documento pendiente de revision' : 'Documento pendiente de firma';
      const message = isValidator
        ? `Tienes un documento pendiente de revisar: ${documentName}`
        : `Tienes un documento pendiente de firmar: ${documentName}`;

      await this.inAppNotificationRepository.save(new InAppNotification({
        userId: participant.userId,
        title,
        message,
        entityType: 'document',
        entityId: documentId,
      }));

      const user = await this.userRepository.findById(participant.userId);
      if (!user?.email) continue;

      const actionUrl = buildFrontendUrl(`/signature-flows?documentId=${encodeURIComponent(documentId)}`);
      const actionLabel = isValidator ? 'Revisar' : 'Firmar';
      const html = buildPrimactaNotificationEmail({
        title,
        recipientName: user.firstName,
        message,
        actionLabel,
        actionUrl,
      });

      emails.push({
        participantId: participant.id,
        flowId: participant.flowId,
        options: {
          to: user.email.toString(),
          subject: title,
          text: actionUrl ? `${message}\n\n${actionLabel}: ${actionUrl}` : message,
          html,
        },
      });
    }

    return emails;
  }

  /**
   * Agenda los recordatorios de los participantes internos del paso actual. Debe llamarse
   * después de encolar/enviar el correo inicial (nunca antes), para no invertir el orden de
   * las notificaciones ni competir con el envío inicial si este se demora o falla.
   */
  async scheduleRemindersForParticipants(
    participants: SignatureFlowParticipant[],
    documentId: string,
    documentName: string,
    orderType: SignatureFlowOrderType,
    reminderConfig?: ReminderConfig,
  ): Promise<void> {
    if (!reminderConfig?.enabled) return;
    const toNotify = this.pickParticipantsToNotify(orderType, participants);
    for (const participant of toNotify) {
      if (!participant.userId) continue;
      await this.scheduleReminderInternal(participant, documentId, documentName, reminderConfig.intervalMinutes);
    }
  }

  /**
   * Construye los datos de email para un participante externo sin enviarlos.
   * Usado por create-signature-flow para encolar el batch inicial.
   */
  buildExternalParticipantEmailOptions(
    externalEmail: string,
    externalName: string | null,
    role: string,
    documentName: string,
    accessUrl: string,
  ): EmailOptions {
    const isValidator = role === 'validator';
    const title = isValidator ? 'Documento pendiente de revisión' : 'Documento pendiente de firma';
    const action = isValidator ? 'revisar y aprobar' : 'firmar';
    const actionLabel = isValidator ? 'Revisar' : 'Firmar';
    const message = `Has sido invitado a ${action} el documento: ${documentName}. El enlace es válido por tiempo limitado.`;

    const html = buildPrimactaNotificationEmail({
      title,
      recipientName: externalName ?? 'Participante',
      message,
      actionLabel,
      actionUrl: accessUrl,
    });

    return {
      to: externalEmail,
      subject: title,
      text: `${message}\n\n${actionLabel}: ${accessUrl}`,
      html,
    };
  }

  async notifyResponsibleOnCompletion(
    documentId: string,
    documentName: string,
    responsibleUserId: string | null,
  ): Promise<void> {
    if (!responsibleUserId) return;

    const title = 'Documento firmado';
    const message = `El documento ${documentName} completó el proceso de firma exitosamente.`;

    await this.inAppNotificationRepository.save(new InAppNotification({
      userId: responsibleUserId,
      title,
      message,
      entityType: 'document',
      entityId: documentId,
    }));

    const responsibleUser = await this.userRepository.findById(responsibleUserId);
    if (!responsibleUser?.email) return;

    const actionUrl = buildFrontendUrl(`/documents`);
    const html = buildPrimactaNotificationEmail({
      title,
      recipientName: responsibleUser.firstName,
      message,
      actionLabel: 'Ver documentos',
      actionUrl,
    });

    await this.sendOrEnqueue({
      to: responsibleUser.email.toString(),
      subject: title,
      text: actionUrl ? `${message}\n\nVer documentos: ${actionUrl}` : message,
      html,
    });
  }

  /**
   * Notifica (o renotifica) a un participante externo, dejando registro en el log
   * de notificaciones cuando se provee `logContext`.
   */
  async notifyExternalParticipant(
    externalEmail: string,
    externalName: string | null,
    role: string,
    documentName: string,
    accessUrl: string,
    logContext?: NotificationLogContext,
  ): Promise<void> {
    const options = this.buildExternalParticipantEmailOptions(externalEmail, externalName, role, documentName, accessUrl);
    await this.sendOrEnqueue(options, logContext);
  }

  /**
   * Genera un token de acceso nuevo para un participante externo y le envía la
   * notificación correspondiente. Centraliza lo que antes estaba duplicado en
   * create-signature-flow y progress-signature-flow (creación inicial, avance
   * secuencial, y ahora también el reenvío manual).
   */
  async refreshTokenAndNotifyExternalParticipant(
    participant: SignatureFlowParticipant,
    documentName: string,
    type: SignatureFlowNotificationType = SignatureFlowNotificationType.INITIAL,
    triggeredBy: string | null = null,
    reminderConfig?: ReminderConfig,
  ): Promise<void> {
    if (!this.externalTokenRepository) return;
    const email = participant.externalEmail;
    if (!email) return;

    await this.externalTokenRepository.deleteByParticipantId(participant.id);
    const token = ExternalParticipantToken.create({
      participantId: participant.id,
      token: generateExternalToken(),
      expiresAt: buildExternalTokenExpiry(),
    });
    const saved = await this.externalTokenRepository.save(token);
    const accessUrl = buildFrontendUrl(`/external-signature/${saved.token}`);
    if (!accessUrl) return;

    await this.notifyExternalParticipant(
      email,
      participant.externalName,
      participant.role,
      documentName,
      accessUrl,
      { participantId: participant.id, flowId: participant.flowId, type, triggeredBy },
    );

    if (reminderConfig?.enabled) {
      await this.scheduleReminderExternal(participant, documentName, accessUrl, reminderConfig.intervalMinutes);
    }
  }

  /** Avisa a un firmante que su turno fue saltado o que el proceso se cerró sin que llegara a firmar. */
  async notifyParticipantSkipped(
    participant: SignatureFlowParticipant,
    documentId: string,
    documentName: string,
    comment: string,
    closed: boolean,
  ): Promise<void> {
    const title = closed ? 'Proceso de firma cerrado' : 'Tu turno para firmar fue saltado';
    const message = closed
      ? `El proceso de firma del documento ${documentName} fue cerrado por el responsable sin que llegaras a firmar. Motivo: ${comment}`
      : `Tu turno para firmar el documento ${documentName} fue saltado por el responsable. Motivo: ${comment}`;

    if (participant.userId) {
      await this.inAppNotificationRepository.save(new InAppNotification({
        userId: participant.userId,
        title,
        message,
        entityType: 'document',
        entityId: documentId,
      }));

      const user = await this.userRepository.findById(participant.userId);
      if (!user?.email) return;

      const html = buildPrimactaNotificationEmail({ title, recipientName: user.firstName, message });
      await this.sendOrEnqueue({ to: user.email.toString(), subject: title, text: message, html });
      return;
    }

    if (!participant.externalEmail) return;
    const html = buildPrimactaNotificationEmail({
      title,
      recipientName: participant.externalName ?? 'Participante',
      message,
    });
    await this.sendOrEnqueue({ to: participant.externalEmail, subject: title, text: message, html });
  }

  /** Avisa a un validador que su rechazo se registró automáticamente porque no actuó dentro del plazo del cierre automático. */
  async notifyValidatorAutoRejected(
    participant: SignatureFlowParticipant,
    documentId: string,
    documentName: string,
    comment: string,
  ): Promise<void> {
    const title = 'Documento rechazado automáticamente';
    const message = `No completaste a tiempo la revisión del documento ${documentName}, por lo que se registró como rechazado. Motivo: ${comment}`;

    if (participant.userId) {
      await this.inAppNotificationRepository.save(new InAppNotification({
        userId: participant.userId,
        title,
        message,
        entityType: 'document',
        entityId: documentId,
      }));

      const user = await this.userRepository.findById(participant.userId);
      if (!user?.email) return;

      const html = buildPrimactaNotificationEmail({ title, recipientName: user.firstName, message });
      await this.sendOrEnqueue({ to: user.email.toString(), subject: title, text: message, html });
      return;
    }

    if (!participant.externalEmail) return;
    const html = buildPrimactaNotificationEmail({
      title,
      recipientName: participant.externalName ?? 'Participante',
      message,
    });
    await this.sendOrEnqueue({ to: participant.externalEmail, subject: title, text: message, html });
  }

  async notifyResponsibleOnClose(
    documentId: string,
    documentName: string,
    responsibleUserId: string | null,
    comment: string,
  ): Promise<void> {
    if (!responsibleUserId) return;

    const title = 'Proceso de firma cerrado sin completarse';
    const message = `Cerraste el proceso de firma del documento ${documentName} antes de que se completara. Motivo: ${comment}`;

    await this.inAppNotificationRepository.save(new InAppNotification({
      userId: responsibleUserId,
      title,
      message,
      entityType: 'document',
      entityId: documentId,
    }));

    const responsibleUser = await this.userRepository.findById(responsibleUserId);
    if (!responsibleUser?.email) return;

    const actionUrl = buildFrontendUrl(`/documents/${documentId}/signature-history`);
    const html = buildPrimactaNotificationEmail({
      title,
      recipientName: responsibleUser.firstName,
      message,
      actionLabel: 'Ver seguimiento de firma',
      actionUrl,
    });

    await this.sendOrEnqueue({
      to: responsibleUser.email.toString(),
      subject: title,
      text: actionUrl ? `${message}\n\nVer seguimiento: ${actionUrl}` : message,
      html,
    });
  }

  async notifyResponsibleOnReopen(
    documentId: string,
    documentName: string,
    responsibleUserId: string | null,
    comment: string,
  ): Promise<void> {
    if (!responsibleUserId) return;

    const title = 'Proceso de firma reabierto';
    const message = `Un administrador reabrió el proceso de firma del documento ${documentName} para continuar con los firmantes restantes. Motivo: ${comment}`;

    await this.inAppNotificationRepository.save(new InAppNotification({
      userId: responsibleUserId,
      title,
      message,
      entityType: 'document',
      entityId: documentId,
    }));

    const responsibleUser = await this.userRepository.findById(responsibleUserId);
    if (!responsibleUser?.email) return;

    const actionUrl = buildFrontendUrl(`/documents/${documentId}/signature-history`);
    const html = buildPrimactaNotificationEmail({
      title,
      recipientName: responsibleUser.firstName,
      message,
      actionLabel: 'Ver seguimiento de firma',
      actionUrl,
    });

    await this.sendOrEnqueue({
      to: responsibleUser.email.toString(),
      subject: title,
      text: actionUrl ? `${message}\n\nVer seguimiento: ${actionUrl}` : message,
      html,
    });
  }

  async notifyResponsibleOnRejection(
    documentId: string,
    documentName: string,
    responsibleUserId: string | null,
    rejectionReason: string,
  ): Promise<void> {
    if (!responsibleUserId) return;

    const title = 'Documento rechazado';
    const message = `El documento ${documentName} fue rechazado. Motivo: ${rejectionReason}`;

    await this.inAppNotificationRepository.save(new InAppNotification({
      userId: responsibleUserId,
      title,
      message,
      entityType: 'document',
      entityId: documentId,
    }));

    const responsibleUser = await this.userRepository.findById(responsibleUserId);
    if (!responsibleUser?.email) return;

    const actionUrl = buildFrontendUrl(`/documents/${documentId}/history`);
    const html = buildPrimactaNotificationEmail({
      title,
      recipientName: responsibleUser.firstName,
      message,
      actionLabel: 'Ver historial del documento',
      actionUrl,
    });

    await this.sendOrEnqueue({
      to: responsibleUser.email.toString(),
      subject: title,
      text: actionUrl ? `${message}\n\nVer historial: ${actionUrl}` : message,
      html,
    });
  }

  /** Registra en lote notificaciones ya enviadas (usado por el batch inicial encolado). */
  async logNotifications(entries: NotificationLogEntry[]): Promise<void> {
    if (!this.notificationLogRepository || entries.length === 0) return;
    await this.notificationLogRepository.createMany(entries.map((e) => ({
      participantId: e.participantId,
      flowId: e.flowId,
      emailJobId: e.emailJobId ?? null,
      type: e.type ?? SignatureFlowNotificationType.INITIAL,
      triggeredBy: e.triggeredBy ?? null,
    })));
  }

  /** Clave de agrupación del job de recordatorio de un participante — pública para que quien
   * necesite consultar (no solo cancelar) el recordatorio pendiente de un participante (p.ej.
   * el seguimiento de firma, para mostrar cuándo se enviará) use la misma clave. */
  static reminderGroupKey(participantId: string): string {
    return `${REMINDER_GROUP_KEY_PREFIX}${participantId}`;
  }

  /** Cancela el recordatorio automático pendiente de un participante, si tenía uno agendado. */
  async cancelReminder(participantId: string): Promise<void> {
    if (!this.emailQueueService) return;
    await this.emailQueueService.cancelPendingByGroupKey(SignatureFlowNotificationService.reminderGroupKey(participantId));
  }

  /**
   * Agenda (reemplazando cualquier recordatorio previo del mismo participante) un correo de
   * recordatorio para más adelante, usando la misma cola de correos — el envío real ocurre
   * cuando el EmailQueueProcessor levante el job, no ahora. Si el participante ya actuó antes
   * de esa fecha, el job se cancela vía cancelReminder (no llega a enviarse).
   */
  private async scheduleReminderInternal(
    participant: SignatureFlowParticipant,
    documentId: string,
    documentName: string,
    intervalMinutes: number,
  ): Promise<void> {
    if (!this.emailQueueService || !participant.userId) return;
    await this.cancelReminder(participant.id);

    const user = await this.userRepository.findById(participant.userId);
    if (!user?.email) return;

    const isValidator = participant.role === SignatureFlowParticipantRole.VALIDATOR;
    const title = isValidator ? 'Recordatorio: documento pendiente de revisión' : 'Recordatorio: documento pendiente de firma';
    const message = isValidator
      ? `Todavía no has revisado el documento: ${documentName}. Este es un recordatorio automático.`
      : `Todavía no has firmado el documento: ${documentName}. Este es un recordatorio automático.`;
    const actionUrl = buildFrontendUrl(`/signature-flows?documentId=${encodeURIComponent(documentId)}`);
    const actionLabel = isValidator ? 'Revisar' : 'Firmar';
    const html = buildPrimactaNotificationEmail({
      title,
      recipientName: user.firstName,
      message,
      actionLabel,
      actionUrl,
    });

    const job = await this.emailQueueService.enqueue({
      to: user.email.toString(),
      subject: title,
      text: actionUrl ? `${message}\n\n${actionLabel}: ${actionUrl}` : message,
      html,
      scheduledAt: new Date(Date.now() + intervalMinutes * 60 * 1000),
      groupKey: SignatureFlowNotificationService.reminderGroupKey(participant.id),
      correlationId: participant.flowId,
    });

    if (this.notificationLogRepository) {
      await this.notificationLogRepository.create({
        participantId: participant.id,
        flowId: participant.flowId,
        emailJobId: job.id,
        type: SignatureFlowNotificationType.REMINDER,
        triggeredBy: null,
      });
    }
  }

  /**
   * Igual que scheduleReminderInternal pero para un participante externo — reutiliza el mismo
   * enlace de acceso (accessUrl) que ya se le acaba de enviar, en vez de generar uno nuevo,
   * para no invalidar tokens en uso.
   */
  async scheduleReminderExternal(
    participant: SignatureFlowParticipant,
    documentName: string,
    accessUrl: string,
    intervalMinutes: number,
  ): Promise<void> {
    if (!this.emailQueueService || !participant.externalEmail) return;
    await this.cancelReminder(participant.id);

    const isValidator = participant.role === SignatureFlowParticipantRole.VALIDATOR;
    const title = isValidator ? 'Recordatorio: documento pendiente de revisión' : 'Recordatorio: documento pendiente de firma';
    const action = isValidator ? 'revisar y aprobar' : 'firmar';
    const actionLabel = isValidator ? 'Revisar' : 'Firmar';
    const message = `Todavía no has completado la acción de ${action} el documento: ${documentName}. Este es un recordatorio automático.`;
    const html = buildPrimactaNotificationEmail({
      title,
      recipientName: participant.externalName ?? 'Participante',
      message,
      actionLabel,
      actionUrl: accessUrl,
    });

    const job = await this.emailQueueService.enqueue({
      to: participant.externalEmail,
      subject: title,
      text: `${message}\n\n${actionLabel}: ${accessUrl}`,
      html,
      scheduledAt: new Date(Date.now() + intervalMinutes * 60 * 1000),
      groupKey: SignatureFlowNotificationService.reminderGroupKey(participant.id),
      correlationId: participant.flowId,
    });

    if (this.notificationLogRepository) {
      await this.notificationLogRepository.create({
        participantId: participant.id,
        flowId: participant.flowId,
        emailJobId: job.id,
        type: SignatureFlowNotificationType.REMINDER,
        triggeredBy: null,
      });
    }
  }

  private async sendOrEnqueue(options: EmailOptions, logContext?: NotificationLogContext): Promise<void> {
    let emailJobId: string | null = null;

    if (this.emailQueueService) {
      const job = await this.emailQueueService.enqueue({
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      emailJobId = job.id;
    } else {
      await this.emailService.send(options);
    }

    if (logContext && this.notificationLogRepository) {
      await this.notificationLogRepository.create({
        participantId: logContext.participantId,
        flowId: logContext.flowId,
        emailJobId,
        type: logContext.type ?? SignatureFlowNotificationType.INITIAL,
        triggeredBy: logContext.triggeredBy ?? null,
      });
    }
  }
}
