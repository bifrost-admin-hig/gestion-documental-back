import { SignatureFlowRepository } from '@domains/signature-flow/repositories/signature-flow.repository';
import { SignatureFlowParticipantRepository } from '@domains/signature-flow/repositories/signature-flow-participant.repository';
import {
  CloseSignatureFlowUseCase,
  SkipSignerUseCase,
  AutoRejectValidatorUseCase,
} from '@domains/signature-flow/use-cases/close-signature-flow.use-case';
import { getCurrentlyEnabledParticipants, computeEnabledSince } from '@domains/signature-flow/services/signature-flow-step.util';
import { SignatureFlowParticipantRole, SignatureFlowParticipantStatus } from '@domains/signature-flow/value-objects/signature-flow-enums';

const TIMER_CLOSE_COMMENT = 'Cierre automático: se agotó el tiempo definido sin que se completara la firma.';
const EXPIRATION_CLOSE_COMMENT = 'Cierre automático: el documento venció.';
const SEQUENTIAL_SIGNER_TIMEOUT_COMMENT = 'Cierre automático: el firmante no actuó dentro del plazo definido.';
const VALIDATOR_TIMEOUT_COMMENT = 'Rechazo automático: el validador no actuó dentro del plazo definido.';

export class SignatureFlowAutoCloseProcessor {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private cycleRunning = false;

  constructor(
    private readonly signatureFlowRepository: SignatureFlowRepository,
    private readonly signatureFlowParticipantRepository: SignatureFlowParticipantRepository,
    private readonly closeSignatureFlowUseCase: CloseSignatureFlowUseCase,
    private readonly skipSignerUseCase: SkipSignerUseCase,
    private readonly autoRejectValidatorUseCase: AutoRejectValidatorUseCase,
  ) {}

  start(): void {
    const intervalMs = parseInt(process.env.SIGNATURE_FLOW_AUTO_CLOSE_INTERVAL_MS ?? '900000', 10);
    void this.runCycle();
    this.intervalHandle = setInterval(() => { void this.runCycle(); }, intervalMs);
    console.log(`✅ Signature flow auto-close processor started (interval: ${intervalMs}ms)`);
  }

  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      console.log('Signature flow auto-close processor stopped');
    }
  }

  async runCycle(): Promise<void> {
    if (this.cycleRunning) return;
    this.cycleRunning = true;
    try {
      const now = new Date();
      await this.closeDueByTimer(now);
      await this.closeDueByExpiredDocument(now);
      await this.advanceDueSequentialSigners(now);
      await this.rejectDueValidators(now);
    } catch (error) {
      console.error('[SignatureFlowAutoCloseProcessor] Cycle error:', error);
    } finally {
      this.cycleRunning = false;
    }
  }

  /** Firma en paralelo: un único vencimiento para todo el flujo (todos fueron notificados a la vez). */
  private async closeDueByTimer(now: Date): Promise<void> {
    const flows = await this.signatureFlowRepository.findDueForAutoClose(now);
    for (const flow of flows) {
      try {
        await this.closeSignatureFlowUseCase.execute({
          flowId: flow.id,
          actorUserId: null,
          comment: TIMER_CLOSE_COMMENT,
        });
      } catch (error) {
        console.warn(`[SignatureFlowAutoCloseProcessor] No se pudo cerrar automáticamente el flujo ${flow.id}:`, error);
      }
    }
  }

  private async closeDueByExpiredDocument(now: Date): Promise<void> {
    const flows = await this.signatureFlowRepository.findInSigningWithExpiredDocuments(now);
    for (const flow of flows) {
      try {
        await this.closeSignatureFlowUseCase.execute({
          flowId: flow.id,
          actorUserId: null,
          comment: EXPIRATION_CLOSE_COMMENT,
        });
      } catch (error) {
        console.warn(`[SignatureFlowAutoCloseProcessor] No se pudo cerrar el flujo ${flow.id} por vencimiento del documento:`, error);
      }
    }
  }

  /**
   * Firma secuencial: el plazo se evalúa por firmante, contado desde que cada uno quedó
   * habilitado (no desde el envío original) — si vence, se lo salta y se avanza al siguiente;
   * si era el último pendiente, se cierra el flujo.
   */
  private async advanceDueSequentialSigners(now: Date): Promise<void> {
    const flows = await this.signatureFlowRepository.findSequentialSigningWithAutoCloseEnabled();
    for (const flow of flows) {
      try {
        const participants = await this.signatureFlowParticipantRepository.findByFlowId(flow.id);
        const currentSigners = getCurrentlyEnabledParticipants(flow, participants)
          .filter((p) => p.role === SignatureFlowParticipantRole.SIGNER);
        if (currentSigners.length === 0) continue;

        const enabledSince = computeEnabledSince(flow, currentSigners[0], participants);
        if (!enabledSince) continue;
        if (enabledSince.getTime() + flow.autoCloseIntervalMinutes * 60 * 1000 > now.getTime()) continue;

        const currentIds = new Set(currentSigners.map((p) => p.id));
        const remainingPending = participants.some((p) => (
          p.role === SignatureFlowParticipantRole.SIGNER
          && p.status === SignatureFlowParticipantStatus.PENDING
          && !currentIds.has(p.id)
        ));

        if (remainingPending) {
          await this.skipSignerUseCase.execute({ flowId: flow.id, actorUserId: null, comment: SEQUENTIAL_SIGNER_TIMEOUT_COMMENT });
        } else {
          await this.closeSignatureFlowUseCase.execute({ flowId: flow.id, actorUserId: null, comment: TIMER_CLOSE_COMMENT });
        }
      } catch (error) {
        console.warn(`[SignatureFlowAutoCloseProcessor] No se pudo avanzar/cerrar el firmante secuencial vencido del flujo ${flow.id}:`, error);
      }
    }
  }

  /**
   * Revisión (paralela o secuencial): el validador actualmente habilitado que no actúa a
   * tiempo hace que el documento se rechace — nunca se salta a un aprobador ni se avanza al
   * siguiente validador o a los firmantes.
   */
  private async rejectDueValidators(now: Date): Promise<void> {
    const flows = await this.signatureFlowRepository.findInReviewWithAutoCloseEnabled();
    for (const flow of flows) {
      try {
        const participants = await this.signatureFlowParticipantRepository.findByFlowId(flow.id);
        const currentValidators = getCurrentlyEnabledParticipants(flow, participants)
          .filter((p) => p.role === SignatureFlowParticipantRole.VALIDATOR);
        if (currentValidators.length === 0) continue;

        const enabledSince = computeEnabledSince(flow, currentValidators[0], participants);
        if (!enabledSince) continue;
        if (enabledSince.getTime() + flow.autoCloseIntervalMinutes * 60 * 1000 > now.getTime()) continue;

        // Alcanza con rechazar uno: reconcileFlow ya marca todo el flujo como rechazado.
        await this.autoRejectValidatorUseCase.execute({
          flowId: flow.id,
          participantId: currentValidators[0].id,
          comment: VALIDATOR_TIMEOUT_COMMENT,
        });
      } catch (error) {
        console.warn(`[SignatureFlowAutoCloseProcessor] No se pudo rechazar automáticamente el validador vencido del flujo ${flow.id}:`, error);
      }
    }
  }
}
