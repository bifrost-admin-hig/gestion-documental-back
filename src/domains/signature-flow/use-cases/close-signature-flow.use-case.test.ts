///<reference types="bun" />
import { describe, it, expect } from 'bun:test';
import {
  SkipSignerUseCase,
  CloseSignatureFlowUseCase,
  ReopenSignatureFlowUseCase,
  AutoRejectValidatorUseCase,
} from './close-signature-flow.use-case';
import { SignatureFlow } from '../entities/signature-flow.entity';
import { SignatureFlowParticipant } from '../entities/signature-flow-participant.entity';
import {
  SignatureFlowOrderType,
  SignatureFlowParticipantRole,
  SignatureFlowParticipantStatus,
  SignatureFlowStatus,
} from '../value-objects/signature-flow-enums';
import { Document } from '@domains/document/entities/document.entity';
import { DocumentStatus } from '@domains/document/value-objects/document-enums';
import { ForbiddenError, NotFoundError, ValidationError } from '@shared/domain/errors';
import { type SignatureFlowRepository } from '../repositories/signature-flow.repository';
import { type SignatureFlowParticipantRepository } from '../repositories/signature-flow-participant.repository';
import { type DocumentRepository } from '@domains/document/repositories/document.repository';
import { type DocumentHistoryRepository } from '@domains/document/repositories/document-history.repository';
import { type SignatureFlowNotificationService } from '../services/signature-flow-notification.service';
import { type ProcessFlowParticipantActionUseCase } from './progress-signature-flow.use-case';

const SENDER_ID = 'sender-1';

function makeFlow(overrides: Partial<{
  status: SignatureFlowStatus;
  signerOrderType: SignatureFlowOrderType;
  sentBy: string | null;
  autoCloseEnabled: boolean;
  documentId: string;
}> = {}): SignatureFlow {
  return SignatureFlow.create({
    documentId: overrides.documentId ?? 'doc-1',
    status: overrides.status ?? SignatureFlowStatus.IN_SIGNING,
    signerOrderType: overrides.signerOrderType ?? SignatureFlowOrderType.SEQUENTIAL,
    sentBy: overrides.sentBy === undefined ? SENDER_ID : overrides.sentBy,
    autoCloseEnabled: overrides.autoCloseEnabled ?? true,
    sentAt: new Date(),
  });
}

function makeParticipant(overrides: Partial<{
  role: SignatureFlowParticipantRole;
  order: number | null;
  status: SignatureFlowParticipantStatus;
  flowId: string;
}> = {}): SignatureFlowParticipant {
  return SignatureFlowParticipant.create({
    flowId: overrides.flowId ?? 'flow-1',
    externalEmail: 'signer@example.com',
    role: overrides.role ?? SignatureFlowParticipantRole.SIGNER,
    order: overrides.order === undefined ? null : overrides.order,
    status: overrides.status ?? SignatureFlowParticipantStatus.PENDING,
  });
}

function makeDocument(overrides: Partial<{ preFlowStatus: DocumentStatus | null; status: DocumentStatus }> = {}): Document {
  // Mismo id que el documentId por defecto de makeFlow() — deben coincidir para que
  // documentRepository.findById(flow.documentId) encuentre este documento.
  const doc = Document.create({
    id: 'doc-1',
    documentModelId: 'model-1',
    name: 'Documento',
    groupId: 1,
    status: overrides.status ?? DocumentStatus.IN_SIGNING,
  });
  if (overrides.preFlowStatus !== undefined) doc.preFlowStatus = overrides.preFlowStatus;
  return doc;
}

function makeFlowRepository(flow: SignatureFlow): SignatureFlowRepository {
  let current = flow;
  return {
    findById: async (id: string) => (id === current.id ? current : null),
    update: async (f: SignatureFlow) => { current = f; return f; },
  } as unknown as SignatureFlowRepository;
}

function makeParticipantRepository(participants: SignatureFlowParticipant[]): SignatureFlowParticipantRepository {
  const byId = new Map(participants.map((p) => [p.id, p]));
  return {
    findById: async (id: string) => byId.get(id) ?? null,
    findByFlowId: async (flowId: string) => [...byId.values()].filter((p) => p.flowId === flowId),
    update: async (p: SignatureFlowParticipant) => { byId.set(p.id, p); return p; },
  } as unknown as SignatureFlowParticipantRepository;
}

