import { Request, Response } from 'express';
import { CreateDocumentModelUseCase } from '@domains/document-model/use-cases/create-document-model.use-case';
import {
  GetDocumentModelByIdUseCase,
  GetAllDocumentModelsUseCase,
  GetDocumentModelsByFamilyIdUseCase,
} from '@domains/document-model/use-cases/get-document-model.use-case';
import { UpdateDocumentModelUseCase, DeleteDocumentModelUseCase } from '@domains/document-model/use-cases/update-document-model.use-case';
import { AssignDocumentsFromModelUseCase } from '@domains/document-model/use-cases/assign-documents-from-model.use-case';
import { asyncHandler } from '@shared/middleware/validation';
import { parseNum } from '@shared/utils/numbers';

export class DocumentModelController {
  constructor(
    private readonly createDocumentModelUseCase: CreateDocumentModelUseCase,
    private readonly getDocumentModelByIdUseCase: GetDocumentModelByIdUseCase,
    private readonly getAllDocumentModelsUseCase: GetAllDocumentModelsUseCase,
    private readonly getDocumentModelsByFamilyIdUseCase: GetDocumentModelsByFamilyIdUseCase,
    private readonly updateDocumentModelUseCase: UpdateDocumentModelUseCase,
    private readonly deleteDocumentModelUseCase: DeleteDocumentModelUseCase,
    private readonly assignDocumentsFromModelUseCase: AssignDocumentsFromModelUseCase,
  ) {}

  public createDocumentModel = asyncHandler(async (req: Request, res: Response) => {
    const request = {
      ...req.body,
      groupId: req.auth?.groupId ?? req.body.groupId,
    };
    const documentModel = await this.createDocumentModelUseCase.execute(request);
    res.status(201).json({
      success: true,
      data: documentModel.toJSON(),
      message: 'Modelo de documento creado exitosamente',
    });
  });

  public getDocumentModelById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const documentModel = await this.getDocumentModelByIdUseCase.execute(id);
    res.status(200).json({
      success: true,
      data: documentModel.toJSON(),
    });
  });

  public getAllDocumentModels = asyncHandler(async (req: Request, res: Response) => {
    const groupId = parseNum(req.query.groupId) || req.auth?.groupId;
    const { familyId } = req.query;
    const documentModels = await this.getAllDocumentModelsUseCase.execute(groupId, familyId as string);
    res.status(200).json({
      success: true,
      data: documentModels.map(model => model.toJSON()),
      count: documentModels.length,
    });
  });

  public getDocumentModelsByFamilyId = asyncHandler(async (req: Request, res: Response) => {
    const { familyId } = req.params;
    const { groupId } = req.auth;
    const documentModels = await this.getDocumentModelsByFamilyIdUseCase.execute(familyId, groupId);
    res.status(200).json({
      success: true,
      data: documentModels.map(model => model.toJSON()),
      count: documentModels.length,
    });
  });

  public updateDocumentModel = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const documentModel = await this.updateDocumentModelUseCase.execute(id, req.body);
    res.status(200).json({
      success: true,
      data: documentModel.toJSON(),
      message: 'Modelo de documento actualizado exitosamente',
    });
  });

  public deleteDocumentModel = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.deleteDocumentModelUseCase.execute(id);
    res.status(200).json({
      success: true,
      message: 'Modelo de documento eliminado exitosamente',
    });
  });

  public assignDocumentsFromModel = asyncHandler(async (req: Request, res: Response) => {
    const { documentModelId, colaboratorIds, comment } = req.body;
    const createdBy = req.auth?.user?.id;

    const result = await this.assignDocumentsFromModelUseCase.execute({
      documentModelId,
      colaboratorIds,
      createdBy,
      comment,
    });

    res.status(201).json({
      success: true,
      data: {
        created: result.created.map(doc => doc.toJSON()),
        skipped: result.skipped,
        createdCount: result.created.length,
        skippedCount: result.skipped.length,
      },
      message: 'Documentos asignados exitosamente',
    });
  });
}
