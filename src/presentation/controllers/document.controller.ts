import { Request, Response } from 'express';
import { CreateDocumentUseCase } from '../../domains/document/use-cases/create-document.use-case';
import {
  GetDocumentByIdUseCase,
  GetAllDocumentsUseCase,
  GetDocumentsByContractIdUseCase,
  GetDocumentsByTypeAndSubtypeIdUseCase,
  GetDocumentsByColaboratorIdUseCase,
  GetExpiredDocumentsUseCase,
  GetExpiringDocumentsUseCase,
} from '../../domains/document/use-cases/get-document.use-case';
import { UpdateDocumentUseCase, DeleteDocumentUseCase } from '../../domains/document/use-cases/update-document.use-case';
import { SendToReviewDocumentUseCase } from '../../domains/document/use-cases/send-to-review-document.use-case';
import { ApproveDocumentUseCase } from '../../domains/document/use-cases/approve-document.use-case';
import { DirectApproveDocumentUseCase } from '../../domains/document/use-cases/direct-approve-document.use-case';
import { RejectDocumentUseCase } from '../../domains/document/use-cases/reject-document.use-case';
import { RejectDocumentWithCommentsUseCase } from '../../domains/document/use-cases/reject-document-with-comments.use-case';
import { CreateDocumentDto } from '../dto/document/create-document.dto';
import { UpdateDocumentDto } from '../dto/document/update-document.dto';
import { DocumentResponseDto } from '../dto/document/document-response.dto';
import { Document } from '../../domains/document/entities/document.entity';
import { asyncHandler } from '@shared/middleware/validation';
import { ContractReviewerRepository } from '@domains/contract/repositories/contract-reviewer.repository';
import { ReviewerResponseDto } from '../dto/contract/reviewer-response.dto';
import { ContractReviewer } from '@domains/contract/entities/contract-reviewer.entity';
import { GetAllDocumentTypesWithSubtypesUseCase } from '@domains/document-type/use-cases/get-document-type-with-subtypes.use-case';
import { AssignDocumentsToGroupUseCase } from '@domains/document/use-cases/assign-documents-to-group.use-case';
import { DownloadDocumentsZipUseCase } from '@domains/document/use-cases/download-documents-zip.use-case';
import { GetDashboardMetricsUseCase } from '@domains/document/use-cases/get-dashboard-metrics.use-case';
import { DashboardMetricsDto } from '../dto/document/dashboard-metrics.dto';
import { NotFoundError, ValidationError } from '@shared/domain/errors';
import { DocumentStatus } from '@domains/document/value-objects/document-enums';
import { SignatureFlowRepository } from '@domains/signature-flow/repositories/signature-flow.repository';
import { SignatureFlowStatus } from '@domains/signature-flow/value-objects/signature-flow-enums';

export class DocumentController {
  constructor(
    private createDocumentUseCase: CreateDocumentUseCase,
    private getDocumentByIdUseCase: GetDocumentByIdUseCase,
    private getAllDocumentsUseCase: GetAllDocumentsUseCase,
    private getDocumentsByContractIdUseCase: GetDocumentsByContractIdUseCase,
    private getDocumentsByTypeAndSubtypeIdUseCase: GetDocumentsByTypeAndSubtypeIdUseCase,
    private getDocumentsByColaboratorIdUseCase: GetDocumentsByColaboratorIdUseCase,
    private getExpiredDocumentsUseCase: GetExpiredDocumentsUseCase,
    private getExpiringDocumentsUseCase: GetExpiringDocumentsUseCase,
    private updateDocumentUseCase: UpdateDocumentUseCase,
    private deleteDocumentUseCase: DeleteDocumentUseCase,
    private sendToReviewDocumentUseCase: SendToReviewDocumentUseCase,
    private approveDocumentUseCase: ApproveDocumentUseCase,
    private directApproveDocumentUseCase: DirectApproveDocumentUseCase,
    private rejectDocumentUseCase: RejectDocumentUseCase,
    private rejectDocumentWithCommentsUseCase: RejectDocumentWithCommentsUseCase,
    private contractReviewerRepository: ContractReviewerRepository,
    private getAllDocumentTypesWithSubtypesUseCase: GetAllDocumentTypesWithSubtypesUseCase,
    private getDashboardMetricsUseCase: GetDashboardMetricsUseCase,
    private assignDocumentsToGroupUseCase?: AssignDocumentsToGroupUseCase,
    private downloadDocumentsZipUseCase?: DownloadDocumentsZipUseCase,
    private signatureFlowRepository?: SignatureFlowRepository,
  ) {}

