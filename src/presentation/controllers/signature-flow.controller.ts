import { Request, Response } from 'express';
import { asyncHandler } from '@shared/middleware/validation';
import { CreateSignatureFlowUseCase } from '@domains/signature-flow/use-cases/create-signature-flow.use-case';
import {
  GetSignatureFlowByIdUseCase,
  GetSignatureFlowsByDocumentIdUseCase,
  GetSignatureFlowParticipantsByFlowIdUseCase,
  GetMyPendingSignatureTasksUseCase,
  GetPendingSignatureDocumentsReportUseCase,
  GetSignatureProcessTimeReportUseCase,
  GetResendableParticipantsUseCase,
} from '@domains/signature-flow/use-cases/get-signature-flow.use-case';
import {
  UpdateSignatureFlowUseCase,
  AddParticipantToFlowUseCase,
  RemoveParticipantFromFlowUseCase,
  DeleteSignatureFlowUseCase,
} from '@domains/signature-flow/use-cases/update-signature-flow.use-case';
import { ProcessFlowParticipantActionUseCase } from '@domains/signature-flow/use-cases/progress-signature-flow.use-case';
import { ResendSignatureFlowNotificationUseCase } from '@domains/signature-flow/use-cases/resend-signature-flow-notification.use-case';
import { GetSignatureFlowTrackingByDocumentUseCase } from '@domains/signature-flow/use-cases/get-signature-flow-tracking.use-case';
import { SkipSignerUseCase, CloseSignatureFlowUseCase, ReopenSignatureFlowUseCase } from '@domains/signature-flow/use-cases/close-signature-flow.use-case';
import { SignatureFlow } from '@domains/signature-flow/entities/signature-flow.entity';
import { SignatureFlowParticipant } from '@domains/signature-flow/entities/signature-flow-participant.entity';

export class SignatureFlowController {
  constructor(
    private readonly createSignatureFlowUseCase: CreateSignatureFlowUseCase,
    private readonly getSignatureFlowByIdUseCase: GetSignatureFlowByIdUseCase,
    private readonly getSignatureFlowsByDocumentIdUseCase: GetSignatureFlowsByDocumentIdUseCase,
    private readonly getSignatureFlowParticipantsByFlowIdUseCase: GetSignatureFlowParticipantsByFlowIdUseCase,
    private readonly getMyPendingSignatureTasksUseCase: GetMyPendingSignatureTasksUseCase,
    private readonly getPendingSignatureDocumentsReportUseCase: GetPendingSignatureDocumentsReportUseCase,
    private readonly getSignatureProcessTimeReportUseCase: GetSignatureProcessTimeReportUseCase,
    private readonly updateSignatureFlowUseCase: UpdateSignatureFlowUseCase,
    private readonly addParticipantToFlowUseCase: AddParticipantToFlowUseCase,
    private readonly removeParticipantFromFlowUseCase: RemoveParticipantFromFlowUseCase,
    private readonly processFlowParticipantActionUseCase: ProcessFlowParticipantActionUseCase,
    private readonly deleteSignatureFlowUseCase: DeleteSignatureFlowUseCase,
    private readonly resendSignatureFlowNotificationUseCase: ResendSignatureFlowNotificationUseCase,
    private readonly getResendableParticipantsUseCase: GetResendableParticipantsUseCase,
    private readonly getSignatureFlowTrackingByDocumentUseCase: GetSignatureFlowTrackingByDocumentUseCase,
    private readonly skipSignerUseCase: SkipSignerUseCase,
    private readonly closeSignatureFlowUseCase: CloseSignatureFlowUseCase,
    private readonly reopenSignatureFlowUseCase: ReopenSignatureFlowUseCase,
  ) {}

  create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth!.user!.id;
    const {
      documentId, orderType, signerOrderType, participants,
      reminderEnabled, reminderIntervalMinutes,
      autoCloseEnabled, autoCloseIntervalMinutes,
      requireSignatureDrawing,
    } = req.body;

    const flow = await this.createSignatureFlowUseCase.execute({
      documentId,
      orderType,
      signerOrderType,
      sentBy: userId,
      participants,
      reminderEnabled,
      reminderIntervalMinutes,
      autoCloseEnabled,
      autoCloseIntervalMinutes,
      requireSignatureDrawing,
    });

