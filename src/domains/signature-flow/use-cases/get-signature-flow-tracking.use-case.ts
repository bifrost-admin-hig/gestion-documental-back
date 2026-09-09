import { type SignatureFlowRepository } from '../repositories/signature-flow.repository';
import { type SignatureFlowParticipantRepository } from '../repositories/signature-flow-participant.repository';
import { type SignatureFlowNotificationRepository } from '../repositories/signature-flow-notification.repository';
import { type ExternalParticipantTokenRepository } from '../repositories/external-participant-token.repository';
import { type SignatureCodeNotificationRepository } from '../repositories/signature-code-notification.repository';
import { SignatureCodeNotification } from '../entities/signature-code-notification.entity';
import { SignatureFlow } from '../entities/signature-flow.entity';
import { SignatureFlowParticipant } from '../entities/signature-flow-participant.entity';
import { SignatureFlowParticipantRole, SignatureFlowParticipantStatus } from '../value-objects/signature-flow-enums';
import { UserRepository } from '@domains/user/repositories/user.repository';
import { Signature } from '@domains/signature/entities/signature.entity';
import { SignatureRepository } from '@domains/signature/repositories/signature.repository';
import { type SignatureVerificationCodeRepository } from '@domains/signature/repositories/signature-verification-code.repository';
import { EmailQueueService } from '@shared/infrastructure/email/email-queue.service';
import { SignatureFlowNotificationService } from '../services/signature-flow-notification.service';
import { getCurrentlyEnabledParticipants, computeEnabledSince } from '../services/signature-flow-step.util';

export interface SignatureFlowTrackingActionEvidence {
  /** true si la acción quedó verificada con código de un solo uso (solo aplica a firmantes). */
  verifiedByCode: boolean;
  /** Canal por el que se verificó el código (email/sms) — solo se conoce para firmantes internos. */
  method: string | null;
  ipAddress: string | null;
  /** 'internal' = usuario con cuenta autenticado en la plataforma; 'external' = enlace de acceso externo. */
  channel: 'internal' | 'external';
  /** Intentos con código incorrecto antes del que finalmente verificó — null si no aplica (p. ej. validadores). */
  failedAttempts: number | null;
}

export interface SignatureFlowTrackingNotificationEmail {
  to: string;
  subject: string;
  html: string | null;
  text: string | null;
  status: string;
  sentAt: Date | null;
  channel: 'email' | 'sms';
}

export interface SignatureFlowTrackingNotification {
  id: string;
  number: number;
  type: string;
  createdAt: Date;
  triggeredByName: string | null;
  email: SignatureFlowTrackingNotificationEmail | null;
}

export interface SignatureFlowTrackingParticipant {
  participantId: string;
  name: string;
  role: string;
  order: number | null;
  status: string;
  actionAt: Date | null;
  rejectionComment: string | null;
  actionEvidence: SignatureFlowTrackingActionEvidence | null;
  notifications: SignatureFlowTrackingNotification[];
  /** Correos/SMS con el código de verificación usado para firmar, ya censurado. Solo para firmantes que ya firmaron. */
  verificationNotifications: SignatureFlowTrackingNotification[];
  /** Cuándo se enviará el próximo recordatorio automático, si tiene uno agendado (solo participantes pendientes). */
  nextReminderAt: Date | null;
}

export interface SignatureFlowTrackingItem {
  flowId: string;
  orderType: string;
  signerOrderType: string;
  status: string;
  sentAt: Date | null;
  sentBy: string | null;
  sentByName: string | null;
  participants: SignatureFlowTrackingParticipant[];
  /**
   * Cuándo ocurrirá la próxima acción automática si nadie actúa antes, si el cierre automático
   * está habilitado: rechazo del validador actual (en revisión), o salto/cierre del firmante
   * actual (en firma) — la misma cuenta que usa el processor, participante por participante.
   */
  nextAutoActionAt: Date | null;
}

/** Historial completo del proceso de firma de un documento: uno o más flujos, con notificaciones y evidencia por firmante/revisor. */
export class GetSignatureFlowTrackingByDocumentUseCase {
  constructor(
    private readonly flowRepository: SignatureFlowRepository,
    private readonly participantRepository: SignatureFlowParticipantRepository,
    private readonly notificationRepository: SignatureFlowNotificationRepository,
    private readonly signatureRepository: SignatureRepository,
    private readonly externalTokenRepository: ExternalParticipantTokenRepository,
    private readonly userRepository: UserRepository,
    private readonly emailQueueService: EmailQueueService,
    private readonly codeNotificationRepository: SignatureCodeNotificationRepository,
    private readonly signatureVerificationCodeRepository: SignatureVerificationCodeRepository,
  ) {}

