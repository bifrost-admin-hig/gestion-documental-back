import { EmailQueueService } from './email-queue.service';
import { EmailService } from './email-service.interface';
import { SignatureFlowRepository } from '@domains/signature-flow/repositories/signature-flow.repository';
import { SignatureFlowStatus, REMINDER_GROUP_KEY_PREFIX } from '@domains/signature-flow/value-objects/signature-flow-enums';
import { DocumentRepository } from '@domains/document/repositories/document.repository';
import { DocumentHistoryRepository } from '@domains/document/repositories/document-history.repository';
import { DocumentStatus, DocumentAction } from '@domains/document/value-objects/document-enums';

export class EmailQueueProcessor {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private cycleRunning = false;

  constructor(
    private readonly queueService: EmailQueueService,
    private readonly emailService: EmailService,
    private readonly signatureFlowRepository: SignatureFlowRepository,
    private readonly documentRepository: DocumentRepository,
    private readonly documentHistoryRepository: DocumentHistoryRepository,
  ) {}

  start(): void {
    const intervalMs = parseInt(process.env.EMAIL_QUEUE_INTERVAL_MS ?? '15000', 10);
    void this.runCycle();
    this.intervalHandle = setInterval(() => { void this.runCycle(); }, intervalMs);
    console.log(`✅ Email queue processor started (interval: ${intervalMs}ms)`);
  }

  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      console.log('Email queue processor stopped');
    }
  }

  async runCycle(): Promise<void> {
    if (this.cycleRunning) return;
    this.cycleRunning = true;
    try {
      const batchSize = parseInt(process.env.EMAIL_QUEUE_BATCH_SIZE ?? '10', 10);
      const jobs = await this.queueService.getPendingJobs(batchSize);
      for (const job of jobs) {
        await this.processJob(job);
      }
    } catch (error) {
      console.error('[EmailQueueProcessor] Cycle error:', error);
    } finally {
      this.cycleRunning = false;
    }
  }

  private async processJob(job: {
    id: string;
    toAddress: string;
    subject: string;
    htmlContent?: string;
    textContent?: string;
    correlationId?: string;
  }): Promise<void> {
    await this.queueService.markAsProcessing(job.id);

    const to: string | string[] = job.toAddress.includes(',')
      ? job.toAddress.split(',').map((s) => s.trim())
      : job.toAddress;

    try {
      const sent = await this.emailService.send({
        to,
        subject: job.subject,
        html: job.htmlContent,
        text: job.textContent,
      });

      if (sent) {
        await this.queueService.markAsSent(job.id);
      } else {
        await this.queueService.markAsFailed(job.id, 'El servicio de correo no está disponible o configurado');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[EmailQueueProcessor] job ${job.id} failed:`, message);
      await this.queueService.markAsFailed(job.id, message);
    }

    if (job.correlationId) {
      await this.checkBatchCompletion(job.correlationId);
    }
  }

  async checkBatchCompletion(correlationId: string): Promise<void> {
    // Excluye recordatorios: quedan agendados con fecha futura (a veces días) y no son parte
    // del batch inicial — si se contaran, el documento nunca saldría de "pending_notification".
    const unfinished = await this.queueService.countUnfinishedExcludingGroupKeyPrefix(correlationId, REMINDER_GROUP_KEY_PREFIX);
    if (unfinished > 0) return;

    const flow = await this.signatureFlowRepository.findById(correlationId);
    if (!flow) return;

    const document = await this.documentRepository.findById(flow.documentId);
    if (!document) return;

    if (document.status !== DocumentStatus.PENDING_NOTIFICATION) return;

    const abandonedCount = await this.queueService.countAbandoned(correlationId);

    const targetStatus = flow.status === SignatureFlowStatus.IN_REVIEW
      ? DocumentStatus.IN_REVIEW_FOR_SIGN
      : DocumentStatus.IN_SIGNING;

    document.status = targetStatus;
    await this.documentRepository.update(document);

    const action = abandonedCount > 0 ? DocumentAction.NOTIFICATION_ERROR : DocumentAction.FLOW_SENT;
    const comment = abandonedCount > 0
      ? `Flujo iniciado con ${abandonedCount} notificación(es) que no pudieron enviarse`
      : 'Notificaciones enviadas. Flujo de firma activo.';

    await this.documentHistoryRepository.save({
      documentId: document.id,
      documentModelId: document.documentModelId,
      name: document.name,
      issuedDate: document.issuedDate ?? null,
      expirationDate: document.expirationDate,
      contractId: document.contractId,
      description: document.description,
      documentUrl: document.documentUrl,
      status: document.status,
      action,
      comment,
    });
  }
}
