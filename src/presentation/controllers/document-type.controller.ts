import { Request, Response } from 'express';
import { CreateDocumentTypeUseCase } from '@domains/document-type/use-cases/create-document-type.use-case';
import { GetDocumentTypeByIdUseCase, GetAllDocumentTypesUseCase } from '@domains/document-type/use-cases/get-document-type.use-case';
import { UpdateDocumentTypeUseCase, DeleteDocumentTypeUseCase } from '@domains/document-type/use-cases/update-document-type.use-case';
import {
  GetDocumentTypeWithSubtypesUseCase,
  GetAllDocumentTypesWithSubtypesUseCase,
} from '@domains/document-type/use-cases/get-document-type-with-subtypes.use-case';
import { asyncHandler } from '@shared/middleware/validation';

export class DocumentTypeController {
  constructor(
    private readonly createDocumentTypeUseCase: CreateDocumentTypeUseCase,
    private readonly getDocumentTypeByIdUseCase: GetDocumentTypeByIdUseCase,
    private readonly getAllDocumentTypesUseCase: GetAllDocumentTypesUseCase,
    private readonly updateDocumentTypeUseCase: UpdateDocumentTypeUseCase,
    private readonly deleteDocumentTypeUseCase: DeleteDocumentTypeUseCase,
    private readonly getDocumentTypeWithSubtypesUseCase: GetDocumentTypeWithSubtypesUseCase,
    private readonly getAllDocumentTypesWithSubtypesUseCase: GetAllDocumentTypesWithSubtypesUseCase,
  ) {}

  public createDocumentType = asyncHandler(async (req: Request, res: Response) => {
    const documentType = await this.createDocumentTypeUseCase.execute(req.body);
    res.status(201).json({
      success: true,
      data: documentType.toJSON(),
      message: 'Tipo de documento creado exitosamente',
    });
  });

  public getDocumentTypeById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const documentType = await this.getDocumentTypeByIdUseCase.execute(id);
    res.status(200).json({
      success: true,
      data: documentType.toJSON(),
    });
  });

  public getAllDocumentTypes = asyncHandler(async (req: Request, res: Response) => {
    const documentTypes = await this.getAllDocumentTypesUseCase.execute();
    res.status(200).json({
      success: true,
      data: documentTypes.map(documentType => documentType.toJSON()),
      count: documentTypes.length,
    });
  });

  public updateDocumentType = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const documentType = await this.updateDocumentTypeUseCase.execute(id, req.body);
    res.status(200).json({
      success: true,
      data: documentType.toJSON(),
      message: 'Tipo de documento actualizado exitosamente',
    });
  });

  public deleteDocumentType = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.deleteDocumentTypeUseCase.execute(id);
    res.status(200).json({
      success: true,
      message: 'Tipo de documento eliminado exitosamente',
    });
  });

  public getDocumentTypeWithSubtypes = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await this.getDocumentTypeWithSubtypesUseCase.execute(id);
    res.status(200).json({
      success: true,
      data: {
        ...result.documentType.toJSON(),
        subtypes: result.subtypes.map(subtype => subtype.toJSON()),
      },
    });
  });

  public getAllDocumentTypesWithSubtypes = asyncHandler(async (req: Request, res: Response) => {
    const results = await this.getAllDocumentTypesWithSubtypesUseCase.execute();
    res.status(200).json({
      success: true,
      data: results.map(result => ({
        ...result.documentType.toJSON(),
        subtypes: result.subtypes.map(subtype => subtype.toJSON()),
      })),
      count: results.length,
    });
  });
}
