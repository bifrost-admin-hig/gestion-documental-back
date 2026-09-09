export interface AssignReviewerDto {
  userId: string;
  isPrimary?: boolean;
  validUntil?: string; // ISO date string
}
