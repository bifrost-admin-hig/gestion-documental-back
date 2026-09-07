import { DocumentHistoryRepository } from '@domains/document/repositories/document-history.repository';
import { DocumentRepository } from '@domains/document/repositories/document.repository';
import { DocumentAction, DocumentStatus } from '@domains/document/value-objects/document-enums';
import { NotFoundError, ValidationError } from '@shared/domain/errors';
import { SignatureFlowParticipant } from '../entities/signature-flow-participant.entity';
import { SignatureFlowRepository } from '../repositories/signature-flow.repository';
import { SignatureFlowParticipantRepository } from '../repositories/signature-flow-participant.repository';
import {
  SignatureFlowOrderType,
  SignatureFlowParticipantRole,
  SignatureFlowParticipantStatus,
  SignatureFlowStatus,
} from '../value-objects/signature-flow-enums';
import { SignatureFlowNotificationService, ReminderConfig } from '../services/signature-flow-notification.service';
import { SignatureStatus } from '@domains/signature/value-objects/signature-enums';
import { UserRepository } from '@domains/user/repositories/user.repository';
import { ColaboratorRepository } from '@domains/colaborators/repositories/colaborator.repository';
import { SignatureRepository } from '@domains/signature/repositories/signature.repository';
import { TypeOrmFileRepository } from '@shared/infrastructure/repositories/typeorm-file.repository';
import {
  SignaturePdfStampService,
  SignerStampData,
  StampTarget,
} from '@shared/infrastructure/pdf/signature-pdf-stamp.service';
import { Document } from '@domains/document/entities/document.entity';
import { DocumentVersioningService } from '@domains/document/services/document-versioning.service';
import { SignatureFlow } from '../entities/signature-flow.entity';
import { ExternalParticipantTokenRepository } from '../repositories/external-participant-token.repository';
import { buildFrontendUrl } from '@shared/infrastructure/email/templates/primacta-notification-email.template';
import { isParticipantEnabledInCurrentStep, orderTypeForRole } from '../services/signature-flow-step.util';

export interface ProcessFlowParticipantActionInput {
  participantId: string;
  actorUserId: string;
  action: 'approve' | 'reject';
  comment?: string;
}

export class ProcessFlowParticipantActionUseCase {
  constructor(
    private readonly flowRepository: SignatureFlowRepository,
    private readonly participantRepository: SignatureFlowParticipantRepository,
    private readonly documentRepository: DocumentRepository,
    private readonly documentHistoryRepository: DocumentHistoryRepository,
    private readonly notificationService: SignatureFlowNotificationService,
    private readonly userRepository?: UserRepository,
    private readonly colaboratorRepository?: ColaboratorRepository,
    private readonly signatureRepository?: SignatureRepository,
    private readonly fileRepository?: TypeOrmFileRepository,
    private readonly pdfStampService?: SignaturePdfStampService,
    private readonly externalTokenRepository?: ExternalParticipantTokenRepository,
    private readonly documentVersioningService?: DocumentVersioningService,
  ) {}

