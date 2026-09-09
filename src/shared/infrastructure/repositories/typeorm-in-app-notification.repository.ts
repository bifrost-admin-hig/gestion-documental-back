import { Repository, IsNull, In } from 'typeorm';
import { AppDataSource } from '../database/typeorm.config';
import { InAppNotificationRepository } from '@domains/notification/repositories/in-app-notification.repository';
import { InAppNotification } from '@domains/notification/entities/in-app-notification.entity';
import { InAppNotificationEntity } from '../database/entities/in-app-notification.entity';

export class TypeOrmInAppNotificationRepository implements InAppNotificationRepository {
  private repository: Repository<InAppNotificationEntity>;

  constructor() {
    this.repository = AppDataSource.getRepository(InAppNotificationEntity);
  }

  async save(notification: InAppNotification): Promise<InAppNotification> {
    const entity = this.toEntity(notification);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async findByUserId(userId: string, onlyUnread: boolean = false): Promise<InAppNotification[]> {
    const entities = await this.repository.find({
      where: {
        userId,
        ...(onlyUnread ? { readAt: IsNull() } : {}),
      },
      order: { createdAt: 'DESC' },
    });

    return entities.map((entity) => this.toDomain(entity));
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.repository.update(
      { id: notificationId, userId },
      { readAt: new Date() },
    );
  }

  async deleteById(notificationId: string, userId: string): Promise<void> {
    await this.repository.delete({ id: notificationId, userId });
  }

  async deleteByIds(notificationIds: string[], userId: string): Promise<number> {
    if (notificationIds.length === 0) return 0;

    const result = await this.repository.delete({
      id: In(notificationIds),
      userId,
    });

    return result.affected ?? 0;
  }

  private toDomain(entity: InAppNotificationEntity): InAppNotification {
    return new InAppNotification({
      id: entity.id,
      userId: entity.userId,
      title: entity.title,
      message: entity.message,
      entityType: entity.entityType,
      entityId: entity.entityId ?? null,
      readAt: entity.readAt ?? null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  private toEntity(notification: InAppNotification): Partial<InAppNotificationEntity> {
    return {
      id: notification.id,
      userId: notification.userId,
      title: notification.title,
      message: notification.message,
      entityType: notification.entityType,
      entityId: notification.entityId ?? undefined,
      readAt: notification.readAt ?? undefined,
    };
  }
}
