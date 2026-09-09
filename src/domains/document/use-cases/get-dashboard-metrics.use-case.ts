import { DocumentRepository } from '../repositories/document.repository';
import { DocumentStatus } from '../value-objects/document-enums';

export interface DashboardMetrics {
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

export class GetDashboardMetricsUseCase {
  constructor(private readonly documentRepository: DocumentRepository) {}

  public async execute(groupId?: number): Promise<DashboardMetrics> {
    const allDocuments = await this.documentRepository.findAll(groupId);

    // Cantidad de documentos en estado borrador (draft)
    const documentsInDraft = allDocuments.filter(
      (doc) => doc.status === DocumentStatus.DRAFT,
    ).length;

    // Cantidad de documentos sin colaboradores asignados, y que requieran colaboradores
    const documentsWithoutColaborator = allDocuments.filter(
      (doc) => (!doc.colaboratorIds || doc.colaboratorIds.length === 0) &&
        doc.requiredForColaborator === true,
    ).length;

    // Cantidad de documentos por vencer en los próximos 30 días
    const documentsExpiringSoon = allDocuments.filter(
      (doc) => doc.expirationDate !== null &&
        doc.status === DocumentStatus.APPROVED &&
        doc.expirationDate <= new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000),
    ).length;

    // Cantidad de documentos de documentos pendientes por aprobar (in_review)
    const documentsInReview = allDocuments.filter(
      (doc) => doc.status === DocumentStatus.IN_REVIEW,
    ).length;

    // Cantidad de documentos obligatorios del Contrato en estado Pendiente
    const pendingRequiredForContract = allDocuments.filter(
      (doc) => doc.requiredForContract === true &&
        (doc.status === DocumentStatus.DRAFT || doc.status === DocumentStatus.REJECTED_WITH_COMMENTS),
    ).length;

    // Cantidad de documentos obligatorios del Colaborador en estado Pendiente
    const pendingRequiredForColaborator = allDocuments.filter(
      (doc) => doc.requiredForColaborator === true &&
        (doc.status === DocumentStatus.DRAFT || doc.status === DocumentStatus.REJECTED_WITH_COMMENTS),
    ).length;

    // Cantidad de documentos con requeridos del Colaborador, pero con Cantidad de Colaboradores requeridos igual a 0
    const requiredForColaboratorAndColaboratorsCountZero = allDocuments.filter(
      (doc) => doc.requiredForColaborator === true &&
        (!doc.requiredColaboratorsCount || doc.requiredColaboratorsCount === 0),
    ).length;

    // Cantidad de colaboradores por asignar en documentos requeridos para el Colaborador
    const colaboratorsPendingAssignment = allDocuments.reduce((acc, doc) => {
      if (doc.requiredForColaborator === true) {
        const assignedCount = doc.colaboratorIds ? doc.colaboratorIds.length : 0;
        const requiredCount = doc.requiredColaboratorsCount || 0;
        if (requiredCount > assignedCount) {
          return acc + (requiredCount - assignedCount);
        }
      }
      return acc;
    }, 0);

    // Cantidad de documentos con una cantidad de colaboradores asignados menor a la requerida
    const documentsWithInsufficientColaborators = allDocuments.filter((doc) => {
      if (doc.requiredForColaborator === true) {
        const assignedCount = doc.colaboratorIds ? doc.colaboratorIds.length : 0;
        const requiredCount = doc.requiredColaboratorsCount || 0;
        return assignedCount < requiredCount;
      }
      return false;
    }).length;

    // Listas de los 10 documentos más recientemente creados
    const recentDocuments = allDocuments
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);

    // Listas de los 10 documentos más recientemente aprobados
    const documentsRecentlyApproved = allDocuments
      .filter((doc) => doc.status === DocumentStatus.APPROVED && doc.updatedAt !== null)
      .sort((a, b) => (b.updatedAt!.getTime() - a.updatedAt!.getTime()))
      .slice(0, 10);
    return {
      documentsInDraft,
      documentsWithoutColaborator,
      documentsExpiringSoon,
      documentsInReview,
      pendingRequiredForContract,
      pendingRequiredForColaborator,
      requiredForColaboratorAndColaboratorsCountZero,
      colaboratorsPendingAssignment,
      documentsWithInsufficientColaborators,
      recentDocuments,
      documentsRecentlyApproved,
    };
  }
}
