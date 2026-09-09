export interface DocumentResponseDto {
  id: string;
  documentModelId: string;
  colaboratorIds: string[];
  groupId: number;
  familyId?: string;
  familyName?: string;
  documentTypeId?: string;
  documentSubtypeId?: string;
  documentTypeName?: string;
  documentSubtypeName?: string;
  name: string;
  issuedDate?: string | null; // ISO date string
  expirationDate?: string | null; // ISO date string
  contractId?: string;
  contractNumber?: string;
  contractProjectName?: string;
  description?: string;
  documentUrl?: string;
  status: string;
  previousVersionId?: string | null;
  isSuperseded: boolean;
  code?: string | null;
  reviewDate?: string | null; // ISO date string
  responsibleColaboratorId?: string | null;
  responsibleColaboratorName?: string | null;
  areaId?: string | null;
  areaName?: string | null;
  requiredForContract: boolean;
  requiredForColaborator: boolean;
  requiredExpirationDate: boolean;
  requiredColaboratorsCount: number;
  comment?: string | null;
  isExpired: boolean;
  daysUntilExpiration: number | null;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  activeSignatureFlowId?: string | null;
  activeSignatureFlowSentBy?: string | null;
  activeSignatureFlowRequiresDrawing?: boolean | null;
  hasSignatureFlowHistory?: boolean;
}
