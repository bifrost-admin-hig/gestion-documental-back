import { EntityUtils } from '@shared/utils/common';
import { ValidationError } from '@shared/domain/errors';
import { parseEnum } from '@shared/utils/objects';
import {
  SignatureFlowOrderType,
  SignatureFlowStatus,
} from '../value-objects/signature-flow-enums';

/** 1440 minutos = 1 día. */
export const DEFAULT_REMINDER_INTERVAL_MINUTES = 1440;

/** 43200 minutos = 30 días. */
export const DEFAULT_AUTO_CLOSE_INTERVAL_MINUTES = 43200;

/** Mínimo permitido para el recordatorio automático: 1 día. */
export const MIN_REMINDER_INTERVAL_MINUTES = 1440;

/** Mínimo permitido para el cierre automático: 1 día. */
export const MIN_AUTO_CLOSE_INTERVAL_MINUTES = 1440;

export interface SignatureFlowProps {
  id?: string;
  documentId: string;
  orderType?: string;
  signerOrderType?: string;
  status?: string;
  sentAt?: Date | null;
  sentBy?: string | null;
  reminderEnabled?: boolean;
  reminderIntervalMinutes?: number;
  autoCloseEnabled?: boolean;
  autoCloseIntervalMinutes?: number;
  /** Si es false, los firmantes solo validan con OTP: no dibujan firma ni se estampa el recuadro en el PDF. */
  requireSignatureDrawing?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class SignatureFlow {
  id: string;
  documentId: string;
  orderType: SignatureFlowOrderType;
  signerOrderType: SignatureFlowOrderType;
  status: SignatureFlowStatus;
  sentAt: Date | null;
  sentBy: string | null;
  reminderEnabled: boolean;
  reminderIntervalMinutes: number;
  autoCloseEnabled: boolean;
  autoCloseIntervalMinutes: number;
  requireSignatureDrawing: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(props: SignatureFlowProps) {
    SignatureFlow.validateRequired(props);

    EntityUtils.assign(this as SignatureFlow, props, {
      id: 'uuid',
      orderType: (v?: string) => parseEnum(v, SignatureFlowOrderType) ?? SignatureFlowOrderType.SEQUENTIAL,
      signerOrderType: (v?: string) => parseEnum(v, SignatureFlowOrderType) ?? SignatureFlowOrderType.PARALLEL,
      status: (v?: string) => parseEnum(v, SignatureFlowStatus) ?? SignatureFlowStatus.DRAFT,
      sentAt: 'datetimeNullable',
      sentBy: (v?: string | null) => v ?? null,
      reminderEnabled: (v?: boolean) => v ?? false,
      reminderIntervalMinutes: (v?: number) => v ?? DEFAULT_REMINDER_INTERVAL_MINUTES,
      autoCloseEnabled: (v?: boolean) => v ?? false,
      autoCloseIntervalMinutes: (v?: number) => v ?? DEFAULT_AUTO_CLOSE_INTERVAL_MINUTES,
      requireSignatureDrawing: (v?: boolean) => v ?? true,
      createdAt: 'datetime',
      updatedAt: 'datetime',
    });
  }

  public static create(props: SignatureFlowProps): SignatureFlow {
    return new SignatureFlow(props);
  }

  private static validateRequired(props: SignatureFlowProps): void {
    if (!props.documentId || props.documentId.trim().length === 0) {
      throw new ValidationError('El ID del documento es requerido');
    }
  }
}
