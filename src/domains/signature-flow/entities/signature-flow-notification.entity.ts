import { EntityUtils } from '@shared/utils/common';
import { ValidationError } from '@shared/domain/errors';
import { parseEnum } from '@shared/utils/objects';
import { SignatureFlowNotificationType } from '../value-objects/signature-flow-enums';

export interface SignatureFlowNotificationProps {
  id?: string;
  participantId: string;
  flowId: string;
  emailJobId?: string | null;
  type?: string;
  triggeredBy?: string | null;
  createdAt?: Date;
}

export class SignatureFlowNotification {
  id: string;
  participantId: string;
  flowId: string;
  emailJobId: string | null;
  type: SignatureFlowNotificationType;
  triggeredBy: string | null;
  createdAt: Date;

  constructor(props: SignatureFlowNotificationProps) {
    SignatureFlowNotification.validateRequired(props);

    EntityUtils.assign(this as SignatureFlowNotification, props, {
      id: 'uuid',
      emailJobId: (v?: string | null) => v ?? null,
      type: (v?: string) => parseEnum(v, SignatureFlowNotificationType) ?? SignatureFlowNotificationType.INITIAL,
      triggeredBy: (v?: string | null) => v ?? null,
      createdAt: 'datetime',
    });
  }

  public static create(props: SignatureFlowNotificationProps): SignatureFlowNotification {
    return new SignatureFlowNotification(props);
  }

  private static validateRequired(props: SignatureFlowNotificationProps): void {
    if (!props.participantId || props.participantId.trim().length === 0) {
      throw new ValidationError('El ID del participante es requerido');
    }
    if (!props.flowId || props.flowId.trim().length === 0) {
      throw new ValidationError('El ID del flujo es requerido');
    }
  }
}