  async execute(documentId: string): Promise<SignatureFlowTrackingItem[]> {
    const flows = await this.flowRepository.findByDocumentId(documentId);
    if (flows.length === 0) return [];

    const documentSignatures = await this.signatureRepository.findByDocumentId(documentId);
    const userNameCache = new Map<string, string | null>();

    const items: SignatureFlowTrackingItem[] = [];
    for (const flow of flows) {
      const participants = this.orderParticipants(await this.participantRepository.findByFlowId(flow.id));

      // Notificaciones de todos los participantes del flujo, con el contenido/estado del correo asociado.
      const notificationsByParticipant = await this.loadNotifications(participants);
      const nextReminderByParticipantId = await this.loadNextReminders(participants);

      const sentByName = flow.sentBy ? await this.resolveUserName(flow.sentBy, userNameCache) : null;

      const trackingParticipants: SignatureFlowTrackingParticipant[] = [];
      for (const participant of participants) {
        const name = participant.userId
          ? await this.resolveUserName(participant.userId, userNameCache) ?? 'Usuario'
          : participant.externalName?.trim() || participant.externalEmail?.trim() || 'Participante externo';

        const notifications = notificationsByParticipant.get(participant.id) ?? [];

        trackingParticipants.push({
          participantId: participant.id,
          name,
          role: participant.role,
          order: participant.order,
          status: participant.status,
          actionAt: participant.actionAt,
          rejectionComment: participant.rejectionComment,
          actionEvidence: await this.buildActionEvidence(participant, documentSignatures),
          notifications,
          verificationNotifications: await this.loadVerificationNotifications(participant, documentSignatures),
          nextReminderAt: nextReminderByParticipantId.get(participant.id) ?? null,
        });
      }

      items.push({
        flowId: flow.id,
        orderType: flow.orderType,
        signerOrderType: flow.signerOrderType,
        status: flow.status,
        sentAt: flow.sentAt,
        sentBy: flow.sentBy,
        sentByName,
        participants: trackingParticipants,
        nextAutoActionAt: this.computeNextAutoActionAt(flow, participants),
      });
    }

    return items;
  }

