export interface InAppNotificationProps {
  id?: string;
  userId: string;
  title: string;
  message: string;
  entityType: string;
  entityId?: string | null;
  readAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class InAppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  entityType: string;
  entityId: string | null;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(props: InAppNotificationProps) {
    this.id = props.id ?? crypto.randomUUID();
    this.userId = props.userId;
    this.title = props.title;
    this.message = props.message;
    this.entityType = props.entityType;
    this.entityId = props.entityId ?? null;
    this.readAt = props.readAt ?? null;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }
}
