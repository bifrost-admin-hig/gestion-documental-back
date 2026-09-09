import { Repository } from 'typeorm';
import { type SignatureCodeNotificationRepository } from '@domains/signature-flow/repositories/signature-code-notification.repository';
import {
  SignatureCodeNotification,
  type SignatureCodeNotificationProps,
  type SignatureCodeNotificationChannel,
} from '@domains/signature-flow/entities/signature-code-notification.entity';
import { SignatureCodeNotificationEntity } from '../database/entities/signature-code-notification.entity';
import { AppDataSource } from '../database/typeorm.config';

export class TypeOrmSignatureCodeNotificationRepository implements SignatureCodeNotificationRepository {
  private repository: Repository<SignatureCodeNotificationEntity>;

  constructor() {
    this.repository = AppDataSource.getRepository(SignatureCodeNotificationEntity);
  }

  async create(props: SignatureCodeNotificationProps): Promise<SignatureCodeNotification> {
    const notification = SignatureCodeNotification.create(props);
    const entity = this.toEntity(notification);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async findBySignatureId(signatureId: string): Promise<SignatureCodeNotification[]> {
    const entities = await this.repository.find({
      where: { signatureId },
      order: { createdAt: 'ASC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findByParticipantId(participantId: string): Promise<SignatureCodeNotification[]> {
    const entities = await this.repository.find({
      where: { participantId },
      order: { createdAt: 'ASC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  private toDomain(entity: SignatureCodeNotificationEntity): SignatureCodeNotification {
    const props: SignatureCodeNotificationProps = {
      id: entity.id,
      signatureId: entity.signatureId ?? null,
      participantId: entity.participantId ?? null,
      channel: entity.channel as SignatureCodeNotificationChannel,
      recipient: entity.recipient,
      subject: entity.subject ?? null,
      htmlContent: entity.htmlContent ?? null,
      textContent: entity.textContent ?? null,
      sentAt: entity.sentAt,
      createdAt: entity.createdAt,
    };
    return SignatureCodeNotification.create(props);
  }

  private toEntity(notification: SignatureCodeNotification): Partial<SignatureCodeNotificationEntity> {
    return {
      id: notification.id,
      signatureId: notification.signatureId ?? undefined,
      participantId: notification.participantId ?? undefined,
      channel: notification.channel,
      recipient: notification.recipient,
      subject: notification.subject ?? undefined,
      htmlContent: notification.htmlContent ?? undefined,
      textContent: notification.textContent ?? undefined,
      sentAt: notification.sentAt,
      createdAt: notification.createdAt,
    };
  }
}
