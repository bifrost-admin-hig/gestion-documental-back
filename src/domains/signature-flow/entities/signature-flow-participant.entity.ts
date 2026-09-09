import { EntityUtils } from '@shared/utils/common';
import { ValidationError } from '@shared/domain/errors';
import { parseEnum } from '@shared/utils/objects';
import {
  SignatureFlowParticipantRole,
  SignatureFlowParticipantStatus,
} from '../value-objects/signature-flow-enums';

export interface SignatureFlowParticipantProps {
  id?: string;
  flowId: string;
  userId?: string | null;
  colaboratorId?: string | null;
  externalName?: string | null;
  externalEmail?: string | null;
  role: string;
  order?: number | null;
  status?: string;
  actionAt?: Date | null;
  rejectionComment?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class SignatureFlowParticipant {
  id: string;
  flowId: string;
  userId: string | null;
  colaboratorId: string | null;
  externalName: string | null;
  externalEmail: string | null;
  role: SignatureFlowParticipantRole;
  order: number | null;
  status: SignatureFlowParticipantStatus;
  actionAt: Date | null;
  rejectionComment: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(props: SignatureFlowParticipantProps) {
    SignatureFlowParticipant.validateRequired(props);

    EntityUtils.assign(this as SignatureFlowParticipant, props, {
      id: 'uuid',
      userId: (v?: string | null) => v ?? null,
      colaboratorId: (v?: string | null) => v ?? null,
      externalName: (v?: string | null) => v ?? null,
      externalEmail: (v?: string | null) => v ?? null,
      role: (v: string) => parseEnum(v, SignatureFlowParticipantRole) ?? SignatureFlowParticipantRole.SIGNER,
      order: (v?: number | null) => v ?? null,
      status: (v?: string) => parseEnum(v, SignatureFlowParticipantStatus) ?? SignatureFlowParticipantStatus.PENDING,
      actionAt: 'datetimeNullable',
      rejectionComment: (v?: string | null) => v ?? null,
      createdAt: 'datetime',
      updatedAt: 'datetime',
    });
  }

  public static create(props: SignatureFlowParticipantProps): SignatureFlowParticipant {
    return new SignatureFlowParticipant(props);
  }

  get isExternal(): boolean {
    return this.userId === null;
  }

  private static validateRequired(props: SignatureFlowParticipantProps): void {
    if (!props.flowId || props.flowId.trim().length === 0) {
      throw new ValidationError('El ID del flujo es requerido');
    }
    if (!props.userId && !props.externalEmail && !props.colaboratorId) {
      throw new ValidationError('Se requiere un usuario del sistema, un colaborador o un correo externo');
    }
    const validRoles = Object.values(SignatureFlowParticipantRole) as string[];
    if (!props.role || !validRoles.includes(props.role)) {
      throw new ValidationError(`El rol debe ser uno de: ${validRoles.join(', ')}`);
    }
  }
}