  async execute(input: ProcessFlowParticipantActionInput): Promise<void> {
    const participant = await this.participantRepository.findById(input.participantId);
    if (!participant) throw new NotFoundError('Participante del flujo no encontrado');

    if (!participant.userId || participant.userId !== input.actorUserId) {
      throw new ValidationError('No tienes permisos para realizar esta acción en el participante');
    }

    const flow = await this.flowRepository.findById(participant.flowId);
    if (!flow) throw new NotFoundError('Flujo de firma no encontrado');

    const document = await this.documentRepository.findById(flow.documentId);
    if (!document) throw new NotFoundError('Documento no encontrado');

    if (participant.status !== SignatureFlowParticipantStatus.PENDING) {
      throw new ValidationError('El participante no está pendiente de acción');
    }

    if (!isParticipantEnabledInCurrentStep(orderTypeForRole(flow, participant.role), participant, await this.participantRepository.findByFlowId(flow.id))) {
      throw new ValidationError('Este participante aún no puede actuar por el orden configurado del flujo');
    }

    if (participant.role === SignatureFlowParticipantRole.VALIDATOR) {
      if (flow.status !== SignatureFlowStatus.IN_REVIEW) {
        throw new ValidationError('El flujo no está en etapa de revisión');
      }
      if (input.action === 'approve') {
        participant.status = SignatureFlowParticipantStatus.APPROVED;
      } else {
        participant.status = SignatureFlowParticipantStatus.REJECTED;
        participant.rejectionComment = input.comment?.trim() || null;
      }
    } else {
      if (flow.status !== SignatureFlowStatus.IN_SIGNING) {
        throw new ValidationError('El flujo no está en etapa de firma');
      }
      if (input.action === 'approve') {
        throw new ValidationError('El firmante debe firmar con código de verificación');
      }
      participant.status = SignatureFlowParticipantStatus.REJECTED;
      participant.rejectionComment = input.comment?.trim() || null;
    }

    participant.actionAt = new Date();
    await this.participantRepository.update(participant);

    await this.documentHistoryRepository.save({
      documentId: document.id,
      documentModelId: document.documentModelId,
      name: document.name,
      issuedDate: document.issuedDate ?? undefined,
      expirationDate: document.expirationDate,
      contractId: document.contractId,
      description: document.description,
      documentUrl: document.documentUrl,
      status: document.status,
      action: input.action === 'approve' ? DocumentAction.FLOW_VALIDATED : DocumentAction.FLOW_PARTICIPANT_REJECTED,
      updatedBy: input.actorUserId,
      comment: input.comment?.trim() || null,
      flowParticipantId: participant.id,
      actionComment: input.comment?.trim() || null,
    });

    await this.reconcileFlow(flow.id);
  }

  // Returns true if the signer was found in an active flow and marked as signed.
  // The caller can use this to skip per-signer PDF stamping when a flow is involved.
  async markSignerSignedFromOtp(documentId: string, userId: string, signedAt: Date): Promise<boolean> {
    const flow = await this.flowRepository.findActiveByDocumentId(documentId);
    if (!flow || flow.status !== SignatureFlowStatus.IN_SIGNING) return false;

    const participants = await this.participantRepository.findByFlowId(flow.id);
    const participant = participants.find((p) => (
      p.role === SignatureFlowParticipantRole.SIGNER
      && p.userId === userId
      && p.status === SignatureFlowParticipantStatus.PENDING
      && isParticipantEnabledInCurrentStep(flow.signerOrderType, p, participants)
    ));

    if (!participant) return false;

    participant.status = SignatureFlowParticipantStatus.SIGNED;
    participant.actionAt = signedAt;
    await this.participantRepository.update(participant);

    const document = await this.documentRepository.findById(documentId);
    if (document) {
      await this.documentHistoryRepository.save({
        documentId: document.id,
        documentModelId: document.documentModelId,
        name: document.name,
        issuedDate: document.issuedDate ?? undefined,
        expirationDate: document.expirationDate,
        contractId: document.contractId,
        description: document.description,
        documentUrl: document.documentUrl,
        status: document.status,
        action: DocumentAction.FLOW_SIGNED,
        updatedBy: userId,
        comment: 'Firmante completó la firma con código de verificación',
        flowParticipantId: participant.id,
      });
    }

    await this.reconcileFlow(flow.id);
    return true;
  }

