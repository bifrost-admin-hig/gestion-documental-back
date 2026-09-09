export interface DocumentFieldValueDto {
  fieldName: string;
  fieldValue: string | null;
}

export interface CreateDocumentDto {
  documentModelId: string;
  colaboratorIds: string[];
  name: string;
  issuedDate?: string; // ISO date string
  expirationDate?: string; // ISO date string
  description?: string;
  documentUrl?: string;
  groupId: number;
  requiredColaboratorsCount?: number;
  templateId?: string;
  fieldValues?: DocumentFieldValueDto[];
  code?: string;
  reviewDate?: string; // ISO date string
  responsibleColaboratorId?: string;
  areaId?: string;
}
