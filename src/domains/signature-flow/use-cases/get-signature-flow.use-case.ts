import { SignatureFlow } from '../entities/signature-flow.entity';
import { SignatureFlowParticipant } from '../entities/signature-flow-participant.entity';
import {
  PendingSignatureDocumentsReportItem,
  SignatureProcessTimeReportItem,
  type SignatureFlowRepository,
} from '../repositories/signature-flow.repository';
import {
  PendingSignatureTaskItem,
  type SignatureFlowParticipantRepository,
} from '../repositories/signature-flow-participant.repository';
import { ForbiddenError, NotFoundError } from '@shared/domain/errors';
import { UserRepository } from '@domains/user/repositories/user.repository';
import { getCurrentlyEnabledParticipants } from '../services/signature-flow-step.util';

export class GetSignatureFlowByIdUseCase {
  constructor(private readonly repository: SignatureFlowRepository) {}

  async execute(id: string): Promise<SignatureFlow> {
    const flow = await this.repository.findById(id);
    if (!flow) throw new NotFoundError('Flujo de firma no encontrado');
    return flow;
  }
}

export class GetSignatureFlowsByDocumentIdUseCase {
  constructor(private readonly repository: SignatureFlowRepository) {}

  async execute(documentId: string): Promise<SignatureFlow[]> {
    return this.repository.findByDocumentId(documentId);
  }
}

export class GetSignatureFlowParticipantsByFlowIdUseCase {
  constructor(private readonly participantRepository: SignatureFlowParticipantRepository) {}

  async execute(flowId: string): Promise<SignatureFlowParticipant[]> {
    return this.participantRepository.findByFlowId(flowId);
  }
}

export class GetSignatureFlowParticipantsByUserIdUseCase {
  constructor(private readonly participantRepository: SignatureFlowParticipantRepository) {}

  async execute(userId: string): Promise<SignatureFlowParticipant[]> {
    return this.participantRepository.findByUserId(userId);
  }
}

export class GetMyPendingSignatureTasksUseCase {
  constructor(private readonly participantRepository: SignatureFlowParticipantRepository) {}

  async execute(userId: string, groupId?: number): Promise<PendingSignatureTaskItem[]> {
    return this.participantRepository.findPendingActionsByUserId(userId, groupId);
  }
}

export class GetPendingSignatureDocumentsReportUseCase {
  constructor(private readonly repository: SignatureFlowRepository) {}

  async execute(groupId?: number): Promise<PendingSignatureDocumentsReportItem[]> {
    return this.repository.findPendingDocumentsReport(groupId);
  }
}

export class GetSignatureProcessTimeReportUseCase {
  constructor(private readonly repository: SignatureFlowRepository) {}

  async execute(groupId?: number): Promise<SignatureProcessTimeReportItem[]> {
    return this.repository.findSigningTimeReport(groupId);
  }
}

export interface ResendableParticipantItem {
  participantId: string;
  name: string;
}

export interface GetResendableParticipantsInput {
  flowId: string;
  actorUserId: string;
  /** true si el usuario tiene el permiso 'signature-flow:resend:any' (puede ver/reenviar aunque no sea quien envió el flujo). */
  actorCanResendAny?: boolean;
}

/** Participantes a los que se les puede reenviar la notificación en este momento (su turno actual, aún pendientes). */
export class GetResendableParticipantsUseCase {
  constructor(
    private readonly flowRepository: SignatureFlowRepository,
    private readonly participantRepository: SignatureFlowParticipantRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(input: GetResendableParticipantsInput): Promise<ResendableParticipantItem[]> {
    const flow = await this.flowRepository.findById(input.flowId);
    if (!flow) throw new NotFoundError('Flujo de firma no encontrado');

    // Misma regla que el reenvío real: solo quien envió el flujo o un administrador puede
    // ver quiénes tienen la acción pendiente (antes se podía consultar sin ser dueño del flujo).
    if (flow.sentBy !== input.actorUserId && !input.actorCanResendAny) {
      throw new ForbiddenError('Solo quien envió el documento a firmar o un administrador puede ver a quién reenviar la notificación');
    }

    const participants = await this.participantRepository.findByFlowId(input.flowId);
    const enabled = getCurrentlyEnabledParticipants(flow, participants);

    const items: ResendableParticipantItem[] = [];
    for (const p of enabled) {
      let name = p.externalName?.trim() || p.externalEmail?.trim() || 'Participante externo';
      if (p.userId) {
        const user = await this.userRepository.findById(p.userId);
        name = user ? `${user.firstName} ${user.lastName}`.trim() : 'Usuario';
      }
      items.push({ participantId: p.id, name });
    }
    return items;
  }
}
