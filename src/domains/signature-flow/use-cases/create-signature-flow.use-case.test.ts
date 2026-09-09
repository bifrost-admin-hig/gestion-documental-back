///<reference types="bun" />
import { describe, it, expect } from 'bun:test';
import { CreateSignatureFlowUseCase, CreateSignatureFlowInput } from './create-signature-flow.use-case';
import { SignatureFlow } from '../entities/signature-flow.entity';
import { SignatureFlowParticipant } from '../entities/signature-flow-participant.entity';
import { Document } from '@domains/document/entities/document.entity';
import { DocumentStatus } from '@domains/document/value-objects/document-enums';
import { SignatureFlowStatus } from '../value-objects/signature-flow-enums';
import { ValidationError, NotFoundError } from '@shared/domain/errors';
import { type SignatureFlowRepository } from '../repositories/signature-flow.repository';
import { type SignatureFlowParticipantRepository } from '../repositories/signature-flow-participant.repository';
import { type DocumentRepository } from '@domains/document/repositories/document.repository';
import { type DocumentHistoryRepository } from '@domains/document/repositories/document-history.repository';
import { type ColaboratorRepository } from '@domains/colaborators/repositories/colaborator.repository';
import { type SignatureFlowNotificationService } from '../services/signature-flow-notification.service';

function makeDocument(overrides: Partial<{ status: DocumentStatus; expirationDate: Date | null }> = {}): Document {
  return Document.create({
    documentModelId: 'model-1',
    name: 'Documento de prueba',
    groupId: 1,
    status: overrides.status ?? DocumentStatus.DRAFT,
    expirationDate: overrides.expirationDate === undefined ? null : overrides.expirationDate,
  });
}

function makeFlowRepository(): SignatureFlowRepository {
  return {
    save: async (flow: SignatureFlow) => flow,
  } as unknown as SignatureFlowRepository;
}

function makeParticipantRepository(): SignatureFlowParticipantRepository {
  return {
    save: async (p: SignatureFlowParticipant) => p,
  } as unknown as SignatureFlowParticipantRepository;
}

function makeDocumentRepository(document: Document): DocumentRepository {
  return {
    findById: async (id: string) => (id === document.id ? document : null),
    update: async (doc: Document & { id: string }) => doc,
  } as unknown as DocumentRepository;
}

function makeDocumentHistoryRepository(): DocumentHistoryRepository {
  return {
    save: async (entry: unknown) => entry,
  } as unknown as DocumentHistoryRepository;
}

function makeColaboratorRepository(): ColaboratorRepository {
  return {
    findById: async () => null,
  } as unknown as ColaboratorRepository;
}

function makeNotificationService(): SignatureFlowNotificationService {
  return {
    pickParticipantsToNotify: (_orderType: unknown, participants: unknown[]) => participants,
    notifyParticipantsForCurrentStep: async () => {},
    refreshTokenAndNotifyExternalParticipant: async () => {},
  } as unknown as SignatureFlowNotificationService;
}

function buildUseCase(document: Document): CreateSignatureFlowUseCase {
  return new CreateSignatureFlowUseCase(
    makeFlowRepository(),
    makeParticipantRepository(),
    makeDocumentRepository(document),
    makeDocumentHistoryRepository(),
    makeNotificationService(),
    makeColaboratorRepository(),
  );
}

function baseInput(documentId: string, overrides: Partial<CreateSignatureFlowInput> = {}): CreateSignatureFlowInput {
  return {
    documentId,
    participants: [{ userId: 'user-1', role: 'signer' }],
    ...overrides,
  };
}

