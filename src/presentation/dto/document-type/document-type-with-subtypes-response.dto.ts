import { DocumentSubtypeResponseDto } from '@presentation/dto/document-subtype/document-subtype-response.dto';

export interface DocumentTypeWithSubtypesResponseDto {
  id: string;
  name: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  subtypes: DocumentSubtypeResponseDto[];
}
