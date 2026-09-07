import { Request, Response } from 'express';
import { CreateDocumentTemplateUseCase } from '@domains/document-template/use-cases/create-document-template.use-case';
import {
  GetDocumentTemplateByIdUseCase,
  GetAllDocumentTemplatesUseCase,
  GetDocumentTemplateVersionsUseCase,
  GetNextDocumentTemplateCodeUseCase,
} from '@domains/document-template/use-cases/get-document-template.use-case';
import {
  CreateNewDocumentTemplateVersionUseCase,
  DeleteDocumentTemplateUseCase,
} from '@domains/document-template/use-cases/update-document-template.use-case';
import { asyncHandler } from '@shared/middleware/validation';
import { parseNum } from '@shared/utils/numbers';
import { ValidationError } from '@shared/domain/errors';

export class DocumentTemplateController {
  constructor(
    private readonly createDocumentTemplateUseCase: CreateDocumentTemplateUseCase,
    private readonly getDocumentTemplateByIdUseCase: GetDocumentTemplateByIdUseCase,
    private readonly getAllDocumentTemplatesUseCase: GetAllDocumentTemplatesUseCase,
    private readonly getDocumentTemplateVersionsUseCase: GetDocumentTemplateVersionsUseCase,
    private readonly getNextDocumentTemplateCodeUseCase: GetNextDocumentTemplateCodeUseCase,
    private readonly createNewVersionUseCase: CreateNewDocumentTemplateVersionUseCase,
    private readonly deleteDocumentTemplateUseCase: DeleteDocumentTemplateUseCase,
  ) {}

  public createDocumentTemplate = asyncHandler(async (req: Request, res: Response) => {
    const groupId = req.auth?.groupId ?? req.body.groupId;
    const template = await this.createDocumentTemplateUseCase.execute({
      ...req.body,
      groupId,
      createdBy: req.auth?.userId,
    });
    res.status(201).json({
      success: true,
      data: template.toJSON(),
      message: 'Plantilla de documento creada exitosamente',
    });
  });

  public getAllDocumentTemplates = asyncHandler(async (req: Request, res: Response) => {
    const groupId = parseNum(req.query.groupId) || req.auth?.groupId;
    const templates = await this.getAllDocumentTemplatesUseCase.execute(groupId);
    res.status(200).json({
      success: true,
      data: templates.map(t => t.toJSON()),
      count: templates.length,
    });
  });

  public getDocumentTemplateById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const template = await this.getDocumentTemplateByIdUseCase.execute(id);
    res.status(200).json({
      success: true,
      data: template.toJSON(),
    });
  });

  public getNextDocumentTemplateCode = asyncHandler(async (req: Request, res: Response) => {
    const groupId = parseNum(req.query.groupId) || req.auth?.groupId;
    if (!groupId) {
      throw new ValidationError('El groupId es requerido', 'groupId');
    }
    const code = await this.getNextDocumentTemplateCodeUseCase.execute(groupId);
    res.status(200).json({
      success: true,
      data: { code },
    });
  });

  public getDocumentTemplateVersions = asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.params;
    const versions = await this.getDocumentTemplateVersionsUseCase.execute(code);
    res.status(200).json({
      success: true,
      data: versions.map(t => t.toJSON()),
      count: versions.length,
    });
  });

  public createNewVersion = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const template = await this.createNewVersionUseCase.execute(id, {
      ...req.body,
      createdBy: req.auth?.userId,
    });
    res.status(201).json({
      success: true,
      data: template.toJSON(),
      message: 'Nueva versión de plantilla creada exitosamente',
    });
  });

  public deleteDocumentTemplate = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.deleteDocumentTemplateUseCase.execute(id);
    res.status(200).json({
      success: true,
      message: 'Plantilla de documento eliminada exitosamente',
    });
  });
}
