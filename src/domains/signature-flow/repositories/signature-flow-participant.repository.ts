import { SignatureFlowParticipant } from '../entities/signature-flow-participant.entity';

export interface PendingSignatureTaskItem {
  participantId: string;
  flowId: string;
  role: string;
  order: number | null;
  documentId: string;
  documentName: string;
  documentStatus: string;
  documentTypeName: string | null;
  documentSubtypeName: string | null;
  contractNumber: string | null;
  sentAt: Date | null;
  sentByName: string | null;
  requiresSignatureDrawing: boolean;
}

export interface SignatureFlowParticipantRepository {
  findById(id: string): Promise<SignatureFlowParticipant | null>;
  findByFlowId(flowId: string): Promise<SignatureFlowParticipant[]>;
  findByFlowIdAndRole(flowId: string, role: string): Promise<SignatureFlowParticipant[]>;
  findByUserId(userId: string): Promise<SignatureFlowParticipant[]>;
  findPendingActionsByUserId(userId: string, groupId?: number): Promise<PendingSignatureTaskItem[]>;
  save(participant: SignatureFlowParticipant): Promise<SignatureFlowParticipant>;
  update(participant: SignatureFlowParticipant): Promise<SignatureFlowParticipant>;
  delete(id: string): Promise<void>;
  deleteByFlowId(flowId: string): Promise<void>;
}
