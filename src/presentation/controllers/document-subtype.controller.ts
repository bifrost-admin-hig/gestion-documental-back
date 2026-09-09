import { Request, Response } from 'express';
import { CreateDocumentSubtypeUseCase } from '@domains/document-subtype/use-cases/create-document-subtype.use-case';
import {
  GetDocumentSubtypeByIdUseCase,
  GetAllDocumentSubtypesUseCase,
  GetDocumentSubtypesByDocumentTypeIdUseCase,
} from '@domains/document-subtype/use-cases/get-document-subtype.use-case';
import { UpdateDocumentSubtypeUseCase, DeleteDocumentSubtypeUseCase } from '@domains/document-subtype/use-cases/update-document-subtype.use-case';
import { asyncHandler } from '@shared/middleware/validation';

export class DocumentSubtypeController {
  constructor(
    private readonly createDocumentSubtypeUseCase: CreateDocumentSubtypeUseCase,
    private readonly getDocumentSubtypeByIdUseCase: GetDocumentSubtypeByIdUseCase,
    private readonly getAllDocumentSubtypesUseCase: GetAllDocumentSubtypesUseCase,
    private readonly getDocumentSubtypesByDocumentTypeIdUseCase: GetDocumentSubtypesByDocumentTypeIdUseCase,
    private readonly updateDocumentSubtypeUseCase: UpdateDocumentSubtypeUseCase,
    private readonly deleteDocumentSubtypeUseCase: DeleteDocumentSubtypeUseCase,
  ) {}

  public createDocumentSubtype = asyncHandler(async (req: Request, res: Response) => {
    const documentSubtype = await this.createDocumentSubtypeUseCase.execute(req.body);
    res.status(201).json({
      success: true,
      data: documentSubtype.toJSON(),
      message: 'Subtipo de documento creado exitosamente',
    });
  });

  public getDocumentSubtypeById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const documentSubtype = await this.getDocumentSubtypeByIdUseCase.execute(id);
    res.status(200).json({
      success: true,
      data: documentSubtype.toJSON(),
    });
  });

  public getAllDocumentSubtypes = asyncHandler(async (req: Request, res: Response) => {
    const documentSubtypes = await this.getAllDocumentSubtypesUseCase.execute();
    res.status(200).json({
      success: true,
      data: documentSubtypes.map(documentSubtype => documentSubtype.toJSON()),
      count: documentSubtypes.length,
    });
  });

  public getDocumentSubtypesByDocumentTypeId = asyncHandler(async (req: Request, res: Response) => {
    const { documentTypeId } = req.params;
    const documentSubtypes = await this.getDocumentSubtypesByDocumentTypeIdUseCase.execute(documentTypeId);
    res.status(200).json({
      success: true,
      data: documentSubtypes.map(documentSubtype => documentSubtype.toJSON()),
      count: documentSubtypes.length,
    });
  });

  public updateDocumentSubtype = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const documentSubtype = await this.updateDocumentSubtypeUseCase.execute(id, req.body);
    res.status(200).json({
      success: true,
      data: documentSubtype.toJSON(),
      message: 'Subtipo de documento actualizado exitosamente',
    });
  });

  public deleteDocumentSubtype = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.deleteDocumentSubtypeUseCase.execute(id);
    res.status(200).json({
      success: true,
      message: 'Subtipo de documento eliminado exitosamente',
    });
  });
}
