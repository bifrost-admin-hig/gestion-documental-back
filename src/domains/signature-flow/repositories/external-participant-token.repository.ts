import { ExternalParticipantToken } from '../entities/external-participant-token.entity';

export interface ExternalParticipantTokenRepository {
  findByToken(token: string): Promise<ExternalParticipantToken | null>;
  findByParticipantId(participantId: string): Promise<ExternalParticipantToken | null>;
  save(token: ExternalParticipantToken): Promise<ExternalParticipantToken>;
  update(token: ExternalParticipantToken): Promise<ExternalParticipantToken>;
  deleteByParticipantId(participantId: string): Promise<void>;
}