  // Used by external (no-account) validators — bypasses userId ownership check.
  async executeForExternal(input: { participantId: string; action: 'approve' | 'reject'; comment?: string }): Promise<void> {
    const participant = await this.participantRepository.findById(input.participantId);
    if (!participant) throw new NotFoundError('Participante del flujo no encontrado');

    const flow = await this.flowRepository.findById(participant.flowId);
    if (!flow) throw new NotFoundError('Flujo de firma no encontrado');

    const document = await this.documentRepository.findById(flow.documentId);
    if (!document) throw new NotFoundError('Documento no encontrado');

    if (participant.status !== SignatureFlowParticipantStatus.PENDING) {
      throw new ValidationError('El participante no está pendiente de acción');
    }

    if (participant.role !== SignatureFlowParticipantRole.VALIDATOR) {
      throw new ValidationError('Solo los validadores pueden usar esta acción');
    }

    if (flow.status !== SignatureFlowStatus.IN_REVIEW) {
      throw new ValidationError('El flujo no está en etapa de revisión');
    }

    participant.status = input.action === 'approve'
      ? SignatureFlowParticipantStatus.APPROVED
      : SignatureFlowParticipantStatus.REJECTED;

    if (input.action === 'reject') {
      participant.rejectionComment = input.comment?.trim() || null;
    }

    participant.actionAt = new Date();
    await this.participantRepository.update(participant);

    const externalDisplayName = participant.colaboratorId
      ? (participant.externalName ?? 'Colaborador')
      : participant.externalName
        ? `${participant.externalName} (Externo)`
        : 'Participante externo';

    await this.documentHistoryRepository.save({
      documentId: document.id,
      documentModelId: document.documentModelId,
      name: document.name,
      issuedDate: document.issuedDate ?? undefined,
      expirationDate: document.expirationDate,
      contractId: document.contractId,
      description: document.description,
      documentUrl: document.documentUrl,
      status: document.status,
      action: input.action === 'approve' ? DocumentAction.FLOW_VALIDATED : DocumentAction.FLOW_PARTICIPANT_REJECTED,
      updatedBy: undefined,
      updatedByName: externalDisplayName,
      comment: input.comment?.trim() || null,
      flowParticipantId: participant.id,
      actionComment: input.comment?.trim() || null,
    });

    await this.reconcileFlow(flow.id);
  }

  // Used when an external signer completes signing via OTP.
  // signatureTokenHash and ipAddress are already stored in ExternalParticipantToken by the caller.
  async markExternalSignerSignedFromToken(participantId: string, signedAt: Date): Promise<void> {
    const participant = await this.participantRepository.findById(participantId);
    if (!participant) return;

    const flow = await this.flowRepository.findById(participant.flowId);
    if (!flow || flow.status !== SignatureFlowStatus.IN_SIGNING) return;

    if (participant.status !== SignatureFlowParticipantStatus.PENDING) return;

    participant.status = SignatureFlowParticipantStatus.SIGNED;
    participant.actionAt = signedAt;
    await this.participantRepository.update(participant);

    const document = await this.documentRepository.findById(flow.documentId);
    if (document) {
      const externalDisplayName = participant.colaboratorId
        ? (participant.externalName ?? 'Colaborador')
        : participant.externalName
          ? `${participant.externalName} (Externo)`
          : 'Firmante externo';

      await this.documentHistoryRepository.save({
        documentId: document.id,
        documentModelId: document.documentModelId,
        name: document.name,
        issuedDate: document.issuedDate ?? undefined,
        expirationDate: document.expirationDate,
        contractId: document.contractId,
        description: document.description,
        documentUrl: document.documentUrl,
        status: document.status,
        action: DocumentAction.FLOW_SIGNED,
        updatedBy: undefined,
        updatedByName: externalDisplayName,
        comment: 'Firmante externo completó la firma con código de verificación',
        flowParticipantId: participant.id,
      });
    }

    await this.reconcileFlow(flow.id);
  }

