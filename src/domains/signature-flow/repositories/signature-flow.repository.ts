import { SignatureFlow } from '../entities/signature-flow.entity';

export interface PendingSignatureDocumentsReportHolder {
  participantId: string;
  name: string;
}

export interface PendingSignatureDocumentsReportItem {
  flowId: string;
  documentId: string;
  documentName: string;
  documentStatus: string;
  documentTypeName: string | null;
  documentSubtypeName: string | null;
  contractNumber: string | null;
  sentAt: Date | null;
  sentBy: string | null;
  sentByName: string | null;
  currentHolders: PendingSignatureDocumentsReportHolder[];
}

export interface SignatureProcessTimeReportItem {
  flowId: string;
  documentId: string;
  documentName: string;
  sentAt: Date;
  signedAt: Date;
  elapsedDays: number;
}

export interface SignatureFlowRepository {
  findById(id: string): Promise<SignatureFlow | null>;
  findByDocumentId(documentId: string): Promise<SignatureFlow[]>;
  findByDocumentIds(documentIds: string[]): Promise<SignatureFlow[]>;
  findActiveByDocumentId(documentId: string): Promise<SignatureFlow | null>;
  findActiveByDocumentIds(documentIds: string[]): Promise<SignatureFlow[]>;
  findDueForAutoClose(now: Date): Promise<SignatureFlow[]>;
  /** Flujos en revisión con cierre automático habilitado — el vencimiento se evalúa participante por participante (orden secuencial), así que no se filtra por fecha en la consulta. */
  findInReviewWithAutoCloseEnabled(): Promise<SignatureFlow[]>;
  /** Flujos en firma secuencial con cierre automático habilitado — mismo motivo que el anterior. */
  findSequentialSigningWithAutoCloseEnabled(): Promise<SignatureFlow[]>;
  findInSigningWithExpiredDocuments(now: Date): Promise<SignatureFlow[]>;
  findPendingDocumentsReport(groupId?: number): Promise<PendingSignatureDocumentsReportItem[]>;
  findSigningTimeReport(groupId?: number): Promise<SignatureProcessTimeReportItem[]>;
  save(flow: SignatureFlow): Promise<SignatureFlow>;
  update(flow: SignatureFlow): Promise<SignatureFlow>;
  delete(id: string): Promise<void>;
}
