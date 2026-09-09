import { Between, FindOptionsWhere, In, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { AppDataSource } from '../database/typeorm.config';
import { EmailJobEntity, EmailJobStatus } from '../database/entities/email-job.entity';

export interface EmailJobFilters {
  status?: EmailJobStatus;
  correlationId?: string;
  groupKey?: string;
  from?: Date;
  to?: Date;
}

export interface EmailJobInput {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
  priority?: number;
  maxRetries?: number;
  scheduledAt?: Date;
  /** Clave de cancelación selectiva (e.g. "reminder:{documentId}:{userId}"). Permite cancelar el job sin conocer su id. */
  groupKey?: string;
}

export class EmailQueueService {
  private get repo(): Repository<EmailJobEntity> {
    return AppDataSource.getRepository(EmailJobEntity);
  }

  async enqueue(input: EmailJobInput): Promise<EmailJobEntity> {
    return this.repo.save(this.repo.create(this.buildJobData(input)));
  }

  async enqueueMany(inputs: EmailJobInput[]): Promise<EmailJobEntity[]> {
    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(EmailJobEntity);
      const jobs = inputs.map((input) => repo.create(this.buildJobData(input)));
      return repo.save(jobs);
    });
  }

  async findByIds(ids: string[]): Promise<EmailJobEntity[]> {
    if (ids.length === 0) return [];
    return this.repo.find({ where: { id: In(ids) } });
  }

  /** Jobs pendientes (aún no enviados) para un conjunto de group keys — usado para saber cuándo se disparará un recordatorio agendado. */
  async findPendingByGroupKeys(groupKeys: string[]): Promise<EmailJobEntity[]> {
    if (groupKeys.length === 0) return [];
    return this.repo.find({ where: { groupKey: In(groupKeys), status: EmailJobStatus.PENDING } });
  }

  async getPendingJobs(limit = 10): Promise<EmailJobEntity[]> {
    return this.repo.find({
      where: {
        status: In([EmailJobStatus.PENDING]),
        nextRetryAt: LessThanOrEqual(new Date()),
      },
      order: { priority: 'DESC', nextRetryAt: 'ASC' },
      take: limit,
    });
  }

  async markAsProcessing(id: string): Promise<void> {
    await this.repo.update(id, { status: EmailJobStatus.PROCESSING });
  }

  async markAsSent(id: string): Promise<void> {
    await this.repo.update(id, { status: EmailJobStatus.SENT, sentAt: new Date() });
  }

  async markAsFailed(id: string, errorMessage: string): Promise<void> {
    const job = await this.repo.findOneBy({ id });
    if (!job) return;

    const newRetries = job.retries + 1;

    if (newRetries >= job.maxRetries) {
      await this.repo.update(id, {
        status: EmailJobStatus.ABANDONED,
        retries: newRetries,
        errorMessage,
      });
      return;
    }

    const backoffMs = Math.pow(2, job.retries) * 5 * 60 * 1000;
    await this.repo.update(id, {
      status: EmailJobStatus.PENDING,
      retries: newRetries,
      errorMessage,
      nextRetryAt: new Date(Date.now() + backoffMs),
    });
  }

  async countUnfinished(correlationId: string): Promise<number> {
    return this.repo.count({
      where: {
        correlationId,
        status: In([EmailJobStatus.PENDING, EmailJobStatus.PROCESSING]),
      },
    });
  }

  /**
   * Como countUnfinished, pero excluye jobs cuya group key tenga el prefijo dado. Se usa para no
   * contar jobs agendados a futuro (p.ej. recordatorios) como "pendientes del batch inicial" —
   * de lo contrario un recordatorio agendado a días de distancia nunca deja completar el batch.
   */
  async countUnfinishedExcludingGroupKeyPrefix(correlationId: string, groupKeyPrefix: string): Promise<number> {
    return this.repo
      .createQueryBuilder('job')
      .where('job.correlation_id = :correlationId', { correlationId })
      .andWhere('job.status IN (:...statuses)', { statuses: [EmailJobStatus.PENDING, EmailJobStatus.PROCESSING] })
      .andWhere('(job.group_key IS NULL OR job.group_key NOT LIKE :prefix)', { prefix: `${groupKeyPrefix}%` })
      .getCount();
  }

  async countAbandoned(correlationId: string): Promise<number> {
    return this.repo.count({
      where: { correlationId, status: EmailJobStatus.ABANDONED },
    });
  }

  async findJobs(
    filters: EmailJobFilters,
    page = 1,
    limit = 20,
  ): Promise<{ jobs: EmailJobEntity[]; total: number }> {
    const where: FindOptionsWhere<EmailJobEntity> = {};
    if (filters.status) where.status = filters.status;
    if (filters.correlationId) where.correlationId = filters.correlationId;
    if (filters.groupKey) where.groupKey = filters.groupKey;
    if (filters.from && filters.to) {
      where.createdAt = Between(filters.from, filters.to);
    } else if (filters.from) {
      where.createdAt = MoreThanOrEqual(filters.from);
    } else if (filters.to) {
      where.createdAt = LessThanOrEqual(filters.to);
    }

    const [jobs, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { jobs, total };
  }

  async getStats(): Promise<Record<EmailJobStatus, number>> {
    const rows = await this.repo
      .createQueryBuilder('job')
      .select('job.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('job.status')
      .getRawMany<{ status: EmailJobStatus; count: string }>();

    const stats = Object.fromEntries(
      Object.values(EmailJobStatus).map((s) => [s, 0]),
    ) as Record<EmailJobStatus, number>;

    rows.forEach((r) => { stats[r.status] = parseInt(r.count, 10); });
    return stats;
  }

  async retryAbandoned(id: string): Promise<EmailJobEntity> {
    const job = await this.repo.findOneBy({ id });
    if (!job) throw new Error(`Email job ${id} not found`);
    if (job.status !== EmailJobStatus.ABANDONED) {
      throw new Error(`Job ${id} is not in abandoned status (current: ${job.status})`);
    }
    await this.repo.update(id, {
      status: EmailJobStatus.PENDING,
      nextRetryAt: new Date(),
    });
    return this.repo.findOneBy({ id }) as Promise<EmailJobEntity>;
  }

  private buildJobData(input: EmailJobInput): Partial<EmailJobEntity> {
    return {
      toAddress: Array.isArray(input.to) ? input.to.join(',') : input.to,
      subject: input.subject,
      htmlContent: input.html,
      textContent: input.text,
      status: EmailJobStatus.PENDING,
      retries: 0,
      maxRetries: input.maxRetries ?? 3,
      priority: input.priority ?? 0,
      correlationId: input.correlationId,
      metadata: input.metadata,
      nextRetryAt: input.scheduledAt ?? new Date(),
      groupKey: input.groupKey,
    };
  }

  async cancelPendingByGroupKey(groupKey: string): Promise<number> {
    const result = await this.repo.update(
      { groupKey, status: EmailJobStatus.PENDING },
      { status: EmailJobStatus.CANCELLED },
    );
    return result.affected ?? 0;
  }
}
