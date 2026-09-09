///<reference types="bun" />
import { describe, it, expect } from 'bun:test';
import {
  isParticipantEnabledInCurrentStep,
  getCurrentlyEnabledParticipants,
  computeEnabledSince,
  orderTypeForRole,
} from './signature-flow-step.util';
import { SignatureFlow } from '../entities/signature-flow.entity';
import { SignatureFlowParticipant } from '../entities/signature-flow-participant.entity';
import {
  SignatureFlowOrderType,
  SignatureFlowParticipantRole,
  SignatureFlowParticipantStatus,
  SignatureFlowStatus,
} from '../value-objects/signature-flow-enums';

const FLOW_ID = 'flow-1';

function makeFlow(overrides: Partial<{
  status: SignatureFlowStatus;
  orderType: SignatureFlowOrderType;
  signerOrderType: SignatureFlowOrderType;
  sentAt: Date | null;
}> = {}): SignatureFlow {
  return SignatureFlow.create({
    documentId: 'doc-1',
    status: overrides.status ?? SignatureFlowStatus.IN_SIGNING,
    orderType: overrides.orderType ?? SignatureFlowOrderType.PARALLEL,
    signerOrderType: overrides.signerOrderType ?? SignatureFlowOrderType.PARALLEL,
    sentAt: overrides.sentAt === undefined ? new Date('2026-01-01T10:00:00Z') : overrides.sentAt,
  });
}

function makeParticipant(overrides: Partial<{
  id: string;
  role: SignatureFlowParticipantRole;
  order: number | null;
  status: SignatureFlowParticipantStatus;
  actionAt: Date | null;
}> = {}): SignatureFlowParticipant {
  return SignatureFlowParticipant.create({
    id: overrides.id,
    flowId: FLOW_ID,
    externalEmail: 'someone@example.com',
    role: overrides.role ?? SignatureFlowParticipantRole.SIGNER,
    order: overrides.order === undefined ? null : overrides.order,
    status: overrides.status ?? SignatureFlowParticipantStatus.PENDING,
    actionAt: overrides.actionAt === undefined ? null : overrides.actionAt,
  });
}

describe('orderTypeForRole', () => {
  it('usa signerOrderType para firmantes y orderType para validadores', () => {
    const flow = makeFlow({ orderType: SignatureFlowOrderType.SEQUENTIAL, signerOrderType: SignatureFlowOrderType.PARALLEL });
    expect(orderTypeForRole(flow, SignatureFlowParticipantRole.SIGNER)).toBe(SignatureFlowOrderType.PARALLEL);
    expect(orderTypeForRole(flow, SignatureFlowParticipantRole.VALIDATOR)).toBe(SignatureFlowOrderType.SEQUENTIAL);
  });
});

describe('isParticipantEnabledInCurrentStep', () => {
  it('en paralelo siempre está habilitado, sin importar el estado de los demás', () => {
    const p = makeParticipant({ order: 2 });
    const others = [makeParticipant({ order: 1, status: SignatureFlowParticipantStatus.PENDING })];
    expect(isParticipantEnabledInCurrentStep(SignatureFlowOrderType.PARALLEL, p, [p, ...others])).toBe(true);
  });

  it('en secuencial, sin order asignado, está habilitado', () => {
    const p = makeParticipant({ order: null });
    expect(isParticipantEnabledInCurrentStep(SignatureFlowOrderType.SEQUENTIAL, p, [p])).toBe(true);
  });

  it('en secuencial, es el de menor order entre los pendientes', () => {
    const p1 = makeParticipant({ order: 1 });
    const p2 = makeParticipant({ order: 2 });
    const all = [p1, p2];
    expect(isParticipantEnabledInCurrentStep(SignatureFlowOrderType.SEQUENTIAL, p1, all)).toBe(true);
    expect(isParticipantEnabledInCurrentStep(SignatureFlowOrderType.SEQUENTIAL, p2, all)).toBe(false);
  });

  it('en secuencial, deja de estar habilitado el segundo una vez que el primero avanza', () => {
    const p1 = makeParticipant({ order: 1, status: SignatureFlowParticipantStatus.SIGNED });
    const p2 = makeParticipant({ order: 2 });
    const all = [p1, p2];
    expect(isParticipantEnabledInCurrentStep(SignatureFlowOrderType.SEQUENTIAL, p2, all)).toBe(true);
  });

  it('en secuencial, no compara contra participantes de otro rol', () => {
    const validator = makeParticipant({ role: SignatureFlowParticipantRole.VALIDATOR, order: 1 });
    const signer = makeParticipant({ role: SignatureFlowParticipantRole.SIGNER, order: 2 });
    const all = [validator, signer];
    // El firmante no debería quedar bloqueado por el order del validador (roles distintos).
    expect(isParticipantEnabledInCurrentStep(SignatureFlowOrderType.SEQUENTIAL, signer, all)).toBe(true);
  });
});