function makeDocumentRepository(document: Document): DocumentRepository {
  let current = document;
  return {
    findById: async (id: string) => (id === current.id ? current : null),
    update: async (d: Document & { id: string }) => { current = d; return d; },
  } as unknown as DocumentRepository;
}

function makeDocumentHistoryRepository(): DocumentHistoryRepository {
  return {
    save: async (entry: unknown) => entry,
  } as unknown as DocumentHistoryRepository;
}

function makeNotificationService(): SignatureFlowNotificationService {
  return {
    cancelReminder: async () => {},
    notifyParticipantSkipped: async () => {},
    notifyResponsibleOnClose: async () => {},
    notifyResponsibleOnReopen: async () => {},
    notifyParticipantsForCurrentStep: async () => {},
    pickParticipantsToNotify: (_orderType: unknown, participants: unknown[]) => participants,
    refreshTokenAndNotifyExternalParticipant: async () => {},
    notifyValidatorAutoRejected: async () => {},
  } as unknown as SignatureFlowNotificationService;
}

function makeReconcileSpy(): ProcessFlowParticipantActionUseCase & { calls: string[] } {
  const calls: string[] = [];
  return {
    reconcileFlow: async (flowId: string) => { calls.push(flowId); },
    calls,
  } as unknown as ProcessFlowParticipantActionUseCase & { calls: string[] };
}

describe('SkipSignerUseCase', () => {
  function build(flow: SignatureFlow, participants: SignatureFlowParticipant[], document: Document) {
    return new SkipSignerUseCase(
      makeFlowRepository(flow),
      makeParticipantRepository(participants),
      makeDocumentRepository(document),
      makeDocumentHistoryRepository(),
      makeNotificationService(),
      makeReconcileSpy(),
    );
  }

  it('rechaza si quien actúa no envió el flujo ni tiene el permiso de administrador', async () => {
    const flow = makeFlow();
    const s1 = makeParticipant({ order: 1, flowId: flow.id });
    const s2 = makeParticipant({ order: 2, flowId: flow.id });
    const useCase = build(flow, [s1, s2], makeDocument());

    await expect(useCase.execute({
      flowId: flow.id,
      actorUserId: 'otro-usuario',
      comment: 'motivo',
    })).rejects.toThrow(ForbiddenError);
  });

  it('permite la acción si quien actúa es quien envió el flujo', async () => {
    const flow = makeFlow();
    const s1 = makeParticipant({ order: 1, flowId: flow.id });
    const s2 = makeParticipant({ order: 2, flowId: flow.id });
    const useCase = build(flow, [s1, s2], makeDocument());

    await useCase.execute({ flowId: flow.id, actorUserId: SENDER_ID, comment: 'motivo' });
    expect(s1.status).toBe(SignatureFlowParticipantStatus.SKIPPED);
  });

  it('permite la acción a un administrador con el permiso, aunque no sea quien envió', async () => {
    const flow = makeFlow();
    const s1 = makeParticipant({ order: 1, flowId: flow.id });
    const s2 = makeParticipant({ order: 2, flowId: flow.id });
    const useCase = build(flow, [s1, s2], makeDocument());

    await useCase.execute({ flowId: flow.id, actorUserId: 'admin-1', actorCanCloseAny: true, comment: 'motivo' });
    expect(s1.status).toBe(SignatureFlowParticipantStatus.SKIPPED);
  });

  it('permite la acción automática del sistema (actorUserId null) sin dueño', async () => {
    const flow = makeFlow();
    const s1 = makeParticipant({ order: 1, flowId: flow.id });
    const s2 = makeParticipant({ order: 2, flowId: flow.id });
    const useCase = build(flow, [s1, s2], makeDocument());

    await useCase.execute({ flowId: flow.id, actorUserId: null, comment: 'motivo' });
    expect(s1.status).toBe(SignatureFlowParticipantStatus.SKIPPED);
  });

  it('rechaza si el flujo no está en etapa de firma', async () => {
    const flow = makeFlow({ status: SignatureFlowStatus.IN_REVIEW });
    const useCase = build(flow, [], makeDocument());

    await expect(useCase.execute({
      flowId: flow.id,
      actorUserId: SENDER_ID,
      comment: 'motivo',
    })).rejects.toThrow(ValidationError);
  });

  it('rechaza si no se indica un motivo', async () => {
    const flow = makeFlow();
    const s1 = makeParticipant({ order: 1, flowId: flow.id });
    const useCase = build(flow, [s1], makeDocument());

    await expect(useCase.execute({ flowId: flow.id, actorUserId: SENDER_ID, comment: '   ' }))
      .rejects.toThrow('Debes indicar un motivo');
  });

  it('rechaza si el flujo de firma no es secuencial', async () => {
    const flow = makeFlow({ signerOrderType: SignatureFlowOrderType.PARALLEL });
    const s1 = makeParticipant({ order: 1, flowId: flow.id });
    const useCase = build(flow, [s1], makeDocument());

    await expect(useCase.execute({ flowId: flow.id, actorUserId: SENDER_ID, comment: 'motivo' }))
      .rejects.toThrow('Saltar firmante solo aplica a flujos de firma secuenciales');
  });

  it('rechaza saltar al último firmante pendiente (hay que usar "cerrar" en su lugar)', async () => {
    const flow = makeFlow();
    const onlySigner = makeParticipant({ order: 1, flowId: flow.id });
    const useCase = build(flow, [onlySigner], makeDocument());

    await expect(useCase.execute({ flowId: flow.id, actorUserId: SENDER_ID, comment: 'motivo' }))
      .rejects.toThrow('No quedan más firmantes');
  });

  it('salta al firmante actual y deja al siguiente pendiente sin tocar', async () => {
    const flow = makeFlow();
    const s1 = makeParticipant({ order: 1, flowId: flow.id });
    const s2 = makeParticipant({ order: 2, flowId: flow.id });
    const reconcile = makeReconcileSpy();
    const useCase = new SkipSignerUseCase(
      makeFlowRepository(flow),
      makeParticipantRepository([s1, s2]),
      makeDocumentRepository(makeDocument()),
      makeDocumentHistoryRepository(),
      makeNotificationService(),
      reconcile,
    );

    await useCase.execute({ flowId: flow.id, actorUserId: SENDER_ID, comment: 'no respondió a tiempo' });

    expect(s1.status).toBe(SignatureFlowParticipantStatus.SKIPPED);
    expect(s1.rejectionComment).toBe('no respondió a tiempo');
    expect(s2.status).toBe(SignatureFlowParticipantStatus.PENDING);
    expect(reconcile.calls).toEqual([flow.id]);
  });
});