  assignDocumentsToGroup = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const {
      documentModelId,
      colaboratorIds,
      issuedDate,
      expirationDate,
      name,
      comment,
    } = req.body;

    // Lazy import to avoid circular deps in constructor if use-case not injected earlier
    // but prefer to access via dependency injection container in wiring; here assume it's available via (any) this
    const useCase = this.assignDocumentsToGroupUseCase;
    if (!useCase) throw new NotFoundError('Use case assignDocumentsToGroupUseCase');

    const result = await useCase.execute({
      documentModelId,
      colaboratorIds,
      issuedDate: issuedDate ? new Date(issuedDate) : undefined,
      expirationDate: expirationDate ? new Date(expirationDate) : undefined,
      name,
      comment,
      createdBy: req.auth?.user?.id,
    });

    const createdDtos = result.created.map((d: Document) => this.toResponseDto(d));
    res.status(201).json({
      success: true,
      data: {
        createdCount: createdDtos.length,
        skippedCount: result.skipped.length,
        created: createdDtos,
        skipped: result.skipped,
      },
    });
  });

  downloadZip = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { documentIds } = req.body as { documentIds?: unknown };

    if (!Array.isArray(documentIds) || documentIds.length === 0 || documentIds.some((id) => typeof id !== 'string')) {
      throw new ValidationError('Debe proporcionar un arreglo de IDs de documentos', 'documentIds');
    }

    const useCase = this.downloadDocumentsZipUseCase;
    if (!useCase) throw new NotFoundError('Use case downloadDocumentsZipUseCase');

    const archive = await useCase.execute(documentIds as string[], req.auth.groupId);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="documentos.zip"');

    archive.on('error', (error) => {
      console.error('Error streaming documents zip:', error);
      if (!res.headersSent) {
        res.status(500);
      }
      res.end();
    });

    archive.pipe(res);
  });

  createDocument = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const dto: CreateDocumentDto = req.body;

    const document = await this.createDocumentUseCase.execute({
      documentModelId: dto.documentModelId,
      colaboratorIds: dto.colaboratorIds,
      name: dto.name,
      issuedDate: dto.issuedDate ? new Date(dto.issuedDate) : undefined,
      expirationDate: dto.expirationDate ? new Date(dto.expirationDate) : undefined,
      description: dto.description,
      documentUrl: dto.documentUrl,
      groupId: dto.groupId,
      requiredColaboratorsCount: dto.requiredColaboratorsCount,
      createdBy: req.auth.user?.id,
      templateId: dto.templateId,
      fieldValues: dto.fieldValues,
      code: dto.code,
      reviewDate: dto.reviewDate ? new Date(dto.reviewDate) : undefined,
      responsibleColaboratorId: dto.responsibleColaboratorId,
      areaId: dto.areaId,
    });

    res.status(201).json({
      success: true,
      data: this.toResponseDto(document),
      message: 'Document created successfully',
    });
  });

  getDocumentById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const document = await this.getDocumentByIdUseCase.execute(id);
    res.status(200).json({
      success: true,
      data: this.toResponseDto(document),
    });
  });

  getAllDocuments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { includeContractReviewers, includeDocumentTypes, filter } = req.query;

    const filterObj = (filter && typeof filter === 'object' && !Array.isArray(filter) ? filter : {}) as Record<string, string | undefined>;
    const contractId = filterObj.contractId;
    const colaboratorId = filterObj.colaboratorId;
    const requiredForContract = filterObj.requiredForContract === 'true' ? true : undefined;
    const requiredForColaborator = filterObj.requiredForColaborator === 'true' ? true : undefined;
    const status = filterObj.status as DocumentStatus | undefined;

    const documents = await this.getAllDocumentsUseCase.execute(req.auth.groupId, {
      contractId,
      colaboratorId,
      requiredForContract,
      requiredForColaborator,
      status,
    });

    const { activeFlowByDocumentId, documentIdsWithFlowHistory } = await this.getSignatureFlowInfoByDocumentId(documents);

    const response: {
      success: true;
      data: DocumentResponseDto[];
      count: number;
      contractReviewers?: Record<string, ReviewerResponseDto[]>;
      documentTypes?: object[];
    } = {
      success: true,
      data: documents.map((doc) => this.toResponseDto(
        doc,
        activeFlowByDocumentId.get(doc.id) ?? null,
        documentIdsWithFlowHistory.has(doc.id),
      )),
      count: documents.length,
    };

    // Si se solicita incluir revisores de contratos
    if (includeContractReviewers === 'true') {
      // Obtener IDs únicos de contratos de los documentos
      const contractIds = [...new Set(
        documents
          .map(doc => doc.contractId)
          .filter((id): id is string => id !== null && id !== undefined),
      )];

      // Obtener revisores solo de esos contratos
      const reviewersMap = await this.contractReviewerRepository.findByContractIds(contractIds);

      // Convertir Map a objeto para serialización JSON
      const contractReviewers: Record<string, ReviewerResponseDto[]> = {};
      for (const [contractId, reviewers] of reviewersMap.entries()) {
        contractReviewers[contractId] = reviewers.map(reviewer => this.toReviewerResponseDto(reviewer));
      }

      response.contractReviewers = contractReviewers;
    }

    // Si se solicita incluir tipos de documentos con subtipos
    if (includeDocumentTypes === 'true') {
      const results = await this.getAllDocumentTypesWithSubtypesUseCase.execute();
      response.documentTypes = results.map(result => ({
        ...result.documentType.toJSON(),
        subtypes: result.subtypes.map(subtype => subtype.toJSON()),
      }));
    }

    res.status(200).json(response);
  });

  getDocumentsByContractId = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { contractId } = req.params;
    const documents = await this.getDocumentsByContractIdUseCase.execute(contractId);
    res.status(200).json({
      success: true,
      data: documents.map((doc) => this.toResponseDto(doc)),
      count: documents.length,
    });
  });

  getDocumentsByTypeAndSubtypeId = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { typeId, subtypeId } = req.params;
    const documents = await this.getDocumentsByTypeAndSubtypeIdUseCase.execute(typeId, subtypeId);
    res.status(200).json({
      success: true,
      data: documents.map((doc) => this.toResponseDto(doc)),
      count: documents.length,
    });
  });

  getDocumentsByColaboratorId = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { colaboratorId } = req.params;
    const documents = await this.getDocumentsByColaboratorIdUseCase.execute(colaboratorId);
    res.status(200).json({
      success: true,
      data: documents.map((doc) => this.toResponseDto(doc)),
      count: documents.length,
    });
  });

  getExpiredDocuments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const documents = await this.getExpiredDocumentsUseCase.execute();
    res.status(200).json({
      success: true,
      data: documents.map((doc) => this.toResponseDto(doc)),
      count: documents.length,
    });
  });

  getExpiringDocuments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { days } = req.params;
    const documents = await this.getExpiringDocumentsUseCase.execute(parseInt(days, 10));
    res.status(200).json({
      success: true,
      data: documents.map((doc) => this.toResponseDto(doc)),
      count: documents.length,
    });
  });



  updateDocument = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const dto: UpdateDocumentDto = req.body;

    const document = await this.updateDocumentUseCase.execute(id, {
      documentModelId: dto.documentModelId,
      colaboratorIds: dto.colaboratorIds,
      name: dto.name,
      issuedDate: dto.issuedDate ? new Date(dto.issuedDate) : undefined,
      expirationDate: dto.expirationDate ? new Date(dto.expirationDate) : undefined,
      contractId: dto.contractId,
      description: dto.description,
      documentUrl: dto.documentUrl,
      requiredColaboratorsCount: dto.requiredColaboratorsCount,
      updatedBy: req.auth.user?.id,
      comment: dto.comment,
      templateId: dto.templateId,
      fieldValues: dto.fieldValues,
      code: dto.code !== undefined ? (dto.code || null) : undefined,
      reviewDate: dto.reviewDate !== undefined ? (dto.reviewDate ? new Date(dto.reviewDate) : null) : undefined,
      responsibleColaboratorId: dto.responsibleColaboratorId !== undefined ? (dto.responsibleColaboratorId || null) : undefined,
      areaId: dto.areaId !== undefined ? (dto.areaId || null) : undefined,
    });

    res.status(200).json({
      success: true,
      data: this.toResponseDto(document),
      message: 'Document updated successfully',
    });
  });

  deleteDocument = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    await this.deleteDocumentUseCase.execute(id);
    res.status(200).json({
      success: true,
      message: 'Document deleted successfully',
    });
  });

  sendToReview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    await this.sendToReviewDocumentUseCase.execute(id, req.auth.user?.id || 'system');

    // Obtener el documento actualizado
    const document = await this.getDocumentByIdUseCase.execute(id);

    res.status(200).json({
      success: true,
      data: this.toResponseDto(document),
      message: 'Documento enviado a revisión exitosamente',
    });
  });

  approveDocument = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    await this.approveDocumentUseCase.execute(id, req.auth.user?.id || 'system');

    // Obtener el documento actualizado
    const document = await this.getDocumentByIdUseCase.execute(id);

    res.status(200).json({
      success: true,
      data: this.toResponseDto(document),
      message: 'Documento aprobado exitosamente',
    });
  });

  directApproveDocument = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    await this.directApproveDocumentUseCase.execute(id, req.auth.user?.id || 'system');

    const document = await this.getDocumentByIdUseCase.execute(id);

    res.status(200).json({
      success: true,
      data: this.toResponseDto(document),
      message: 'Documento aprobado exitosamente',
    });
  });

  rejectDocument = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    await this.rejectDocumentUseCase.execute(id, req.auth.user?.id || 'system');

    // Obtener el documento actualizado
    const document = await this.getDocumentByIdUseCase.execute(id);

    res.status(200).json({
      success: true,
      data: this.toResponseDto(document),
      message: 'Documento rechazado exitosamente',
    });
  });

  rejectDocumentWithComments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { comments } = req.body;

    if (!comments || typeof comments !== 'string' || comments.trim() === '') {
      throw new ValidationError('Los comentarios son obligatorios', { comments });
    }

    await this.rejectDocumentWithCommentsUseCase.execute(id, req.auth.user?.id || 'system', comments);

    // Obtener el documento actualizado
    const document = await this.getDocumentByIdUseCase.execute(id);

    res.status(200).json({
      success: true,
      data: this.toResponseDto(document),
      message: 'Documento rechazado con comentarios exitosamente',
    });
  });

  private async getSignatureFlowInfoByDocumentId(documents: Document[]): Promise<{
    activeFlowByDocumentId: Map<string, { id: string; sentBy: string | null; requireSignatureDrawing: boolean }>;
    documentIdsWithFlowHistory: Set<string>;
  }> {
    const activeFlowByDocumentId = new Map<string, { id: string; sentBy: string | null; requireSignatureDrawing: boolean }>();
    const documentIdsWithFlowHistory = new Set<string>();
    if (!this.signatureFlowRepository) return { activeFlowByDocumentId, documentIdsWithFlowHistory };

    const documentIds = [...new Set(documents.map((doc) => doc.id))];
    if (documentIds.length === 0) return { activeFlowByDocumentId, documentIdsWithFlowHistory };

    // Todos los flujos (cualquier estado) que haya tenido cada documento alguna vez.
    const allFlows = await this.signatureFlowRepository.findByDocumentIds(documentIds);
    const activeStatuses = new Set([SignatureFlowStatus.IN_REVIEW, SignatureFlowStatus.IN_SIGNING]);

    for (const flow of allFlows) {
      documentIdsWithFlowHistory.add(flow.documentId);
      if (activeStatuses.has(flow.status) && !activeFlowByDocumentId.has(flow.documentId)) {
        // allFlows viene ordenado por created_at DESC, así que el primero que encontremos es el más reciente.
        activeFlowByDocumentId.set(flow.documentId, {
          id: flow.id,
          sentBy: flow.sentBy,
          requireSignatureDrawing: flow.requireSignatureDrawing,
        });
      }
    }

    return { activeFlowByDocumentId, documentIdsWithFlowHistory };
  }

  private toResponseDto(
    document: Document,
    activeFlow?: { id: string; sentBy: string | null; requireSignatureDrawing: boolean } | null,
    hasSignatureFlowHistory?: boolean,
  ): DocumentResponseDto {
    const json = document.toJSON();
    return {
      id: json.id,
      documentModelId: json.documentModelId,
      colaboratorIds: json.colaboratorIds || [],
      groupId: document.groupId,
      familyId: document.familyId,
      familyName: document.familyName,
      documentTypeId: document.documentTypeId,
      documentSubtypeId: document.documentSubtypeId,
      documentTypeName: document.documentTypeName,
      documentSubtypeName: document.documentSubtypeName,
      name: json.name,
      issuedDate: json.issuedDate ?? null,
      expirationDate: json.expirationDate ?? null,
      contractId: json.contractId ?? undefined,
      contractNumber: document.contractNumber,
      contractProjectName: document.contractProjectName,
      description: json.description,
      documentUrl: json.documentUrl,
      status: json.status,
      previousVersionId: document.previousVersionId,
      isSuperseded: document.isSuperseded,
      code: document.code,
      reviewDate: json.reviewDate ?? null,
      responsibleColaboratorId: document.responsibleColaboratorId,
      responsibleColaboratorName: document.responsibleColaboratorName,
      areaId: document.areaId,
      areaName: document.areaName,
      requiredForContract: json.requiredForContract ?? false,
      requiredForColaborator: json.requiredForColaborator ?? false,
      requiredExpirationDate: json.requiredExpirationDate ?? false,
      requiredColaboratorsCount: json.requiredColaboratorsCount ?? 0,
      comment: json.comment,
      isExpired: document.isExpired,
      daysUntilExpiration: document.daysUntilExpiration,
      createdAt: json.createdAt,
      updatedAt: json.updatedAt,
      activeSignatureFlowId: activeFlow?.id ?? null,
      activeSignatureFlowSentBy: activeFlow?.sentBy ?? null,
      activeSignatureFlowRequiresDrawing: activeFlow ? activeFlow.requireSignatureDrawing : null,
      hasSignatureFlowHistory: hasSignatureFlowHistory ?? false,
    };
  }

  private toReviewerResponseDto(reviewer: ContractReviewer): ReviewerResponseDto {
    const json = reviewer.toJSON();
    return {
      id: json.id,
      userId: json.userId,
      contractId: json.contractId,
      isPrimary: json.isPrimary,
      validUntil: json.validUntil,
      isActive: json.isActive,
      createdAt: json.createdAt,
    };
  }

  getDashboardMetrics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const groupId = req.auth.groupId;
    const metrics = await this.getDashboardMetricsUseCase.execute(groupId);
    res.status(200).json({
      success: true,
      data: metrics as DashboardMetricsDto,
    });
  });
}