describe('getCurrentlyEnabledParticipants', () => {
  it('en revisión devuelve solo validadores pendientes habilitados', () => {
    const flow = makeFlow({ status: SignatureFlowStatus.IN_REVIEW });
    const validator = makeParticipant({ role: SignatureFlowParticipantRole.VALIDATOR });
    const signer = makeParticipant({ role: SignatureFlowParticipantRole.SIGNER });
    const result = getCurrentlyEnabledParticipants(flow, [validator, signer]);
    expect(result).toEqual([validator]);
  });

  it('en firma devuelve solo firmantes pendientes habilitados', () => {
    const flow = makeFlow({ status: SignatureFlowStatus.IN_SIGNING });
    const validator = makeParticipant({ role: SignatureFlowParticipantRole.VALIDATOR, status: SignatureFlowParticipantStatus.APPROVED });
    const signer = makeParticipant({ role: SignatureFlowParticipantRole.SIGNER });
    const result = getCurrentlyEnabledParticipants(flow, [validator, signer]);
    expect(result).toEqual([signer]);
  });

  it('en firma secuencial devuelve solo al firmante de menor order', () => {
    const flow = makeFlow({ status: SignatureFlowStatus.IN_SIGNING, signerOrderType: SignatureFlowOrderType.SEQUENTIAL });
    const s1 = makeParticipant({ order: 1 });
    const s2 = makeParticipant({ order: 2 });
    const result = getCurrentlyEnabledParticipants(flow, [s1, s2]);
    expect(result).toEqual([s1]);
  });

  it('en estados sin rol activo (draft, cerrado, etc.) devuelve vacío', () => {
    const flow = makeFlow({ status: SignatureFlowStatus.CLOSED });
    const signer = makeParticipant();
    expect(getCurrentlyEnabledParticipants(flow, [signer])).toEqual([]);
  });

  it('ignora participantes que ya actuaron', () => {
    const flow = makeFlow({ status: SignatureFlowStatus.IN_SIGNING });
    const signed = makeParticipant({ status: SignatureFlowParticipantStatus.SIGNED });
    expect(getCurrentlyEnabledParticipants(flow, [signed])).toEqual([]);
  });
});

describe('computeEnabledSince', () => {
  const sentAt = new Date('2026-01-01T10:00:00Z');

  it('validador en paralelo: desde el envío del flujo', () => {
    const flow = makeFlow({ status: SignatureFlowStatus.IN_REVIEW, orderType: SignatureFlowOrderType.PARALLEL, sentAt });
    const validator = makeParticipant({ role: SignatureFlowParticipantRole.VALIDATOR });
    expect(computeEnabledSince(flow, validator, [validator])).toEqual(sentAt);
  });

  it('validador secuencial, primero en la fila: desde el envío del flujo', () => {
    const flow = makeFlow({ status: SignatureFlowStatus.IN_REVIEW, orderType: SignatureFlowOrderType.SEQUENTIAL, sentAt });
    const v1 = makeParticipant({ role: SignatureFlowParticipantRole.VALIDATOR, order: 1 });
    expect(computeEnabledSince(flow, v1, [v1])).toEqual(sentAt);
  });

  it('validador secuencial, segundo en la fila: desde que el anterior aprobó', () => {
    const flow = makeFlow({ status: SignatureFlowStatus.IN_REVIEW, orderType: SignatureFlowOrderType.SEQUENTIAL, sentAt });
    const approvedAt = new Date('2026-01-02T09:00:00Z');
    const v1 = makeParticipant({ role: SignatureFlowParticipantRole.VALIDATOR, order: 1, status: SignatureFlowParticipantStatus.APPROVED, actionAt: approvedAt });
    const v2 = makeParticipant({ role: SignatureFlowParticipantRole.VALIDATOR, order: 2 });
    expect(computeEnabledSince(flow, v2, [v1, v2])).toEqual(approvedAt);
  });

  it('validador secuencial, segundo en la fila pero el anterior sigue pendiente: null', () => {
    const flow = makeFlow({ status: SignatureFlowStatus.IN_REVIEW, orderType: SignatureFlowOrderType.SEQUENTIAL, sentAt });
    const v1 = makeParticipant({ role: SignatureFlowParticipantRole.VALIDATOR, order: 1 });
    const v2 = makeParticipant({ role: SignatureFlowParticipantRole.VALIDATOR, order: 2 });
    expect(computeEnabledSince(flow, v2, [v1, v2])).toBeNull();
  });

  it('firmante sin validadores: desde el envío del flujo', () => {
    const flow = makeFlow({ status: SignatureFlowStatus.IN_SIGNING, sentAt });
    const signer = makeParticipant();
    expect(computeEnabledSince(flow, signer, [signer])).toEqual(sentAt);
  });

  it('firmante con validadores: desde que el último validador aprobó, no desde el envío original', () => {
    const flow = makeFlow({ status: SignatureFlowStatus.IN_SIGNING, sentAt });
    const approvedAt = new Date('2026-01-05T12:00:00Z');
    const validator = makeParticipant({ role: SignatureFlowParticipantRole.VALIDATOR, status: SignatureFlowParticipantStatus.APPROVED, actionAt: approvedAt });
    const signer = makeParticipant();
    expect(computeEnabledSince(flow, signer, [validator, signer])).toEqual(approvedAt);
    // No debe ser igual al envío original — esto es justamente lo que evita que un firmante
    // quede con menos tiempo del configurado cuando la revisión tarda.
    expect(computeEnabledSince(flow, signer, [validator, signer])).not.toEqual(sentAt);
  });

  it('firmante secuencial, segundo en la fila: desde que el anterior firmó o fue saltado', () => {
    const flow = makeFlow({ status: SignatureFlowStatus.IN_SIGNING, signerOrderType: SignatureFlowOrderType.SEQUENTIAL, sentAt });
    const skippedAt = new Date('2026-01-03T08:00:00Z');
    const s1 = makeParticipant({ order: 1, status: SignatureFlowParticipantStatus.SKIPPED, actionAt: skippedAt });
    const s2 = makeParticipant({ order: 2 });
    expect(computeEnabledSince(flow, s2, [s1, s2])).toEqual(skippedAt);
  });
});
