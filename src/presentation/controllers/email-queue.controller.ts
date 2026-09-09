import { Request, Response } from 'express';
import { asyncHandler } from '@shared/middleware/validation';
import { EmailQueueService } from '@shared/infrastructure/email/email-queue.service';
import { EmailJobStatus } from '@shared/infrastructure/database/entities/email-job.entity';

export class EmailQueueController {
  constructor(private readonly emailQueueService: EmailQueueService) {}

  listJobs = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { status, correlationId, from, to, page, limit } = req.query;

    const jobs = await this.emailQueueService.findJobs(
      {
        status: status as EmailJobStatus | undefined,
        correlationId: correlationId as string | undefined,
        from: from ? new Date(from as string) : undefined,
        to: to ? new Date(to as string) : undefined,
      },
      page ? parseInt(page as string, 10) : 1,
      limit ? parseInt(limit as string, 10) : 20,
    );

    res.status(200).json({ success: true, data: jobs });
  });

  getStats = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const stats = await this.emailQueueService.getStats();
    res.status(200).json({ success: true, data: stats });
  });

  retryJob = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const job = await this.emailQueueService.retryAbandoned(id);
    res.status(200).json({ success: true, data: job });
  });

  cancelByGroupKey = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { groupKey } = req.params;
    const cancelled = await this.emailQueueService.cancelPendingByGroupKey(decodeURIComponent(groupKey));
    res.status(200).json({ success: true, data: { cancelled } });
  });
}