    res.status(201).json({ success: true, data: this.flowToDto(flow) });
  });

  getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const flow = await this.getSignatureFlowByIdUseCase.execute(id);
    res.status(200).json({ success: true, data: this.flowToDto(flow) });
  });

  getByDocument = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { documentId } = req.params;
    const flows = await this.getSignatureFlowsByDocumentIdUseCase.execute(documentId);
    res.status(200).json({ success: true, data: flows.map((f) => this.flowToDto(f)), count: flows.length });
  });

  getParticipants = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const participants = await this.getSignatureFlowParticipantsByFlowIdUseCase.execute(id);
    res.status(200).json({ success: true, data: participants.map((p) => this.participantToDto(p)), count: participants.length });
  });

  getMyPending = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth!.user!.id;
    const groupId = req.auth?.groupId;
    const tasks = await this.getMyPendingSignatureTasksUseCase.execute(userId, groupId);
    res.status(200).json({
      success: true,
      data: tasks.map((task) => ({
        participantId: task.participantId,
        flowId: task.flowId,
        role: task.role,
        order: task.order,
        document: {
          id: task.documentId,
          name: task.documentName,
          status: task.documentStatus,
          typeName: task.documentTypeName,
          subtypeName: task.documentSubtypeName,
          contractNumber: task.contractNumber,
        },
        sentAt: task.sentAt?.toISOString() ?? null,
        sentByName: task.sentByName,
        requiresSignatureDrawing: task.requiresSignatureDrawing,
      })),
      count: tasks.length,
    });
  });

  getPendingDocumentsReport = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const groupId = req.auth?.groupId;
    const items = await this.getPendingSignatureDocumentsReportUseCase.execute(groupId);

    res.status(200).json({
      success: true,
      data: items.map((item) => ({
        flowId: item.flowId,
        document: {
          id: item.documentId,
          name: item.documentName,
          status: item.documentStatus,
          typeName: item.documentTypeName,
          subtypeName: item.documentSubtypeName,
          contractNumber: item.contractNumber,
        },
        sentAt: item.sentAt?.toISOString() ?? null,
        sentBy: item.sentBy,
        sentByName: item.sentByName,
        currentHolders: item.currentHolders.map((h) => ({ participantId: h.participantId, name: h.name })),
      })),
      count: items.length,
    });
  });

  getSigningTimeReport = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const groupId = req.auth?.groupId;
    const items = await this.getSignatureProcessTimeReportUseCase.execute(groupId);

    res.status(200).json({
      success: true,
      data: items.map((item) => ({
        flowId: item.flowId,
        documentId: item.documentId,
        documentName: item.documentName,
        sentAt: item.sentAt.toISOString(),
        signedAt: item.signedAt.toISOString(),
        elapsedDays: item.elapsedDays,
      })),
      count: items.length,
    });
  });

  update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { orderType, signerOrderType } = req.body;
    const flow = await this.updateSignatureFlowUseCase.execute({ id, orderType, signerOrderType });
    res.status(200).json({ success: true, data: this.flowToDto(flow) });
  });

  addParticipant = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { userId, colaboratorId, externalName, externalEmail, role, order } = req.body;
    const participant = await this.addParticipantToFlowUseCase.execute({
      flowId: id,
      userId,
      colaboratorId,
      externalName,
      externalEmail,
      role,
      order,
    });
    res.status(201).json({ success: true, data: this.participantToDto(participant) });
  });

  removeParticipant = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { participantId } = req.params;
    await this.removeParticipantFromFlowUseCase.execute(participantId);
    res.status(200).json({ success: true, message: 'Participante eliminado' });
  });

  processParticipantAction = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { participantId } = req.params;
    const { action, comment } = req.body;
    const actorUserId = req.auth!.user!.id;

    await this.processFlowParticipantActionUseCase.execute({
      participantId,
      actorUserId,
      action,
      comment,
    });

    res.status(200).json({ success: true, message: 'Acción aplicada correctamente' });
  });

  getDocumentTracking = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { documentId } = req.params;
    const items = await this.getSignatureFlowTrackingByDocumentUseCase.execute(documentId);

    res.status(200).json({
      success: true,
      data: items.map((item) => ({
        flowId: item.flowId,
        orderType: item.orderType,
        signerOrderType: item.signerOrderType,
        status: item.status,
        sentAt: item.sentAt?.toISOString() ?? null,
        sentBy: item.sentBy,
        sentByName: item.sentByName,
        nextAutoActionAt: item.nextAutoActionAt?.toISOString() ?? null,
        participants: item.participants.map((p) => ({
          participantId: p.participantId,
          name: p.name,
          role: p.role,
          order: p.order,
          status: p.status,
          actionAt: p.actionAt?.toISOString() ?? null,
          rejectionComment: p.rejectionComment,
          nextReminderAt: p.nextReminderAt?.toISOString() ?? null,
          actionEvidence: p.actionEvidence ? {
            verifiedByCode: p.actionEvidence.verifiedByCode,
            method: p.actionEvidence.method,
            ipAddress: p.actionEvidence.ipAddress,
            channel: p.actionEvidence.channel,
            failedAttempts: p.actionEvidence.failedAttempts,
          } : null,
          notifications: p.notifications.map((n) => ({
            id: n.id,
            number: n.number,
            type: n.type,
            createdAt: n.createdAt.toISOString(),
            triggeredByName: n.triggeredByName,
            email: n.email ? {
              to: n.email.to,
              subject: n.email.subject,
              html: n.email.html,
              text: n.email.text,
              status: n.email.status,
              sentAt: n.email.sentAt?.toISOString() ?? null,
              channel: n.email.channel,
            } : null,
          })),
          verificationNotifications: p.verificationNotifications.map((n) => ({
            id: n.id,
            number: n.number,
            type: n.type,
            createdAt: n.createdAt.toISOString(),
            triggeredByName: n.triggeredByName,
            email: n.email ? {
              to: n.email.to,
              subject: n.email.subject,
              html: n.email.html,
              text: n.email.text,
              status: n.email.status,
              sentAt: n.email.sentAt?.toISOString() ?? null,
              channel: n.email.channel,
            } : null,
          })),
        })),
      })),
      count: items.length,
    });
  });

  skipSigner = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { comment } = req.body;
    const actorUserId = req.auth!.user!.id;
    const actorCanCloseAny = req.auth!.user!.can('signature-flow:close:any');

    await this.skipSignerUseCase.execute({ flowId: id, actorUserId, actorCanCloseAny, comment });

    res.status(200).json({ success: true, message: 'Firmante saltado correctamente' });
  });

  closeSignatureFlow = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { comment } = req.body;
    const actorUserId = req.auth!.user!.id;
    const actorCanCloseAny = req.auth!.user!.can('signature-flow:close:any');

    await this.closeSignatureFlowUseCase.execute({ flowId: id, actorUserId, actorCanCloseAny, comment });

    res.status(200).json({ success: true, message: 'Proceso de firma cerrado correctamente' });
  });

  reopenSignatureFlow = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { comment } = req.body;
    const actorUserId = req.auth!.user!.id;
    const actorCanReopen = req.auth!.user!.can('signature-flow:reopen');

    await this.reopenSignatureFlowUseCase.execute({ flowId: id, actorUserId, actorCanReopen, comment });

    res.status(200).json({ success: true, message: 'Proceso de firma reabierto correctamente' });
  });

  getResendCandidates = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const actorUserId = req.auth!.user!.id;
    const actorCanResendAny = req.auth!.user!.can('signature-flow:resend:any');

    const items = await this.getResendableParticipantsUseCase.execute({ flowId: id, actorUserId, actorCanResendAny });
    res.status(200).json({ success: true, data: items, count: items.length });
  });

  resendNotifications = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { participantIds } = req.body;
    const actorUserId = req.auth!.user!.id;
    const actorCanResendAny = req.auth!.user!.can('signature-flow:resend:any');

    await this.resendSignatureFlowNotificationUseCase.execute({
      flowId: id,
      participantIds,
      actorUserId,
      actorCanResendAny,
    });

    res.status(200).json({ success: true, message: 'Notificación reenviada correctamente' });
  });

  delete = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    await this.deleteSignatureFlowUseCase.execute(id);
    res.status(200).json({ success: true, message: 'Flujo de firma eliminado' });
  });

  private flowToDto(flow: SignatureFlow) {
    return {
      id: flow.id,
      documentId: flow.documentId,
      orderType: flow.orderType,
      signerOrderType: flow.signerOrderType,
      status: flow.status,
      sentAt: flow.sentAt?.toISOString() ?? null,
      sentBy: flow.sentBy,
      reminderEnabled: flow.reminderEnabled,
      reminderIntervalMinutes: flow.reminderIntervalMinutes,
      autoCloseEnabled: flow.autoCloseEnabled,
      autoCloseIntervalMinutes: flow.autoCloseIntervalMinutes,
      requireSignatureDrawing: flow.requireSignatureDrawing,
      createdAt: flow.createdAt.toISOString(),
      updatedAt: flow.updatedAt.toISOString(),
    };
  }

  private participantToDto(p: SignatureFlowParticipant) {
    return {
      id: p.id,
      flowId: p.flowId,
      userId: p.userId,
      colaboratorId: p.colaboratorId,
      externalName: p.externalName,
      externalEmail: p.externalEmail,
      role: p.role,
      order: p.order,
      status: p.status,
      actionAt: p.actionAt?.toISOString() ?? null,
      rejectionComment: p.rejectionComment,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }
}
