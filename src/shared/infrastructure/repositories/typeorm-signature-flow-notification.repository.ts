import { Repository } from 'typeorm';
import { type SignatureFlowNotificationRepository } from '@domains/signature-flow/repositories/signature-flow-notification.repository';
import {
  SignatureFlowNotification,
  type SignatureFlowNotificationProps,
} from '@domains/signature-flow/entities/signature-flow-notification.entity';
import { SignatureFlowNotificationEntity } from '../database/entities/signature-flow-notification.entity';
import { AppDataSource } from '../database/typeorm.config';

export class TypeOrmSignatureFlowNotificationRepository implements SignatureFlowNotificationRepository {
  private repository: Repository<SignatureFlowNotificationEntity>;

  constructor() {
    this.repository = AppDataSource.getRepository(SignatureFlowNotificationEntity);
  }

  async create(props: SignatureFlowNotificationProps): Promise<SignatureFlowNotification> {
    const entity = this.toEntity(SignatureFlowNotification.create(props));
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async createMany(entries: SignatureFlowNotificationProps[]): Promise<SignatureFlowNotification[]> {
    if (entries.length === 0) return [];
    const entities = entries.map((props) => this.toEntity(SignatureFlowNotification.create(props)));
    const saved = await this.repository.save(entities);
    return saved.map((e) => this.toDomain(e));
  }

  async findByParticipantId(participantId: string): Promise<SignatureFlowNotification[]> {
    const entities = await this.repository.find({
      where: { participantId },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async countByParticipantIds(participantIds: string[]): Promise<Record<string, number>> {
    if (participantIds.length === 0) return {};

    const rows = await this.repository
      .createQueryBuilder('notification')
      .select('notification.participant_id', 'participantId')
      .addSelect('COUNT(*)', 'count')
      .where('notification.participant_id IN (:...participantIds)', { participantIds })
      .groupBy('notification.participant_id')
      .getRawMany<{ participantId: string; count: string }>();

    const counts: Record<string, number> = {};
    for (const id of participantIds) counts[id] = 0;
    for (const row of rows) counts[row.participantId] = parseInt(row.count, 10);
    return counts;
  }

  private toDomain(entity: SignatureFlowNotificationEntity): SignatureFlowNotification {
    return SignatureFlowNotification.create({
      id: entity.id,
      participantId: entity.participantId,
      flowId: entity.flowId,
      emailJobId: entity.emailJobId ?? null,
      type: entity.type,
      triggeredBy: entity.triggeredBy ?? null,
      createdAt: entity.createdAt,
    });
  }

  private toEntity(notification: SignatureFlowNotification): Partial<SignatureFlowNotificationEntity> {
    return {
      id: notification.id,
      participantId: notification.participantId,
      flowId: notification.flowId,
      emailJobId: notification.emailJobId ?? undefined,
      type: notification.type,
      triggeredBy: notification.triggeredBy ?? undefined,
    };
  }
}
