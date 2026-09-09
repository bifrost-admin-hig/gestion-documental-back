export interface DashboardMetricsDto {
  documentsInDraft: number;
  documentsWithoutColaborator: number;
  documentsExpiringSoon: number;
  documentsInReview: number;
  pendingRequiredForContract: number;
  pendingRequiredForColaborator: number;
  requiredForColaboratorAndColaboratorsCountZero: number;
  colaboratorsPendingAssignment: number;
  documentsWithInsufficientColaborators: number;
  recentDocuments: Document[];
  documentsRecentlyApproved: Document[];
}