describe('CloseSignatureFlowUseCase', () => {
  it('rechaza si quien actúa no envió el flujo ni tiene el permiso de administrador', async () => {
    const flow = makeFlow();
    const useCase = new CloseSignatureFlowUseCase(
      makeFlowRepository(flow),
      makeParticipantRepository([]),
      makeDocumentRepository(makeDocument()),
      makeDocumentHistoryRepository(),
      makeNotificationService(),
    );

    await expect(useCase.execute({ flowId: flow.id, actorUserId: 'otro', comment: 'motivo' }))
      .rejects.toThrow(ForbiddenError);
  });

  it('rechaza si no hay firmantes pendientes', async () => {
    const flow = makeFlow();
    const signed = makeParticipant({ order: 1, flowId: flow.id, status: SignatureFlowParticipantStatus.SIGNED });
    const useCase = new CloseSignatureFlowUseCase(
      makeFlowRepository(flow),
      makeParticipantRepository([signed]),
      makeDocumentRepository(makeDocument()),
      makeDocumentHistoryRepository(),
      makeNotificationService(),
    );

    await expect(useCase.execute({ flowId: flow.id, actorUserId: SENDER_ID, comment: 'motivo' }))
      .rejects.toThrow('No hay firmantes pendientes para cerrar');
  });

  it('salta a todos los firmantes pendientes y cierra el flujo', async () => {
    const flow = makeFlow();
    const s1 = makeParticipant({ order: 1, flowId: flow.id });
    const s2 = makeParticipant({ order: 2, flowId: flow.id });
    const useCase = new CloseSignatureFlowUseCase(
      makeFlowRepository(flow),
      makeParticipantRepository([s1, s2]),
      makeDocumentRepository(makeDocument()),
      makeDocumentHistoryRepository(),
      makeNotificationService(),
    );

    await useCase.execute({ flowId: flow.id, actorUserId: SENDER_ID, comment: 'se venció el plazo' });

    expect(s1.status).toBe(SignatureFlowParticipantStatus.SKIPPED);
    expect(s2.status).toBe(SignatureFlowParticipantStatus.SKIPPED);
    expect(flow.status).toBe(SignatureFlowStatus.CLOSED);
  });

  it('restaura el documento a "aprobado" si ese era su estado antes del flujo', async () => {
    const flow = makeFlow();
    const s1 = makeParticipant({ order: 1, flowId: flow.id });
    const document = makeDocument({ preFlowStatus: DocumentStatus.APPROVED });
    const useCase = new CloseSignatureFlowUseCase(
      makeFlowRepository(flow),
      makeParticipantRepository([s1]),
      makeDocumentRepository(document),
      makeDocumentHistoryRepository(),
      makeNotificationService(),
    );

    await useCase.execute({ flowId: flow.id, actorUserId: SENDER_ID, comment: 'motivo' });

    expect(document.status).toBe(DocumentStatus.APPROVED);
    expect(document.preFlowStatus).toBeNull();
  });

  it('deja el documento como "cierre sin firmar" si no venía aprobado', async () => {
    const flow = makeFlow();
    const s1 = makeParticipant({ order: 1, flowId: flow.id });
    const document = makeDocument({ preFlowStatus: DocumentStatus.DRAFT });
    const useCase = new CloseSignatureFlowUseCase(
      makeFlowRepository(flow),
      makeParticipantRepository([s1]),
      makeDocumentRepository(document),
      makeDocumentHistoryRepository(),
      makeNotificationService(),
    );

    await useCase.execute({ flowId: flow.id, actorUserId: SENDER_ID, comment: 'motivo' });

    expect(document.status).toBe(DocumentStatus.SIGNATURE_CLOSED);
  });
});

