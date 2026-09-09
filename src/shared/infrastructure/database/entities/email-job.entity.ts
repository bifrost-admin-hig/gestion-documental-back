import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum EmailJobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SENT = 'sent',
  FAILED = 'failed',
  ABANDONED = 'abandoned',
  CANCELLED = 'cancelled',
}

@Entity('email_jobs')
@Index('IDX_email_jobs_status_retry', ['status', 'nextRetryAt'])
@Index('IDX_email_jobs_correlation_id', ['correlationId'])
export class EmailJobEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'to_address', type: 'text' })
  toAddress!: string;

  @Column({ type: 'varchar', length: 500 })
  subject!: string;

  @Column({ name: 'html_content', type: 'text', nullable: true })
  htmlContent?: string;

  @Column({ name: 'text_content', type: 'text', nullable: true })
  textContent?: string;

  @Column({ type: 'varchar', length: 20, default: EmailJobStatus.PENDING })
  status!: string;

  @Column({ type: 'int', default: 0 })
  retries!: number;

  @Column({ name: 'max_retries', type: 'int', default: 3 })
  maxRetries!: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ name: 'next_retry_at', type: 'datetime' })
  nextRetryAt!: Date;

  @Column({ name: 'sent_at', type: 'datetime', nullable: true })
  sentAt?: Date;

  @Column({ type: 'int', default: 0 })
  priority!: number;

  /** Identificador de correlación (e.g. signature_flow_id) para agrupar jobs de un mismo batch */
  @Column({ name: 'correlation_id', type: 'varchar', length: 36, nullable: true })
  correlationId?: string;

  /** Clave de cancelación selectiva (e.g. "reminder:{documentId}:{userId}") para anular jobs pendientes sin conocer su id */
  @Column({ name: 'group_key', type: 'varchar', length: 100, nullable: true })
  groupKey?: string;

  /** Contexto adicional: document_id, email_type, etc. */
  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