  async markSignerRejectedFromOtp(documentId: string, userId: string, reason: string): Promise<void> {
    const flow = await this.flowRepository.findActiveByDocumentId(documentId);
    if (!flow) return;

    const participants = await this.participantRepository.findByFlowId(flow.id);
    const participant = participants.find((p) => (
      p.role === SignatureFlowParticipantRole.SIGNER
      && p.userId === userId
      && p.status === SignatureFlowParticipantStatus.PENDING
      && isParticipantEnabledInCurrentStep(flow.signerOrderType, p, participants)
    ));

    if (!participant) return;

    participant.status = SignatureFlowParticipantStatus.REJECTED;
    participant.rejectionComment = reason;
    participant.actionAt = new Date();
    await this.participantRepository.update(participant);

    const document = await this.documentRepository.findById(documentId);
    if (document) {
      await this.documentHistoryRepository.save({
        documentId: document.id,
        documentModelId: document.documentModelId,
        name: document.name,
        issuedDate: document.issuedDate ?? undefined,
        expirationDate: document.expirationDate,
        contractId: document.contractId,
        description: document.description,
        documentUrl: document.documentUrl,
        status: document.status,
        action: DocumentAction.FLOW_PARTICIPANT_REJECTED,
        updatedBy: userId,
        comment: reason,
        flowParticipantId: participant.id,
        actionComment: reason,
      });
    }

    await this.reconcileFlow(flow.id);
  }

