import { SignatureCodeNotification, SignatureCodeNotificationProps } from '../entities/signature-code-notification.entity';

export interface SignatureCodeNotificationRepository {
  create(props: SignatureCodeNotificationProps): Promise<SignatureCodeNotification>;
  findBySignatureId(signatureId: string): Promise<SignatureCodeNotification[]>;
  findByParticipantId(participantId: string): Promise<SignatureCodeNotification[]>;
}