describe('ReopenSignatureFlowUseCase', () => {
  function build(flow: SignatureFlow, participants: SignatureFlowParticipant[], document: Document) {
    return new ReopenSignatureFlowUseCase(
      makeFlowRepository(flow),
      makeParticipantRepository(participants),
      makeDocumentRepository(document),
      makeDocumentHistoryRepository(),
      makeNotificationService(),
    );
  }

  it('rechaza si el actor no tiene el permiso de reabrir', async () => {
    const flow = makeFlow({ status: SignatureFlowStatus.CLOSED });
    const useCase = build(flow, [], makeDocument());

    await expect(useCase.execute({
      flowId: flow.id,
      actorUserId: SENDER_ID,
      actorCanReopen: false,
      comment: 'motivo',
    })).rejects.toThrow(ForbiddenError);
  });

  it('rechaza si no se indica un motivo, incluso siendo administrador', async () => {
    const flow = makeFlow({ status: SignatureFlowStatus.CLOSED });
    const useCase = build(flow, [], makeDocument());

    await expect(useCase.execute({
      flowId: flow.id,
      actorUserId: 'admin-1',
      actorCanReopen: true,
      comment: '',
    })).rejects.toThrow(ValidationError);
  });

  it('rechaza si el flujo no existe', async () => {
    const flow = makeFlow({ status: SignatureFlowStatus.CLOSED });
    const useCase = build(flow, [], makeDocument());

    await expect(useCase.execute({
      flowId: 'otro-flujo',
      actorUserId: 'admin-1',
      actorCanReopen: true,
      comment: 'motivo',
    })).rejects.toThrow(NotFoundError);
  });

  it('rechaza si el flujo no está cerrado', async () => {
    const flow = makeFlow({ status: SignatureFlowStatus.IN_SIGNING });
    const useCase = build(flow, [], makeDocument());

    await expect(useCase.execute({
      flowId: flow.id,
      actorUserId: 'admin-1',
      actorCanReopen: true,
      comment: 'motivo',
    })).rejects.toThrow('El flujo no está cerrado');
  });

  it('rechaza si no hay firmantes saltados para reactivar', async () => {
    const flow = makeFlow({ status: SignatureFlowStatus.CLOSED });
    const signed = makeParticipant({ order: 1, flowId: flow.id, status: SignatureFlowParticipantStatus.SIGNED });
    const useCase = build(flow, [signed], makeDocument());

    await expect(useCase.execute({
      flowId: flow.id,
      actorUserId: 'admin-1',
      actorCanReopen: true,
      comment: 'motivo',
    })).rejects.toThrow('No hay firmantes para reactivar en este flujo');
  });

  it('reactiva a los firmantes saltados, reabre el flujo y desactiva el cierre automático', async () => {
    const flow = makeFlow({ status: SignatureFlowStatus.CLOSED, autoCloseEnabled: true });
    const skipped = makeParticipant({ order: 2, flowId: flow.id, status: SignatureFlowParticipantStatus.SKIPPED });
    const document = makeDocument({ status: DocumentStatus.SIGNATURE_CLOSED });
    const useCase = build(flow, [skipped], document);

    await useCase.execute({
      flowId: flow.id,
      actorUserId: 'admin-1',
      actorCanReopen: true,
      comment: 'se resuelve reabrir',
    });

    expect(skipped.status).toBe(SignatureFlowParticipantStatus.PENDING);
    expect(skipped.actionAt).toBeNull();
    expect(flow.status).toBe(SignatureFlowStatus.IN_SIGNING);
    expect(flow.autoCloseEnabled).toBe(false);
    expect(document.status).toBe(DocumentStatus.IN_SIGNING);
  });
});

