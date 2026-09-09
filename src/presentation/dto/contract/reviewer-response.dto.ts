export interface ReviewerResponseDto {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  contractId: string;
  isPrimary: boolean;
  validUntil: string | null;
  isActive: boolean;
  createdAt: string;
}