  async reconcileFlow(flowId: string): Promise<void> {
    const flow = await this.flowRepository.findById(flowId);
    if (!flow) return;

    const document = await this.documentRepository.findById(flow.documentId);
    if (!document) return;

    const participants = await this.participantRepository.findByFlowId(flow.id);
    const validators = participants.filter((p) => p.role === SignatureFlowParticipantRole.VALIDATOR);
    const signers = participants.filter((p) => p.role === SignatureFlowParticipantRole.SIGNER);
    const reminderConfig: ReminderConfig = { enabled: flow.reminderEnabled, intervalMinutes: flow.reminderIntervalMinutes };

    // Quien ya no está pendiente (aprobó/firmó/rechazó) ya no debe recibir el recordatorio agendado.
    await Promise.all(
      participants
        .filter((p) => p.status !== SignatureFlowParticipantStatus.PENDING)
        .map((p) => this.notificationService.cancelReminder(p.id)),
    );

    const hasRejected = participants.some((p) => p.status === SignatureFlowParticipantStatus.REJECTED);
    if (hasRejected) {
      const rejectedParticipants = participants
        .filter((p) => p.status === SignatureFlowParticipantStatus.REJECTED)
        .sort((a, b) => (b.actionAt?.getTime() ?? 0) - (a.actionAt?.getTime() ?? 0));

      const rejectionReason = rejectedParticipants[0]?.rejectionComment?.trim() || 'Sin motivo proporcionado';

      flow.status = SignatureFlowStatus.REJECTED;

      // Si el documento venía "aprobado" antes de entrar al flujo, no pierde ese atributo:
      // el rechazo se representa con signatureStatus, no moviendo el status a rejected_for_sign.
      if (document.preFlowStatus === DocumentStatus.APPROVED) {
        document.status = DocumentStatus.APPROVED;
        document.preFlowStatus = null;
      } else {
        document.status = DocumentStatus.REJECTED_FOR_SIGN;
      }
      document.signatureStatus = SignatureStatus.REJECTED;
      document.comment = rejectionReason;

      // El flujo se cierra: los demás participantes (aunque sigan "pendientes") ya no deben ser recordados.
      await Promise.all(participants.map((p) => this.notificationService.cancelReminder(p.id)));

      await this.flowRepository.update(flow);
      await this.documentRepository.update(document);

      await this.documentHistoryRepository.save({
        documentId: document.id,
        documentModelId: document.documentModelId,
        name: document.name,
        issuedDate: document.issuedDate ?? undefined,
        expirationDate: document.expirationDate,
        contractId: document.contractId,
        description: document.description,
        documentUrl: document.documentUrl,
        status: document.status,
        action: DocumentAction.FLOW_REJECTED,
        updatedBy: undefined,
        updatedByName: 'Sistema',
        comment: `El flujo fue rechazado por un participante. Motivo: ${rejectionReason}`,
      });

      try {
        await this.notificationService.notifyResponsibleOnRejection(
          document.id,
          document.name,
          document.createdBy,
          rejectionReason,
        );
      } catch (err) {
        console.warn('[reconcileFlow] notifyResponsibleOnRejection failed (non-critical):', err);
      }
      return;
    }

    const validatorsCompleted = validators.length === 0
      || validators.every((p) => p.status === SignatureFlowParticipantStatus.APPROVED);

    // Sequential flow: notify the next pending validator after one approves
    if (
      flow.status === SignatureFlowStatus.IN_REVIEW
      && !validatorsCompleted
      && flow.orderType === SignatureFlowOrderType.SEQUENTIAL
    ) {
      const pendingValidators = validators.filter((p) => p.status === SignatureFlowParticipantStatus.PENDING);
      const nextValidator = pendingValidators
        .filter((p) => p.order !== null)
        .sort((a, b) => (a.order as number) - (b.order as number))[0]
        ?? pendingValidators[0];

      if (nextValidator) {
        try {
          await this.notificationService.notifyParticipantsForCurrentStep(
            [nextValidator],
            document.id,
            document.name,
            flow.orderType,
            undefined,
            undefined,
            reminderConfig,
          );
        } catch (err) {
          console.warn('[reconcileFlow] notify next sequential validator failed (non-critical):', err);
        }

        if (nextValidator.isExternal && nextValidator.externalEmail) {
          try {
            await this.notifyExternalParticipants([nextValidator], document.name, reminderConfig);
          } catch (err) {
            console.warn('[reconcileFlow] notifyExternalParticipants for next validator failed (non-critical):', err);
          }
        }
      }
      return;
    }

    if (flow.status === SignatureFlowStatus.IN_REVIEW && validatorsCompleted) {
      flow.status = SignatureFlowStatus.IN_SIGNING;
      document.status = DocumentStatus.IN_SIGNING;
      await this.flowRepository.update(flow);
      await this.documentRepository.update(document);

      await this.documentHistoryRepository.save({
        documentId: document.id,
        documentModelId: document.documentModelId,
        name: document.name,
        issuedDate: document.issuedDate ?? undefined,
        expirationDate: document.expirationDate,
        contractId: document.contractId,
        description: document.description,
        documentUrl: document.documentUrl,
        status: document.status,
        action: DocumentAction.FLOW_VALIDATED,
        updatedBy: undefined,
        updatedByName: 'Sistema',
        comment: 'Validación completada. Documento enviado a etapa de firma',
      });

      const pendingSigners = signers.filter((p) => p.status === SignatureFlowParticipantStatus.PENDING);
      try {
        await this.notificationService.notifyParticipantsForCurrentStep(
          pendingSigners,
          document.id,
          document.name,
          flow.signerOrderType,
          undefined,
          undefined,
          reminderConfig,
        );
      } catch (err) {
        console.warn('[reconcileFlow] notifyParticipantsForCurrentStep failed (non-critical):', err);
      }

      const externalSigners = pendingSigners.filter((p) => p.isExternal && p.externalEmail);
      try {
        await this.notifyExternalParticipants(externalSigners, document.name, reminderConfig);
      } catch (err) {
        console.warn('[reconcileFlow] notifyExternalParticipants failed (non-critical):', err);
      }
      return;
    }

    const allSignersSigned = signers.length > 0
      && signers.every((p) => p.status === SignatureFlowParticipantStatus.SIGNED || p.status === SignatureFlowParticipantStatus.SKIPPED)
      && signers.some((p) => p.status === SignatureFlowParticipantStatus.SIGNED);

    // Sequential firmantes: notifica al siguiente firmante pendiente después de que uno firma.
    // Análogo al bloque de validadores de arriba — sin esto el segundo firmante nunca sería notificado.
    if (
      flow.status === SignatureFlowStatus.IN_SIGNING
      && !allSignersSigned
      && flow.signerOrderType === SignatureFlowOrderType.SEQUENTIAL
    ) {
      const pendingSigners = signers.filter((p) => p.status === SignatureFlowParticipantStatus.PENDING);
      const nextSigner = pendingSigners
        .filter((p) => p.order !== null)
        .sort((a, b) => (a.order as number) - (b.order as number))[0]
        ?? pendingSigners[0];

      if (nextSigner) {
        try {
          await this.notificationService.notifyParticipantsForCurrentStep(
            [nextSigner],
            document.id,
            document.name,
            flow.signerOrderType,
            undefined,
            undefined,
            reminderConfig,
          );
        } catch (err) {
          console.warn('[reconcileFlow] notify next sequential signer failed (non-critical):', err);
        }

        if (nextSigner.isExternal && nextSigner.externalEmail) {
          try {
            await this.notifyExternalParticipants([nextSigner], document.name, reminderConfig);
          } catch (err) {
            console.warn('[reconcileFlow] notifyExternalParticipants for next signer failed (non-critical):', err);
          }
        }
      }
      return;
    }

    if (flow.status === SignatureFlowStatus.IN_SIGNING && allSignersSigned) {
      flow.status = SignatureFlowStatus.SIGNED;
      document.status = DocumentStatus.SIGNED;
      document.signatureStatus = SignatureStatus.SIGNED;
      document.preFlowStatus = null;
      await this.flowRepository.update(flow);
      await this.documentRepository.update(document);

      await this.documentHistoryRepository.save({
        documentId: document.id,
        documentModelId: document.documentModelId,
        name: document.name,
        issuedDate: document.issuedDate ?? undefined,
        expirationDate: document.expirationDate,
        contractId: document.contractId,
        description: document.description,
        documentUrl: document.documentUrl,
        status: document.status,
        action: DocumentAction.FLOW_COMPLETED,
        updatedBy: undefined,
        updatedByName: 'Sistema',
        comment: 'Todos los firmantes completaron la firma',
      });

      await this.tryStampConsolidatedPdf(flow, document, participants);

      try {
        await this.notificationService.notifyResponsibleOnCompletion(
          document.id,
          document.name,
          document.createdBy,
        );
      } catch (err) {
        console.warn('[reconcileFlow] notifyResponsibleOnCompletion failed (non-critical):', err);
      }
    }
  }