  /** Revisores primero (en su orden), luego firmantes (en su orden) — evita mezclar ambos grupos en la vista. */
  private orderParticipants(participants: SignatureFlowParticipant[]): SignatureFlowParticipant[] {
    const roleWeight = (role: string) => (role === SignatureFlowParticipantRole.VALIDATOR ? 0 : 1);
    return [...participants].sort((a, b) => {
      if (roleWeight(a.role) !== roleWeight(b.role)) return roleWeight(a.role) - roleWeight(b.role);
      if (a.order !== null && b.order !== null && a.order !== b.order) return a.order - b.order;
      if (a.order !== null && b.order === null) return -1;
      if (a.order === null && b.order !== null) return 1;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  private async buildActionEvidence(
    participant: SignatureFlowParticipant,
    documentSignatures: Signature[],
  ): Promise<SignatureFlowTrackingActionEvidence | null> {
    const acted = participant.status === SignatureFlowParticipantStatus.APPROVED
      || participant.status === SignatureFlowParticipantStatus.SIGNED;
    if (!acted) return null;

    const isSigner = participant.role === SignatureFlowParticipantRole.SIGNER;
    const channel: 'internal' | 'external' = participant.userId ? 'internal' : 'external';

    if (!isSigner) {
      // Los revisores/validadores no pasan por verificación con código: solo queda registrada la acción y desde dónde.
      return { verifiedByCode: false, method: null, ipAddress: null, channel, failedAttempts: null };
    }

    if (participant.userId) {
      const signature = documentSignatures.find((s) => s.userId === participant.userId && s.signedAt);
      if (!signature) return { verifiedByCode: false, method: null, ipAddress: null, channel, failedAttempts: null };

      const codes = await this.signatureVerificationCodeRepository.findBySignatureId(signature.id);
      const usedCode = codes.find((c) => c.usedAt !== null);

      return {
        verifiedByCode: true,
        method: signature.signatureMethod,
        ipAddress: signature.ipAddress,
        channel,
        failedAttempts: usedCode?.attempts ?? null,
      };
    }

    const externalToken = await this.externalTokenRepository.findByParticipantId(participant.id);
    if (!externalToken?.usedAt) return { verifiedByCode: false, method: null, ipAddress: null, channel, failedAttempts: null };
    return {
      verifiedByCode: true,
      method: externalToken.otpMethod,
      ipAddress: externalToken.ipAddress,
      channel,
      failedAttempts: externalToken.otpAttempts,
    };
  }

  /**
   * Correos/SMS con el código de verificación que se enviaron para esta firma, con el código
   * ya censurado desde que se guardó (nunca se persiste en texto plano). Solo aplica a
   * firmantes que ya completaron su firma con código — revisores no pasan por este flujo.
   */
  private async loadVerificationNotifications(
    participant: SignatureFlowParticipant,
    documentSignatures: Signature[],
  ): Promise<SignatureFlowTrackingNotification[]> {
    if (participant.role !== SignatureFlowParticipantRole.SIGNER) return [];
    if (participant.status !== SignatureFlowParticipantStatus.SIGNED) return [];

    let entries: SignatureCodeNotification[] = [];
    if (participant.userId) {
      const signature = documentSignatures.find((s) => s.userId === participant.userId && s.signedAt);
      if (!signature) return [];
      entries = await this.codeNotificationRepository.findBySignatureId(signature.id);
    } else {
      entries = await this.codeNotificationRepository.findByParticipantId(participant.id);
    }

    return entries.map((entry, i) => ({
      id: entry.id,
      number: i + 1,
      type: 'verification_code',
      createdAt: entry.createdAt,
      triggeredByName: null,
      email: {
        to: entry.recipient,
        subject: entry.subject ?? '',
        html: entry.htmlContent,
        text: entry.textContent,
        status: 'sent',
        sentAt: entry.sentAt,
        channel: entry.channel,
      },
    }));
  }

  private async loadNotifications(
    participants: SignatureFlowParticipant[],
  ): Promise<Map<string, SignatureFlowTrackingNotification[]>> {
    const result = new Map<string, SignatureFlowTrackingNotification[]>();

    const notificationsByParticipant = await Promise.all(
      participants.map((p) => this.notificationRepository.findByParticipantId(p.id)),
    );

    const allNotifications = notificationsByParticipant.flat();
    const emailJobIds = [...new Set(
      allNotifications.map((n) => n.emailJobId).filter((id): id is string => !!id),
    )];
    const emailJobs = await this.emailQueueService.findByIds(emailJobIds);
    const emailJobById = new Map(emailJobs.map((job) => [job.id, job]));

    const triggeredByIds = [...new Set(
      allNotifications.map((n) => n.triggeredBy).filter((id): id is string => !!id),
    )];
    const triggeredByNameById = new Map<string, string | null>();
    for (const userId of triggeredByIds) {
      triggeredByNameById.set(userId, await this.resolveUserName(userId, triggeredByNameById));
    }

    participants.forEach((participant, index) => {
      const sorted = [...notificationsByParticipant[index]].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      result.set(participant.id, sorted.map((n, i) => {
        const job = n.emailJobId ? emailJobById.get(n.emailJobId) : undefined;
        return {
          id: n.id,
          number: i + 1,
          type: n.type,
          createdAt: n.createdAt,
          triggeredByName: n.triggeredBy ? triggeredByNameById.get(n.triggeredBy) ?? null : null,
          email: job ? {
            to: job.toAddress,
            subject: job.subject,
            html: job.htmlContent ?? null,
            text: job.textContent ?? null,
            status: job.status,
            sentAt: job.sentAt ?? null,
            channel: 'email',
          } : null,
        };
      }));
    });

    return result;
  }

  /**
   * Reusa exactamente el mismo cálculo que SignatureFlowAutoCloseProcessor para decidir cuándo
   * actúa: el participante actualmente habilitado (validador o firmante, según la etapa) más el
   * intervalo configurado. Sin esto el dato mostrado podía quedar desincronizado del mecanismo
   * real (p. ej. en firma secuencial, donde el plazo es por firmante y no uno solo para todo el flujo).
   */
  private computeNextAutoActionAt(flow: SignatureFlow, participants: SignatureFlowParticipant[]): Date | null {
    if (!flow.autoCloseEnabled) return null;

    const currentlyEnabled = getCurrentlyEnabledParticipants(flow, participants);
    if (currentlyEnabled.length === 0) return null;

    const enabledSince = computeEnabledSince(flow, currentlyEnabled[0], participants);
    if (!enabledSince) return null;

    return new Date(enabledSince.getTime() + flow.autoCloseIntervalMinutes * 60 * 1000);
  }

  /** Fecha del próximo recordatorio automático agendado (aún no enviado) por participante pendiente. */
  private async loadNextReminders(participants: SignatureFlowParticipant[]): Promise<Map<string, Date>> {
    const pendingIds = participants
      .filter((p) => p.status === SignatureFlowParticipantStatus.PENDING)
      .map((p) => p.id);
    if (pendingIds.length === 0) return new Map();

    const participantIdByGroupKey = new Map(
      pendingIds.map((id) => [SignatureFlowNotificationService.reminderGroupKey(id), id]),
    );
    const jobs = await this.emailQueueService.findPendingByGroupKeys([...participantIdByGroupKey.keys()]);

    const result = new Map<string, Date>();
    for (const job of jobs) {
      const participantId = job.groupKey ? participantIdByGroupKey.get(job.groupKey) : undefined;
      if (participantId) result.set(participantId, job.nextRetryAt);
    }
    return result;
  }

  private async resolveUserName(userId: string, cache: Map<string, string | null>): Promise<string | null> {
    if (cache.has(userId)) return cache.get(userId) ?? null;
    const user = await this.userRepository.findById(userId);
    const name = user ? `${user.firstName} ${user.lastName}`.trim() : null;
    cache.set(userId, name);
    return name;
  }
}
