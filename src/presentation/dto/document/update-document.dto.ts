import { DocumentFieldValueDto } from './create-document.dto';

export interface UpdateDocumentDto {
  documentModelId?: string;
  colaboratorIds?: string[];
  name?: string;
  issuedDate?: string; // ISO date string
  expirationDate?: string; // ISO date string
  contractId?: string;
  description?: string;
  documentUrl?: string;
  comment?: string;
  groupId?: number;
  requiredColaboratorsCount?: number;
  templateId?: string;
  fieldValues?: DocumentFieldValueDto[];
  code?: string | null;
  reviewDate?: string | null; // ISO date string
  responsibleColaboratorId?: string | null;
  areaId?: string | null;
}
