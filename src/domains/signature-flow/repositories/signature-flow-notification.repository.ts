import { SignatureFlowNotification, SignatureFlowNotificationProps } from '../entities/signature-flow-notification.entity';

export interface SignatureFlowNotificationRepository {
  create(props: SignatureFlowNotificationProps): Promise<SignatureFlowNotification>;
  createMany(entries: SignatureFlowNotificationProps[]): Promise<SignatureFlowNotification[]>;
  findByParticipantId(participantId: string): Promise<SignatureFlowNotification[]>;
  countByParticipantIds(participantIds: string[]): Promise<Record<string, number>>;
}
