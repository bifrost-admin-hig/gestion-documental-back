import { Request, Response } from 'express';
import { GetDocumentHistoryUseCase } from '../../domains/document/use-cases/get-document-history.use-case';
import { DocumentHistory } from '../../domains/document/entities/document-history.entity';
import { asyncHandler } from '@shared/middleware/validation';

interface DocumentHistoryResponseDto {
  id: string;
  documentId: string;
  documentModelId: string;
  name: string;
  issuedDate: string | null;
  expirationDate: string | null;
  contractId: string | null;
  description?: string;
  documentUrl?: string;
  status: string;
  comment: string | null;
  action: string;
  updatedBy?: string;
  updatedByName?: string;
  updatedByLastName?: string;
  actionComment?: string | null;
  updatedAt: string;
}

export class DocumentHistoryController {
  constructor(
    private getDocumentHistoryUseCase: GetDocumentHistoryUseCase,
  ) {}

  getHistoryByDocumentId = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { documentId } = req.params;
    const history = await this.getDocumentHistoryUseCase.getByDocumentId(documentId);

    res.status(200).json({
      success: true,
      data: history.map((h) => this.toResponseDto(h)),
      count: history.length,
    });
  });

  getAllHistory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const history = await this.getDocumentHistoryUseCase.getAll();

    res.status(200).json({
      success: true,
      data: history.map((h) => this.toResponseDto(h)),
      count: history.length,
    });
  });

  private toResponseDto(history: DocumentHistory): DocumentHistoryResponseDto {
    return {
      id: history.id,
      documentId: history.documentId,
      documentModelId: history.documentModelId,
      name: history.name,
      issuedDate: history.issuedDate ? history.issuedDate.toISOString().split('T')[0] : null,
      expirationDate: history.expirationDate ? history.expirationDate.toISOString().split('T')[0] : null,
      contractId: history.contractId,
      description: history.description,
      documentUrl: history.documentUrl,
      status: history.status,
      comment: history.comment,
      action: history.action,
      updatedBy: history.updatedBy,
      updatedByName: history.updatedByName,
      updatedByLastName: history.updatedByLastName,
      actionComment: history.actionComment,
      updatedAt: history.updatedAt.toISOString(),
    };
  }
}
