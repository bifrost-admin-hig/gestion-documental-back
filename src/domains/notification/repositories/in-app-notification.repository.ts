import { InAppNotification } from '../entities/in-app-notification.entity';

export interface InAppNotificationRepository {
  save(notification: InAppNotification): Promise<InAppNotification>;
  findByUserId(userId: string, onlyUnread?: boolean): Promise<InAppNotification[]>;
  markAsRead(notificationId: string, userId: string): Promise<void>;
  deleteById(notificationId: string, userId: string): Promise<void>;
  deleteByIds(notificationIds: string[], userId: string): Promise<number>;
}
