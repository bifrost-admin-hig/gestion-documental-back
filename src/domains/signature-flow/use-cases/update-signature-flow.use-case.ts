import { SignatureFlow } from '../entities/signature-flow.entity';
import { SignatureFlowParticipant, SignatureFlowParticipantProps } from '../entities/signature-flow-participant.entity';
import { type SignatureFlowRepository } from '../repositories/signature-flow.repository';
import { type SignatureFlowParticipantRepository } from '../repositories/signature-flow-participant.repository';
import { NotFoundError, ValidationError } from '@shared/domain/errors';
import { SignatureFlowOrderType, SignatureFlowStatus } from '../value-objects/signature-flow-enums';
import { ColaboratorRepository } from '@domains/colaborators/repositories/colaborator.repository';
import { parseEnum } from '@shared/utils/objects';

export interface UpdateSignatureFlowInput {
  id: string;
  orderType?: string;
  signerOrderType?: string;
}

export class UpdateSignatureFlowUseCase {
  constructor(private readonly repository: SignatureFlowRepository) {}

  async execute(input: UpdateSignatureFlowInput): Promise<SignatureFlow> {
    const flow = await this.repository.findById(input.id);
    if (!flow) throw new NotFoundError('Flujo de firma no encontrado');

    if (flow.status !== SignatureFlowStatus.DRAFT) {
      throw new ValidationError('Solo se puede modificar un flujo en estado borrador');
    }

    if (input.orderType) {
      const orderType = parseEnum(input.orderType, SignatureFlowOrderType);
      if (!orderType) throw new ValidationError('orderType inválido');
      flow.orderType = orderType;
    }
    if (input.signerOrderType) {
      const signerOrderType = parseEnum(input.signerOrderType, SignatureFlowOrderType);
      if (!signerOrderType) throw new ValidationError('signerOrderType inválido');
      flow.signerOrderType = signerOrderType;
    }

    return this.repository.update(flow);
  }
}

export interface AddParticipantInput {
  flowId: string;
  userId?: string;
  colaboratorId?: string;
  externalName?: string;
  externalEmail?: string;
  role: string;
  order?: number;
}

export class AddParticipantToFlowUseCase {
  constructor(
    private readonly flowRepository: SignatureFlowRepository,
    private readonly participantRepository: SignatureFlowParticipantRepository,
    private readonly colaboratorRepository: ColaboratorRepository,
  ) {}

  async execute(input: AddParticipantInput): Promise<SignatureFlowParticipant> {
    const flow = await this.flowRepository.findById(input.flowId);
    if (!flow) throw new NotFoundError('Flujo de firma no encontrado');

    if (flow.status !== SignatureFlowStatus.DRAFT) {
      throw new ValidationError('Solo se pueden agregar participantes a un flujo en estado borrador');
    }

    let externalName = input.externalName ?? null;
    let externalEmail = input.externalEmail ?? null;

    if (input.colaboratorId) {
      const colaborator = await this.colaboratorRepository.findById(input.colaboratorId);
      if (!colaborator) throw new ValidationError('El colaborador seleccionado no existe');
      externalName = colaborator.getNombreCompleto();
      externalEmail = colaborator.email;
    }

    const props: SignatureFlowParticipantProps = {
      flowId: input.flowId,
      userId: input.userId ?? null,
      colaboratorId: input.colaboratorId ?? null,
      externalName,
      externalEmail,
      role: input.role,
      order: input.order ?? null,
    };

    return this.participantRepository.save(SignatureFlowParticipant.create(props));
  }
}

export class RemoveParticipantFromFlowUseCase {
  constructor(
    private readonly flowRepository: SignatureFlowRepository,
    private readonly participantRepository: SignatureFlowParticipantRepository,
  ) {}

  async execute(participantId: string): Promise<void> {
    const participant = await this.participantRepository.findById(participantId);
    if (!participant) throw new NotFoundError('Participante no encontrado');

    const flow = await this.flowRepository.findById(participant.flowId);
    if (flow && flow.status !== SignatureFlowStatus.DRAFT) {
      throw new ValidationError('Solo se pueden eliminar participantes de un flujo en estado borrador');
    }

    await this.participantRepository.delete(participantId);
  }
}

export class DeleteSignatureFlowUseCase {
  constructor(
    private readonly flowRepository: SignatureFlowRepository,
    private readonly participantRepository: SignatureFlowParticipantRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const flow = await this.flowRepository.findById(id);
    if (!flow) throw new NotFoundError('Flujo de firma no encontrado');

    if (flow.status !== SignatureFlowStatus.DRAFT) {
      throw new ValidationError('Solo se puede eliminar un flujo en estado borrador');
    }

    await this.participantRepository.deleteByFlowId(id);
    await this.flowRepository.delete(id);
  }
}
