import { Repository } from 'typeorm';
import { type SignatureFlowParticipantRepository } from '@domains/signature-flow/repositories/signature-flow-participant.repository';
import {
  SignatureFlowParticipant,
  type SignatureFlowParticipantProps,
} from '@domains/signature-flow/entities/signature-flow-participant.entity';
import { PendingSignatureTaskItem } from '@domains/signature-flow/repositories/signature-flow-participant.repository';
import { SignatureFlowOrderType, SignatureFlowParticipantStatus, SignatureFlowStatus } from '@domains/signature-flow/value-objects/signature-flow-enums';
import { SignatureFlowParticipantEntity } from '../database/entities/signature-flow-participant.entity';
import { AppDataSource } from '../database/typeorm.config';

export class TypeOrmSignatureFlowParticipantRepository implements SignatureFlowParticipantRepository {
  private repository: Repository<SignatureFlowParticipantEntity>;

  constructor() {
    this.repository = AppDataSource.getRepository(SignatureFlowParticipantEntity);
  }

  async findById(id: string): Promise<SignatureFlowParticipant | null> {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) return null;
    return this.toDomain(entity);
  }

  async findByFlowId(flowId: string): Promise<SignatureFlowParticipant[]> {
    const entities = await this.repository.find({
      where: { flowId },
      order: { order: 'ASC', createdAt: 'ASC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findByFlowIdAndRole(flowId: string, role: string): Promise<SignatureFlowParticipant[]> {
    const entities = await this.repository.find({
      where: { flowId, role },
      order: { order: 'ASC', createdAt: 'ASC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findByUserId(userId: string): Promise<SignatureFlowParticipant[]> {
    const entities = await this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findPendingActionsByUserId(userId: string, groupId?: number): Promise<PendingSignatureTaskItem[]> {
    const qb = this.repository
      .createQueryBuilder('participant')
      .innerJoin('signature_flows', 'flow', 'flow.id = participant.flow_id')
      .innerJoin('documents', 'document', 'document.id = flow.document_id')
      .leftJoin('document_models', 'document_model', 'document_model.id = document.document_model_id')
      .leftJoin('document_types', 'document_type', 'document_type.id = document_model.document_type_id')
      .leftJoin('document_subtypes', 'document_subtype', 'document_subtype.id = document_model.document_subtype_id')
      .leftJoin('contracts', 'contract', 'contract.id = document.contract_id')
      .leftJoin('users', 'sender', 'sender.id = flow.sent_by')
      .where('participant.user_id = :userId', { userId })
      .andWhere('participant.status = :participantPending', {
        participantPending: SignatureFlowParticipantStatus.PENDING,
      })
      .andWhere('flow.status IN (:...activeFlowStatuses)', {
        activeFlowStatuses: [SignatureFlowStatus.IN_REVIEW, SignatureFlowStatus.IN_SIGNING],
      })
      .andWhere(`
        (
          (flow.status = :flowInReview AND participant.role = 'validator')
          OR (flow.status = :flowInSigning AND participant.role = 'signer')
        )
      `, {
        flowInReview: SignatureFlowStatus.IN_REVIEW,
        flowInSigning: SignatureFlowStatus.IN_SIGNING,
      })
      .andWhere(`
        (
          (participant.role = 'validator' AND (
            flow.order_type != :sequentialOrderType
            OR participant.\`order\` IS NULL
            OR participant.\`order\` = (
              SELECT MIN(p2.\`order\`)
              FROM signature_flow_participants p2
              WHERE p2.flow_id = participant.flow_id
                AND p2.role = participant.role
                AND p2.status = :participantPending
                AND p2.\`order\` IS NOT NULL
            )
          ))
          OR (participant.role = 'signer' AND (
            flow.signer_order_type != :sequentialOrderType
            OR participant.\`order\` IS NULL
            OR participant.\`order\` = (
              SELECT MIN(p2.\`order\`)
              FROM signature_flow_participants p2
              WHERE p2.flow_id = participant.flow_id
                AND p2.role = participant.role
                AND p2.status = :participantPending
                AND p2.\`order\` IS NOT NULL
            )
          ))
        )
      `, {
        sequentialOrderType: SignatureFlowOrderType.SEQUENTIAL,
        participantPending: SignatureFlowParticipantStatus.PENDING,
      })
      .select([
        'participant.id as participantId',
        'participant.flow_id as flowId',
        'participant.role as role',
        'participant.`order` as participantOrder',
        'document.id as documentId',
        'document.name as documentName',
        'document.status as documentStatus',
        'document_type.name as documentTypeName',
        'document_subtype.name as documentSubtypeName',
        'contract.contract_number as contractNumber',
        'flow.sent_at as sentAt',
        `TRIM(CONCAT_WS(' ', sender.first_name, sender.last_name)) as sentByName`,
        'flow.require_signature_drawing as requiresSignatureDrawing',
      ])
      .orderBy('flow.sent_at', 'DESC')
      .addOrderBy('participant.created_at', 'ASC');

    if (groupId) {
      qb.andWhere('document.group_id = :groupId', { groupId });
    }

    const rows = await qb.getRawMany<{
      participantId: string;
      flowId: string;
      role: string;
      participantOrder: number | null;
      documentId: string;
      documentName: string;
      documentStatus: string;
      documentTypeName: string | null;
      documentSubtypeName: string | null;
      contractNumber: string | null;
      sentAt: Date | null;
      sentByName: string | null;
      requiresSignatureDrawing: number | boolean;
    }>();

    return rows.map((row) => ({
      participantId: row.participantId,
      flowId: row.flowId,
      role: row.role,
      order: row.participantOrder,
      documentId: row.documentId,
      documentName: row.documentName,
      documentStatus: row.documentStatus,
      documentTypeName: row.documentTypeName,
      documentSubtypeName: row.documentSubtypeName,
      contractNumber: row.contractNumber,
      sentAt: row.sentAt ? new Date(row.sentAt) : null,
      sentByName: row.sentByName?.trim() || null,
      requiresSignatureDrawing: Boolean(row.requiresSignatureDrawing),
    }));
  }

  async save(participant: SignatureFlowParticipant): Promise<SignatureFlowParticipant> {
    const entity = this.toEntity(participant);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async update(participant: SignatureFlowParticipant): Promise<SignatureFlowParticipant> {
    const entity = this.toEntity(participant);
    await this.repository.update(participant.id, entity);
    const updated = await this.repository.findOneOrFail({ where: { id: participant.id } });
    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async deleteByFlowId(flowId: string): Promise<void> {
    await this.repository.delete({ flowId });
  }

  private toDomain(entity: SignatureFlowParticipantEntity): SignatureFlowParticipant {
    const props: SignatureFlowParticipantProps = {
      id: entity.id,
      flowId: entity.flowId,
      userId: entity.userId ?? null,
      colaboratorId: entity.colaboratorId ?? null,
      externalName: entity.externalName ?? null,
      externalEmail: entity.externalEmail ?? null,
      role: entity.role,
      order: entity.order ?? null,
      status: entity.status,
      actionAt: entity.actionAt ?? null,
      rejectionComment: entity.rejectionComment ?? null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
    return SignatureFlowParticipant.create(props);
  }

  private toEntity(participant: SignatureFlowParticipant): Partial<SignatureFlowParticipantEntity> {
    return {
      id: participant.id,
      flowId: participant.flowId,
      userId: participant.userId ?? undefined,
      colaboratorId: participant.colaboratorId ?? undefined,
      externalName: participant.externalName ?? undefined,
      externalEmail: participant.externalEmail ?? undefined,
      role: participant.role,
      order: participant.order ?? undefined,
      status: participant.status,
      actionAt: participant.actionAt ?? undefined,
      rejectionComment: participant.rejectionComment ?? undefined,
    };
  }
}
