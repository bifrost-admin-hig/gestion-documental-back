import { SignatureFlow } from '../entities/signature-flow.entity';
import { SignatureFlowParticipant } from '../entities/signature-flow-participant.entity';
import {
  SignatureFlowOrderType,
  SignatureFlowParticipantRole,
  SignatureFlowParticipantStatus,
  SignatureFlowStatus,
} from '../value-objects/signature-flow-enums';

/** El tipo de orden (secuencial/paralelo) que aplica a un participante según su rol. */
export function orderTypeForRole(flow: SignatureFlow, role: SignatureFlowParticipantRole): SignatureFlowOrderType {
  return role === SignatureFlowParticipantRole.SIGNER ? flow.signerOrderType : flow.orderType;
}

/**
 * Indica si un participante pendiente puede actuar (o ser notificado) ahora mismo.
 * En orden paralelo, todos los pendientes del mismo rol están habilitados.
 * En orden secuencial, solo el/los de menor `order` entre los pendientes del mismo rol.
 */
export function isParticipantEnabledInCurrentStep(
  orderType: SignatureFlowOrderType,
  participant: SignatureFlowParticipant,
  participantsOfSameFlow: SignatureFlowParticipant[],
): boolean {
  if (orderType !== SignatureFlowOrderType.SEQUENTIAL) return true;
  if (participant.order === null) return true;

  const pendingSameRole = participantsOfSameFlow
    .filter((p) => p.role === participant.role && p.status === SignatureFlowParticipantStatus.PENDING && p.order !== null)
    .map((p) => p.order as number);

  if (pendingSameRole.length === 0) return true;

  return participant.order === Math.min(...pendingSameRole);
}

/**
 * Participantes del rol activo (según el estado del flujo) que están pendientes y
 * habilitados para actuar/ser notificados en este momento.
 */
export function getCurrentlyEnabledParticipants(
  flow: SignatureFlow,
  allParticipants: SignatureFlowParticipant[],
): SignatureFlowParticipant[] {
  const activeRole = flow.status === SignatureFlowStatus.IN_REVIEW
    ? SignatureFlowParticipantRole.VALIDATOR
    : flow.status === SignatureFlowStatus.IN_SIGNING
      ? SignatureFlowParticipantRole.SIGNER
      : null;
  if (!activeRole) return [];

  const orderType = orderTypeForRole(flow, activeRole);
  return allParticipants.filter((p) => (
    p.role === activeRole
    && p.status === SignatureFlowParticipantStatus.PENDING
    && isParticipantEnabledInCurrentStep(orderType, p, allParticipants)
  ));
}

/** Cuándo pasó a etapa de firma este flujo: apenas se aprobó el último validador, o el envío original si no tuvo validadores. */
function computeSigningStageStartedAt(flow: SignatureFlow, allParticipants: SignatureFlowParticipant[]): Date | null {
  const validators = allParticipants.filter((p) => p.role === SignatureFlowParticipantRole.VALIDATOR);
  if (validators.length === 0) return flow.sentAt;

  const approvedTimes = validators
    .filter((p) => p.status === SignatureFlowParticipantStatus.APPROVED && p.actionAt)
    .map((p) => (p.actionAt as Date).getTime());
  if (approvedTimes.length === 0) return null;

  return new Date(Math.max(...approvedTimes));
}

/**
 * Desde cuándo un participante pendiente y habilitado está esperando actuar. En paralelo, es el
 * inicio de la etapa (envío original para validadores, o el momento en que se aprobó el último
 * validador para firmantes). En secuencial, es el momento en que el participante anterior en el
 * orden actuó o fue saltado — el primero de la secuencia usa el mismo inicio de etapa que en
 * paralelo. Se usa para medir el plazo individual del recordatorio automático / avance automático
 * en flujos secuenciales, en vez de contar siempre desde el envío original del flujo.
 */
export function computeEnabledSince(
  flow: SignatureFlow,
  participant: SignatureFlowParticipant,
  allParticipants: SignatureFlowParticipant[],
): Date | null {
  const stageStartedAt = participant.role === SignatureFlowParticipantRole.VALIDATOR
    ? flow.sentAt
    : computeSigningStageStartedAt(flow, allParticipants);

  const orderType = orderTypeForRole(flow, participant.role);
  if (orderType !== SignatureFlowOrderType.SEQUENTIAL || participant.order === null) {
    return stageStartedAt;
  }

  const predecessors = allParticipants.filter((p) => (
    p.role === participant.role && p.order !== null && (p.order as number) < (participant.order as number)
  ));
  if (predecessors.length === 0) return stageStartedAt;

  const predecessorTimes = predecessors
    .filter((p) => p.status !== SignatureFlowParticipantStatus.PENDING && p.actionAt)
    .map((p) => (p.actionAt as Date).getTime());
  if (predecessorTimes.length < predecessors.length) return null; // aún hay un predecesor pendiente

  return new Date(Math.max(...predecessorTimes));
}
