import { DocumentRepository } from '@domains/document/repositories/document.repository';
import { SignatureRepository } from '@domains/signature/repositories/signature.repository';
import { UserRepository } from '@domains/user/repositories/user.repository';
import { ColaboratorRepository } from '@domains/colaborators/repositories/colaborator.repository';
import { NotFoundError } from '@shared/domain/errors';
import { SignatureFlowRepository } from '../repositories/signature-flow.repository';
import { SignatureFlowParticipantRepository } from '../repositories/signature-flow-participant.repository';
import { ExternalParticipantTokenRepository } from '../repositories/external-participant-token.repository';
import { SignatureFlowParticipantRole, SignatureFlowParticipantStatus, SignatureFlowStatus } from '../value-objects/signature-flow-enums';

export interface PublicSignerInfo {
  name: string;
  email: string;
  documentNumber: string | null;
  signedAt: string | null;
  ipAddress: string | null;
  isExternal: boolean;
}

export interface PublicValidatorInfo {
  name: string;
  actionAt: string | null;
}

export interface PublicDocumentVerificationResult {
  document: {
    id: string;
    name: string;
    status: string;
    expirationDate: string | null;
    isExpired: boolean;
    documentUrl: string | null;
  };
  signers: PublicSignerInfo[];
  validators: PublicValidatorInfo[];
  flowStatus: string | null;
}

export class GetPublicDocumentVerificationUseCase {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly flowRepository: SignatureFlowRepository,
    private readonly participantRepository: SignatureFlowParticipantRepository,
    private readonly externalTokenRepository: ExternalParticipantTokenRepository,
    private readonly signatureRepository: SignatureRepository,
    private readonly userRepository: UserRepository,
    private readonly colaboratorRepository: ColaboratorRepository,
  ) {}

  async execute(documentId: string): Promise<PublicDocumentVerificationResult> {
    const document = await this.documentRepository.findById(documentId);
    if (!document) throw new NotFoundError('Documento no encontrado.');

    const now = new Date();
    const isExpired = !!(document.expirationDate && new Date(document.expirationDate) < now);

    const flows = await this.flowRepository.findByDocumentId(documentId);
    const flow = flows.find((f) => f.status === SignatureFlowStatus.SIGNED)
      ?? flows.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))[0]
      ?? null;

    if (!flow) {
      return {
        document: {
          id: document.id,
          name: document.name,
          status: document.status,
          expirationDate: document.expirationDate ? new Date(document.expirationDate).toISOString() : null,
          isExpired,
          documentUrl: document.documentUrl ?? null,
        },
        signers: [],
        validators: [],
        flowStatus: null,
      };
    }

    const participants = await this.participantRepository.findByFlowId(flow.id);
    const signedSigners = participants.filter(
      (p) => p.role === SignatureFlowParticipantRole.SIGNER
        && p.status === SignatureFlowParticipantStatus.SIGNED,
    );
    const approvedValidators = participants.filter(
      (p) => p.role === SignatureFlowParticipantRole.VALIDATOR
        && p.status === SignatureFlowParticipantStatus.APPROVED,
    );

    const documentSignatures = await this.signatureRepository.findByDocumentId(documentId);

    const signers: PublicSignerInfo[] = [];
    for (const s of signedSigners) {
      if (s.userId) {
        const user = await this.userRepository.findById(s.userId);
        const collab = await this.colaboratorRepository.findByUserId(s.userId);
        const sig = documentSignatures.find((r) => r.userId === s.userId);
        signers.push({
          name: user ? `${user.firstName} ${user.lastName}` : s.userId,
          email: String(user?.email ?? ''),
          documentNumber: collab?.numeroDocumento ?? null,
          signedAt: sig?.signedAt?.toISOString() ?? s.actionAt?.toISOString() ?? null,
          ipAddress: sig?.ipAddress ?? null,
          isExternal: false,
        });
      } else if (s.externalEmail) {
        const extToken = await this.externalTokenRepository.findByParticipantId(s.id);
        signers.push({
          name: s.externalName ?? 'Firmante externo',
          email: s.externalEmail,
          documentNumber: extToken?.documentNumber ?? null,
          signedAt: s.actionAt?.toISOString() ?? null,
          ipAddress: extToken?.ipAddress ?? null,
          isExternal: true,
        });
      }
    }

    const validators: PublicValidatorInfo[] = [];
    for (const v of approvedValidators) {
      let name: string;
      if (v.userId) {
        const user = await this.userRepository.findById(v.userId);
        name = user ? `${user.firstName} ${user.lastName}` : v.userId;
      } else {
        name = v.externalName ?? 'Validador externo';
      }
      validators.push({ name, actionAt: v.actionAt?.toISOString() ?? null });
    }

    return {
      document: {
        id: document.id,
        name: document.name,
        status: document.status,
        expirationDate: document.expirationDate ? new Date(document.expirationDate).toISOString() : null,
        isExpired,
        documentUrl: document.documentUrl ?? null,
      },
      signers,
      validators,
      flowStatus: flow.status,
    };
  }
}
