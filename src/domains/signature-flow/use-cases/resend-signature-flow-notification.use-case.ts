import { SignatureFlowRepository } from '../repositories/signature-flow.repository';
import { SignatureFlowParticipantRepository } from '../repositories/signature-flow-participant.repository';
import { DocumentRepository } from '@domains/document/repositories/document.repository';
import { ForbiddenError, NotFoundError, ValidationError } from '@shared/domain/errors';
import { SignatureFlowNotificationService, ReminderConfig } from '../services/signature-flow-notification.service';
import { SignatureFlowNotificationType, SignatureFlowStatus } from '../value-objects/signature-flow-enums';
import { getCurrentlyEnabledParticipants, orderTypeForRole } from '../services/signature-flow-step.util';

export interface ResendSignatureFlowNotificationInput {
  flowId: string;
  participantIds: string[];
  actorUserId: string;
  /** true si el usuario tiene el permiso 'signature-flow:resend:any' (puede reenviar aunque no sea quien envió el flujo). */
  actorCanResendAny?: boolean;
}

export class ResendSignatureFlowNotificationUseCase {
  constructor(
    private readonly flowRepository: SignatureFlowRepository,
    private readonly participantRepository: SignatureFlowParticipantRepository,
    private readonly documentRepository: DocumentRepository,
    private readonly notificationService: SignatureFlowNotificationService,
  ) {}

  async execute(input: ResendSignatureFlowNotificationInput): Promise<void> {
    if (!input.participantIds || input.participantIds.length === 0) {
      throw new ValidationError('Debes seleccionar al menos un participante para reenviar la notificación');
    }

    const flow = await this.flowRepository.findById(input.flowId);
    if (!flow) throw new NotFoundError('Flujo de firma no encontrado');

    if (flow.sentBy !== input.actorUserId && !input.actorCanResendAny) {
      throw new ForbiddenError('Solo quien envió el documento a firmar o un administrador puede reenviar la notificación');
    }

    if (flow.status !== SignatureFlowStatus.IN_REVIEW && flow.status !== SignatureFlowStatus.IN_SIGNING) {
      throw new ValidationError('El flujo no está en una etapa donde se puedan reenviar notificaciones');
    }

    const document = await this.documentRepository.findById(flow.documentId);
    if (!document) throw new NotFoundError('Documento no encontrado');

    const allParticipants = await this.participantRepository.findByFlowId(flow.id);
    const enabledParticipants = getCurrentlyEnabledParticipants(flow, allParticipants);
    const enabledById = new Map(enabledParticipants.map((p) => [p.id, p]));

    const targets = input.participantIds.map((id) => {
      const participant = enabledById.get(id);
      if (!participant) {
        throw new ValidationError(
          'Uno de los participantes seleccionados ya completó su acción o aún no le corresponde actuar',
        );
      }
      return participant;
    });

    const internalTargets = targets.filter((p) => !p.isExternal);
    const externalTargets = targets.filter((p) => p.isExternal && p.externalEmail);
    const reminderConfig: ReminderConfig = { enabled: flow.reminderEnabled, intervalMinutes: flow.reminderIntervalMinutes };

    if (internalTargets.length > 0) {
      const orderType = orderTypeForRole(flow, internalTargets[0].role);
      await this.notificationService.notifyParticipantsForCurrentStep(
        internalTargets,
        document.id,
        document.name,
        orderType,
        SignatureFlowNotificationType.RESEND,
        input.actorUserId,
        reminderConfig,
      );
    }

    for (const participant of externalTargets) {
      await this.notificationService.refreshTokenAndNotifyExternalParticipant(
        participant,
        document.name,
        SignatureFlowNotificationType.RESEND,
        input.actorUserId,
        reminderConfig,
      );
    }
  }
}
