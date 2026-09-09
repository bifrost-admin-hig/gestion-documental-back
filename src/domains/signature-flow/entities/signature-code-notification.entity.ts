import { EntityUtils } from '@shared/utils/common';
import { ValidationError } from '@shared/domain/errors';

export type SignatureCodeNotificationChannel = 'email' | 'sms';

export interface SignatureCodeNotificationProps {
  id?: string;
  /** Firma interna (dominio signature) a la que corresponde este envío de código, si aplica. */
  signatureId?: string | null;
  /** Participante del flujo (interno o externo) al que corresponde este envío de código, si aplica. */
  participantId?: string | null;
  channel: SignatureCodeNotificationChannel;
  recipient: string;
  subject?: string | null;
  /** Contenido ya censurado: el código real nunca se persiste, se reemplaza por asteriscos antes de guardar. */
  htmlContent?: string | null;
  textContent?: string | null;
  sentAt?: Date;
  createdAt?: Date;
}

export class SignatureCodeNotification {
  id: string;
  signatureId: string | null;
  participantId: string | null;
  channel: SignatureCodeNotificationChannel;
  recipient: string;
  subject: string | null;
  htmlContent: string | null;
  textContent: string | null;
  sentAt: Date;
  createdAt: Date;

  constructor(props: SignatureCodeNotificationProps) {
    SignatureCodeNotification.validateRequired(props);

    EntityUtils.assign(this as SignatureCodeNotification, props, {
      id: 'uuid',
      signatureId: (v?: string | null) => v ?? null,
      participantId: (v?: string | null) => v ?? null,
      subject: (v?: string | null) => v ?? null,
      htmlContent: (v?: string | null) => v ?? null,
      textContent: (v?: string | null) => v ?? null,
      sentAt: 'datetime',
      createdAt: 'datetime',
    });
  }

  public static create(props: SignatureCodeNotificationProps): SignatureCodeNotification {
    return new SignatureCodeNotification(props);
  }

  private static validateRequired(props: SignatureCodeNotificationProps): void {
    if (!props.signatureId && !props.participantId) {
      throw new ValidationError('Debe indicarse la firma o el participante asociado a esta notificación');
    }
    if (!props.channel) {
      throw new ValidationError('El canal de la notificación es requerido');
    }
    if (!props.recipient || props.recipient.trim().length === 0) {
      throw new ValidationError('El destinatario de la notificación es requerido');
    }
  }
}