describe('CreateSignatureFlowUseCase', () => {
  it('rechaza si no hay participantes', async () => {
    const document = makeDocument();
    const useCase = buildUseCase(document);
    await expect(useCase.execute({ documentId: document.id, participants: [] })).rejects.toThrow(ValidationError);
  });

  it('rechaza si el documento no existe', async () => {
    const document = makeDocument();
    const useCase = buildUseCase(document);
    await expect(useCase.execute(baseInput('otro-id'))).rejects.toThrow(NotFoundError);
  });

  it('rechaza si el documento no está en un estado válido para iniciar firma', async () => {
    const document = makeDocument({ status: DocumentStatus.SIGNED });
    const useCase = buildUseCase(document);
    await expect(useCase.execute(baseInput(document.id))).rejects.toThrow(ValidationError);
  });

  it('rechaza un recordatorio de menos de 1 día', async () => {
    const document = makeDocument();
    const useCase = buildUseCase(document);
    await expect(useCase.execute(baseInput(document.id, {
      reminderEnabled: true,
      reminderIntervalMinutes: 60,
    }))).rejects.toThrow('El tiempo del recordatorio debe ser de al menos 1 día');
  });

  it('rechaza un cierre automático de menos de 1 día', async () => {
    const document = makeDocument();
    const useCase = buildUseCase(document);
    await expect(useCase.execute(baseInput(document.id, {
      autoCloseEnabled: true,
      autoCloseIntervalMinutes: 60,
    }))).rejects.toThrow('El tiempo de cierre automático debe ser de al menos 1 día');
  });

  it('acepta un recordatorio y cierre automático de al menos 1 día', async () => {
    const document = makeDocument();
    const useCase = buildUseCase(document);
    const flow = await useCase.execute(baseInput(document.id, {
      reminderEnabled: true,
      reminderIntervalMinutes: 1440,
      autoCloseEnabled: true,
      autoCloseIntervalMinutes: 1440,
    }));
    expect(flow.reminderEnabled).toBe(true);
    expect(flow.autoCloseEnabled).toBe(true);
  });

  it('inicia en revisión si hay validadores, y en firma si no los hay', async () => {
    // Documentos separados: al iniciar un flujo el documento deja de estar en un estado que
    // permita iniciar otro, así que no se puede reusar el mismo para dos llamadas.
    const documentWithValidator = makeDocument();
    const withValidator = await buildUseCase(documentWithValidator).execute(baseInput(documentWithValidator.id, {
      participants: [{ userId: 'user-1', role: 'validator' }, { userId: 'user-2', role: 'signer' }],
    }));
    expect(withValidator.status).toBe(SignatureFlowStatus.IN_REVIEW);

    const documentWithoutValidator = makeDocument();
    const withoutValidator = await buildUseCase(documentWithoutValidator).execute(baseInput(documentWithoutValidator.id));
    expect(withoutValidator.status).toBe(SignatureFlowStatus.IN_SIGNING);
  });

  describe('límite por vencimiento del documento', () => {
    it('desactiva el recordatorio si se dispararía después del vencimiento', async () => {
      const expirationDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // vence en 2 días
      const document = makeDocument({ expirationDate });
      const useCase = buildUseCase(document);

      const flow = await useCase.execute(baseInput(document.id, {
        reminderEnabled: true,
        reminderIntervalMinutes: 5 * 24 * 60, // recordatorio a 5 días — después del vencimiento
      }));

      expect(flow.reminderEnabled).toBe(false);
    });

    it('mantiene el recordatorio si se dispara antes del vencimiento', async () => {
      const expirationDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // vence en 10 días
      const document = makeDocument({ expirationDate });
      const useCase = buildUseCase(document);

      const flow = await useCase.execute(baseInput(document.id, {
        reminderEnabled: true,
        reminderIntervalMinutes: 2 * 24 * 60, // recordatorio a 2 días — bien antes del vencimiento
      }));

      expect(flow.reminderEnabled).toBe(true);
      expect(flow.reminderIntervalMinutes).toBe(2 * 24 * 60);
    });

    it('reprograma el cierre automático 10 días antes del vencimiento si caería en o después', async () => {
      const expirationDate = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000); // vence en 20 días
      const document = makeDocument({ expirationDate });
      const useCase = buildUseCase(document);

      const flow = await useCase.execute(baseInput(document.id, {
        autoCloseEnabled: true,
        autoCloseIntervalMinutes: 30 * 24 * 60, // 30 días — después del vencimiento
      }));

      expect(flow.autoCloseEnabled).toBe(true);
      // Document normaliza expirationDate a medianoche (solo fecha, sin hora) al construirse —
      // el valor esperado se calcula contra document.expirationDate ya normalizado, no contra
      // la fecha con hora que se pasó al crear el documento.
      const expectedMinutes = Math.round(
        (document.expirationDate!.getTime() - 10 * 24 * 60 * 60 * 1000 - Date.now()) / (60 * 1000),
      );
      expect(Math.abs(flow.autoCloseIntervalMinutes - expectedMinutes)).toBeLessThan(2);
      // Y en cualquier caso debe quedar estrictamente antes del vencimiento.
      const firesAt = Date.now() + flow.autoCloseIntervalMinutes * 60 * 1000;
      expect(firesAt).toBeLessThan(document.expirationDate!.getTime());
    });

    it('no deja el cierre automático por debajo del mínimo de 1 día aunque el vencimiento esté muy cerca', async () => {
      const expirationDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // vence en 3 días (menos que el buffer de 10)
      const document = makeDocument({ expirationDate });
      const useCase = buildUseCase(document);

      const flow = await useCase.execute(baseInput(document.id, {
        autoCloseEnabled: true,
        autoCloseIntervalMinutes: 5 * 24 * 60,
      }));

      expect(flow.autoCloseIntervalMinutes).toBe(1440);
    });

    it('mantiene el cierre automático si vence bien antes del vencimiento del documento', async () => {
      const expirationDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const document = makeDocument({ expirationDate });
      const useCase = buildUseCase(document);

      const flow = await useCase.execute(baseInput(document.id, {
        autoCloseEnabled: true,
        autoCloseIntervalMinutes: 5 * 24 * 60,
      }));

      expect(flow.autoCloseIntervalMinutes).toBe(5 * 24 * 60);
    });

    it('no aplica ningún límite si el documento no tiene fecha de vencimiento', async () => {
      const document = makeDocument({ expirationDate: null });
      const useCase = buildUseCase(document);

      const flow = await useCase.execute(baseInput(document.id, {
        reminderEnabled: true,
        reminderIntervalMinutes: 365 * 24 * 60,
        autoCloseEnabled: true,
        autoCloseIntervalMinutes: 365 * 24 * 60,
      }));

      expect(flow.reminderEnabled).toBe(true);
      expect(flow.autoCloseIntervalMinutes).toBe(365 * 24 * 60);
    });
  });
});