  private async tryStampConsolidatedPdf(
    _flow: SignatureFlow,
    document: Document,
    participants: SignatureFlowParticipant[],
  ): Promise<void> {
    if (!this.pdfStampService || !this.userRepository || !this.signatureRepository || !document.documentUrl) return;

    try {
      const stampTarget = await this.resolvePdfPath(document.documentUrl);
      if (!stampTarget) return;

      const signedSigners = participants.filter(
        (p) => p.role === SignatureFlowParticipantRole.SIGNER
          && p.status === SignatureFlowParticipantStatus.SIGNED,
      );

      const documentSignatures = await this.signatureRepository.findByDocumentId(document.id);
      const signerData: SignerStampData[] = [];
      for (const s of signedSigners) {
        if (s.userId) {
          // Internal signer — look up Signature record for tokenHash/IP
          const user = await this.userRepository.findById(s.userId);
          if (!user) continue;

          const signature = documentSignatures.find(
            (sig) => sig.userId === s.userId && sig.tokenHash,
          );
          if (!signature?.tokenHash) continue;

          const colaborator = this.colaboratorRepository
            ? await this.colaboratorRepository.findByUserId(s.userId)
            : null;

          signerData.push({
            signerName: `${user.firstName} ${user.lastName}`,
            signerDocumentNumber: colaborator?.numeroDocumento ?? 'N/A',
            signerEmail: String(user.email),
            signedAt: signature.signedAt ?? s.actionAt ?? new Date(),
            signatureImageBytes: await this.loadSignatureImageBytes(signature.signatureImageFileId),
            ipAddress: signature.ipAddress ?? 'N/A',
            tokenHash: signature.tokenHash,
          });
        } else if (s.externalEmail) {
          // External signer — look up ExternalParticipantToken for tokenHash/IP
          const extToken = this.externalTokenRepository
            ? await this.externalTokenRepository.findByParticipantId(s.id)
            : null;

          signerData.push({
            signerName: s.externalName ?? 'Firmante externo',
            signerDocumentNumber: extToken?.documentNumber ?? 'N/A',
            signerEmail: s.externalEmail,
            signedAt: s.actionAt ?? new Date(),
            signatureImageBytes: await this.loadSignatureImageBytes(extToken?.signatureImageFileId ?? null),
            ipAddress: extToken?.ipAddress ?? 'N/A',
            tokenHash: extToken?.signatureTokenHash ?? 'N/A',
          });
        }
      }

      if (signerData.length === 0) return;

      const verifyUrl = buildFrontendUrl(`/verificar?id=${document.id}`) ?? `/verificar?id=${document.id}`;

      const stampedBytes = await this.pdfStampService.stampConsolidatedPdf(stampTarget, {
        documentId: document.id,
        completedAt: new Date(),
        verifyUrl,
        signers: signerData,
      });

      await this.persistStampedDocument(document, stampedBytes);
    } catch (err) {
      console.warn('[ProcessFlowParticipantActionUseCase] Consolidated PDF stamping failed (non-critical):', err);
    }
  }

