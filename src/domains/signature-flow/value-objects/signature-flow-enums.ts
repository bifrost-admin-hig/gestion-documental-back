export enum SignatureFlowOrderType {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
}

export enum SignatureFlowStatus {
  DRAFT = 'draft',
  IN_REVIEW = 'in_review',
  IN_SIGNING = 'in_signing',
  SIGNED = 'signed',
  REJECTED = 'rejected',
  CLOSED = 'closed',
}

export enum SignatureFlowParticipantRole {
  SIGNER = 'signer',
  VALIDATOR = 'validator',
}

export enum SignatureFlowParticipantStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  SIGNED = 'signed',
  REJECTED = 'rejected',
  SKIPPED = 'skipped',
}

export enum SignatureFlowNotificationType {
  INITIAL = 'initial',
  RESEND = 'resend',
  REMINDER = 'reminder',
}

/**
 * Prefijo de la group key de los jobs de recordatorio automático de un participante
 * (ver SignatureFlowNotificationService.reminderGroupKey). Un recordatorio queda agendado con
 * fecha futura (a veces días), por eso EmailQueueProcessor.checkBatchCompletion debe excluirlo
 * al contar si el batch inicial de notificaciones ya terminó — de lo contrario el documento
 * queda en "pending_notification" hasta que el recordatorio se envía.
 */
export const REMINDER_GROUP_KEY_PREFIX = 'signature-flow-reminder:';
