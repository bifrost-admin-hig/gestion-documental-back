import { In, Repository } from 'typeorm';
import {
  PendingSignatureDocumentsReportItem,
  SignatureProcessTimeReportItem,
  type SignatureFlowRepository,
} from '@domains/signature-flow/repositories/signature-flow.repository';
import { SignatureFlow, type SignatureFlowProps } from '@domains/signature-flow/entities/signature-flow.entity';
import { SignatureFlowEntity } from '../database/entities/signature-flow.entity';
import { AppDataSource } from '../database/typeorm.config';
import {
  SignatureFlowOrderType,
  SignatureFlowParticipantStatus,
  SignatureFlowStatus,
} from '@domains/signature-flow/value-objects/signature-flow-enums';

export class TypeOrmSignatureFlowRepository implements SignatureFlowRepository {
  private repository: Repository<SignatureFlowEntity>;

  constructor() {
    this.repository = AppDataSource.getRepository(SignatureFlowEntity);
  }

  async findById(id: string): Promise<SignatureFlow | null> {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) return null;
    return this.toDomain(entity);
  }

  async findByDocumentId(documentId: string): Promise<SignatureFlow[]> {
    const entities = await this.repository.find({
      where: { documentId },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findActiveByDocumentId(documentId: string): Promise<SignatureFlow | null> {
    const entity = await this.repository.findOne({
      where: { documentId },
      order: { createdAt: 'DESC' },
    });
    if (!entity) return null;
    if (entity.status === SignatureFlowStatus.SIGNED || entity.status === SignatureFlowStatus.REJECTED) return null;
    return this.toDomain(entity);
  }

  async findByDocumentIds(documentIds: string[]): Promise<SignatureFlow[]> {
    if (documentIds.length === 0) return [];

    const entities = await this.repository.find({
      where: { documentId: In(documentIds) },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findDueForAutoClose(now: Date): Promise<SignatureFlow[]> {
    // El vencimiento se calcula en SQL (en vez de traer todos los flujos con auto-cierre
    // habilitado y filtrar en memoria) para no barrer flujos que todavía no vencen en cada ciclo.
    // Solo firma en paralelo: en secuencial el plazo se evalúa por participante (ver
    // findSequentialSigningWithAutoCloseEnabled), no con un único vencimiento para todo el flujo.
    const entities = await this.repository
      .createQueryBuilder('flow')
      .where('flow.status = :status', { status: SignatureFlowStatus.IN_SIGNING })
      .andWhere('flow.auto_close_enabled = true')
      .andWhere('flow.signer_order_type = :parallel', { parallel: SignatureFlowOrderType.PARALLEL })
      .andWhere('flow.sent_at IS NOT NULL')
      .andWhere('DATE_ADD(flow.sent_at, INTERVAL flow.auto_close_interval_minutes MINUTE) <= :now', { now })
      .getMany();

    return entities.map((e) => this.toDomain(e));
  }

  async findInReviewWithAutoCloseEnabled(): Promise<SignatureFlow[]> {
    const entities = await this.repository.find({
      where: { status: SignatureFlowStatus.IN_REVIEW, autoCloseEnabled: true },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findSequentialSigningWithAutoCloseEnabled(): Promise<SignatureFlow[]> {
    const entities = await this.repository.find({
      where: {
        status: SignatureFlowStatus.IN_SIGNING,
        autoCloseEnabled: true,
        signerOrderType: SignatureFlowOrderType.SEQUENTIAL,
      },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findInSigningWithExpiredDocuments(now: Date): Promise<SignatureFlow[]> {
    const entities = await this.repository
      .createQueryBuilder('flow')
      .innerJoin('documents', 'document', 'document.id = flow.document_id')
      .where('flow.status = :status', { status: SignatureFlowStatus.IN_SIGNING })
      .andWhere('document.expiration_date IS NOT NULL')
      .andWhere('document.expiration_date < :now', { now })
      .getMany();

    return entities.map((e) => this.toDomain(e));
  }

  async findActiveByDocumentIds(documentIds: string[]): Promise<SignatureFlow[]> {
    if (documentIds.length === 0) return [];

    const entities = await this.repository.find({
      where: {
        documentId: In(documentIds),
        status: In([SignatureFlowStatus.IN_REVIEW, SignatureFlowStatus.IN_SIGNING]),
      },
      order: { createdAt: 'DESC' },
    });

    // Si por algún motivo hubiera más de un flujo activo por documento, nos quedamos con el más reciente.
    const latestByDocumentId = new Map<string, SignatureFlowEntity>();
    for (const entity of entities) {
      if (!latestByDocumentId.has(entity.documentId)) latestByDocumentId.set(entity.documentId, entity);
    }

    return Array.from(latestByDocumentId.values()).map((e) => this.toDomain(e));
  }

  async findPendingDocumentsReport(groupId?: number): Promise<PendingSignatureDocumentsReportItem[]> {
    const qb = this.repository
      .createQueryBuilder('flow')
      .innerJoin('documents', 'document', 'document.id = flow.document_id')
      .leftJoin('document_models', 'document_model', 'document_model.id = document.document_model_id')
      .leftJoin('document_types', 'document_type', 'document_type.id = document_model.document_type_id')
      .leftJoin('document_subtypes', 'document_subtype', 'document_subtype.id = document_model.document_subtype_id')
      .leftJoin('contracts', 'contract', 'contract.id = document.contract_id')
      .leftJoin('users', 'sender', 'sender.id = flow.sent_by')
      .leftJoin('signature_flow_participants', 'participant', 'participant.flow_id = flow.id')
      .leftJoin('users', 'holder_user', 'holder_user.id = participant.user_id')
      .where('flow.status IN (:...pendingStatuses)', {
        pendingStatuses: [SignatureFlowStatus.IN_REVIEW, SignatureFlowStatus.IN_SIGNING],
      })
      .andWhere('participant.status = :participantPending', {
        participantPending: SignatureFlowParticipantStatus.PENDING,
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
        'flow.id as flowId',
        'document.id as documentId',
        'document.name as documentName',
        'document.status as documentStatus',
        'document_type.name as documentTypeName',
        'document_subtype.name as documentSubtypeName',
        'contract.contract_number as contractNumber',
        'flow.sent_at as sentAt',
        'flow.sent_by as sentBy',
        `TRIM(CONCAT_WS(' ', sender.first_name, sender.last_name)) as sentByName`,
        'participant.id as holderParticipantId',
        `TRIM(CONCAT_WS(' ', holder_user.first_name, holder_user.last_name)) as holderUserName`,
        'participant.external_name as holderExternalName',
        'participant.external_email as holderExternalEmail',
      ])
      .orderBy('flow.sent_at', 'DESC');

    if (groupId) {
      qb.andWhere('document.group_id = :groupId', { groupId });
    }

    const rows = await qb.getRawMany<{
      flowId: string;
      documentId: string;
      documentName: string;
      documentStatus: string;
      documentTypeName: string | null;
      documentSubtypeName: string | null;
      contractNumber: string | null;
      sentAt: Date | null;
      sentBy: string | null;
      sentByName: string | null;
      holderParticipantId: string | null;
      holderUserName: string | null;
      holderExternalName: string | null;
      holderExternalEmail: string | null;
    }>();

    const grouped = new Map<string, PendingSignatureDocumentsReportItem>();
    for (const row of rows) {
      const key = `${row.flowId}:${row.documentId}`;
      const holderName = row.holderUserName?.trim()
        || row.holderExternalName?.trim()
        || row.holderExternalEmail?.trim()
        || null;
      const holder = row.holderParticipantId && holderName
        ? { participantId: row.holderParticipantId, name: holderName }
        : null;

      const current = grouped.get(key);
      if (!current) {
        grouped.set(key, {
          flowId: row.flowId,
          documentId: row.documentId,
          documentName: row.documentName,
          documentStatus: row.documentStatus,
          documentTypeName: row.documentTypeName,
          documentSubtypeName: row.documentSubtypeName,
          contractNumber: row.contractNumber,
          sentAt: row.sentAt ? new Date(row.sentAt) : null,
          sentBy: row.sentBy || null,
          sentByName: row.sentByName?.trim() || null,
          currentHolders: holder ? [holder] : [],
        });
        continue;
      }

      if (holder && !current.currentHolders.some((h) => h.participantId === holder.participantId)) {
        current.currentHolders.push(holder);
      }
    }

    return Array.from(grouped.values());
  }

  async findSigningTimeReport(groupId?: number): Promise<SignatureProcessTimeReportItem[]> {
    const qb = this.repository
      .createQueryBuilder('flow')
      .innerJoin('documents', 'document', 'document.id = flow.document_id')
      .leftJoin(
        'signature_flow_participants',
        'signer_participant',
        `signer_participant.flow_id = flow.id
          AND signer_participant.role = 'signer'
          AND signer_participant.status = :signedStatus`,
        { signedStatus: SignatureFlowParticipantStatus.SIGNED },
      )
      .where('flow.status = :flowSigned', { flowSigned: SignatureFlowStatus.SIGNED })
      .andWhere('flow.sent_at IS NOT NULL')
      .select([
        'flow.id as flowId',
        'document.id as documentId',
        'document.name as documentName',
        'flow.sent_at as sentAt',
        'MAX(signer_participant.action_at) as participantSignedAt',
        'flow.updated_at as flowUpdatedAt',
      ])
      .groupBy('flow.id')
      .addGroupBy('document.id')
      .addGroupBy('document.name')
      .addGroupBy('flow.sent_at')
      .addGroupBy('flow.updated_at')
      .orderBy('flow.sent_at', 'DESC');

    if (groupId) {
      qb.andWhere('document.group_id = :groupId', { groupId });
    }

    const rows = await qb.getRawMany<{
      flowId: string;
      documentId: string;
      documentName: string;
      sentAt: Date;
      participantSignedAt: Date | null;
      flowUpdatedAt: Date;
    }>();

    return rows
      .map((row) => {
        const sentAt = new Date(row.sentAt);
        const signedAt = new Date(row.participantSignedAt ?? row.flowUpdatedAt);
        const elapsedMs = signedAt.getTime() - sentAt.getTime();
        const elapsedDays = Math.max(0, Math.ceil(elapsedMs / (1000 * 60 * 60 * 24)));

        return {
          flowId: row.flowId,
          documentId: row.documentId,
          documentName: row.documentName,
          sentAt,
          signedAt,
          elapsedDays,
        };
      })
      .filter((item) => !Number.isNaN(item.sentAt.getTime()) && !Number.isNaN(item.signedAt.getTime()));
  }

  async save(flow: SignatureFlow): Promise<SignatureFlow> {
    const entity = this.toEntity(flow);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async update(flow: SignatureFlow): Promise<SignatureFlow> {
    const entity = this.toEntity(flow);
    await this.repository.update(flow.id, entity);
    const updated = await this.repository.findOneOrFail({ where: { id: flow.id } });
    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  private toDomain(entity: SignatureFlowEntity): SignatureFlow {
    const props: SignatureFlowProps = {
      id: entity.id,
      documentId: entity.documentId,
      orderType: entity.orderType,
      signerOrderType: entity.signerOrderType,
      status: entity.status,
      sentAt: entity.sentAt ?? null,
      sentBy: entity.sentBy ?? null,
      reminderEnabled: entity.reminderEnabled,
      reminderIntervalMinutes: entity.reminderIntervalMinutes,
      autoCloseEnabled: entity.autoCloseEnabled,
      autoCloseIntervalMinutes: entity.autoCloseIntervalMinutes,
      requireSignatureDrawing: entity.requireSignatureDrawing,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
    return SignatureFlow.create(props);
  }

  private toEntity(flow: SignatureFlow): Partial<SignatureFlowEntity> {
    return {
      id: flow.id,
      documentId: flow.documentId,
      orderType: flow.orderType,
      signerOrderType: flow.signerOrderType,
      status: flow.status,
      sentAt: flow.sentAt ?? undefined,
      sentBy: flow.sentBy ?? undefined,
      reminderEnabled: flow.reminderEnabled,
      reminderIntervalMinutes: flow.reminderIntervalMinutes,
      autoCloseEnabled: flow.autoCloseEnabled,
      autoCloseIntervalMinutes: flow.autoCloseIntervalMinutes,
      requireSignatureDrawing: flow.requireSignatureDrawing,
    };
  }
}