  /**
   * Guarda el PDF consolidado como un archivo nuevo (nunca sobrescribe el original) y
   * archiva la versión previa del documento, para poder compararlas o recuperar el
   * original ante cualquier error — mismo patrón que ya usa UpdateDocumentUseCase al
   * reemplazar el archivo de un documento.
   */
  private async persistStampedDocument(document: Document, stampedBytes: Buffer): Promise<void> {
    if (!this.fileRepository) return;

    const previousDocumentUrl = document.documentUrl;
    if (!previousDocumentUrl) return;

    const originalFile = await this.fileRepository.findById(previousDocumentUrl).catch(() => null);
    const fileName = originalFile?.originalName ?? `${document.name}.pdf`;

    const newFile = await this.fileRepository.saveBuffer(stampedBytes, fileName, 'application/pdf');

    const archived = this.documentVersioningService
      ? await this.documentVersioningService.archiveCurrentFileVersion(
        document,
        'Versión reemplazada automáticamente al estampar la firma.',
      )
      : null;

    document.updateDocumentUrl(newFile.id);
    if (archived) {
      document.previousVersionId = archived.id;
    }
    await this.documentRepository.update(document);

    if (archived && this.documentVersioningService) {
      await this.documentVersioningService.recordFileReplacedHistory({
        liveDocument: document,
        archivedDocument: archived,
        previousDocumentUrl,
        action: DocumentAction.VERSION_SUPERSEDED,
        updatedByName: 'Sistema',
        comment: 'Todos los firmantes completaron la firma.',
      });
    }
  }

  private async loadSignatureImageBytes(fileId: string | null): Promise<Buffer | undefined> {
    if (!fileId || !this.fileRepository) return undefined;
    try {
      const file = await this.fileRepository.findById(fileId);
      if (!file) return undefined;
      return await this.fileRepository.getContent(file);
    } catch (err) {
      console.warn('[ProcessFlowParticipantActionUseCase] No se pudo cargar la imagen de la firma (no crítico):', err);
      return undefined;
    }
  }

  private async notifyExternalParticipants(
    participants: SignatureFlowParticipant[],
    documentName: string,
    reminderConfig?: ReminderConfig,
  ): Promise<void> {
    for (const p of participants) {
      await this.notificationService.refreshTokenAndNotifyExternalParticipant(
        p,
        documentName,
        undefined,
        undefined,
        reminderConfig,
      );
    }
  }

  private async resolvePdfPath(documentUrl: string): Promise<StampTarget | null> {
    if (documentUrl.toLowerCase().endsWith('.pdf')) return { storage: 'local', path: documentUrl };
    if (!this.fileRepository) return null;

    const file = await this.fileRepository.findById(documentUrl);
    if (!file) return null;

    const isPdf = (file.mimeType ?? '').toLowerCase().includes('pdf')
      || file.originalName.toLowerCase().endsWith('.pdf')
      || file.path.toLowerCase().endsWith('.pdf');

    if (!isPdf) return null;
    return { storage: file.storage, path: file.path };
  }
}