describe('AutoRejectValidatorUseCase', () => {
  function build(flow: SignatureFlow | null, participants: SignatureFlowParticipant[], document: Document, reconcile = makeReconcileSpy()) {
    const flowRepo = flow
      ? makeFlowRepository(flow)
      : ({ findById: async () => null } as unknown as SignatureFlowRepository);
    return {
      useCase: new AutoRejectValidatorUseCase(
        flowRepo,
        makeParticipantRepository(participants),
        makeDocumentRepository(document),
        makeDocumentHistoryRepository(),
        makeNotificationService(),
        reconcile,
      ),
      reconcile,
    };
  }

  it('no hace nada si el flujo no existe', async () => {
    const { useCase, reconcile } = build(null, [], makeDocument());
    await useCase.execute({ flowId: 'no-existe', participantId: 'p-1', comment: 'motivo' });
    expect(reconcile.calls).toEqual([]);
  });

  it('no hace nada si el flujo no está en revisión', async () => {
    const flow = makeFlow({ status: SignatureFlowStatus.IN_SIGNING });
    const validator = makeParticipant({ role: SignatureFlowParticipantRole.VALIDATOR, order: 1, flowId: flow.id });
    const { useCase, reconcile } = build(flow, [validator], makeDocument());

    await useCase.execute({ flowId: flow.id, participantId: validator.id, comment: 'motivo' });

    expect(validator.status).toBe(SignatureFlowParticipantStatus.PENDING);
    expect(reconcile.calls).toEqual([]);
  });

  it('no hace nada si el participante no es un validador', async () => {
    const flow = makeFlow({ status: SignatureFlowStatus.IN_REVIEW });
    const signer = makeParticipant({ role: SignatureFlowParticipantRole.SIGNER, order: 1, flowId: flow.id });
    const { useCase, reconcile } = build(flow, [signer], makeDocument());

    await useCase.execute({ flowId: flow.id, participantId: signer.id, comment: 'motivo' });

    expect(signer.status).toBe(SignatureFlowParticipantStatus.PENDING);
    expect(reconcile.calls).toEqual([]);
  });

  it('no hace nada si el validador ya no está pendiente', async () => {
    const flow = makeFlow({ status: SignatureFlowStatus.IN_REVIEW });
    const validator = makeParticipant({
      role: SignatureFlowParticipantRole.VALIDATOR,
      order: 1,
      flowId: flow.id,
      status: SignatureFlowParticipantStatus.APPROVED,
    });
    const { useCase, reconcile } = build(flow, [validator], makeDocument());

    await useCase.execute({ flowId: flow.id, participantId: validator.id, comment: 'motivo' });

    expect(validator.status).toBe(SignatureFlowParticipantStatus.APPROVED);
    expect(reconcile.calls).toEqual([]);
  });

  it('rechaza al validador vencido y reconcilia el flujo', async () => {
    const flow = makeFlow({ status: SignatureFlowStatus.IN_REVIEW });
    const validator = makeParticipant({ role: SignatureFlowParticipantRole.VALIDATOR, order: 1, flowId: flow.id });
    const { useCase, reconcile } = build(flow, [validator], makeDocument());

    await useCase.execute({ flowId: flow.id, participantId: validator.id, comment: 'no actuó a tiempo' });

    expect(validator.status).toBe(SignatureFlowParticipantStatus.REJECTED);
    expect(validator.rejectionComment).toBe('no actuó a tiempo');
    expect(validator.actionAt).not.toBeNull();
    expect(reconcile.calls).toEqual([flow.id]);
  });
});
