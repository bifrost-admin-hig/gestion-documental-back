import { Request, Response } from 'express';
import { CreateFamilyUseCase } from '@domains/family/use-cases/create-family.use-case';
import { GetFamilyByIdUseCase, GetAllFamiliesUseCase } from '@domains/family/use-cases/get-family.use-case';
import { UpdateFamilyUseCase, DeleteFamilyUseCase } from '@domains/family/use-cases/update-family.use-case';
import { AssignDocumentsFromFamilyUseCase } from '@domains/family/use-cases/assign-documents-from-family.use-case';
import { GetFamiliesByContractUseCase } from '@domains/family/use-cases/get-families-by-contract.use-case';
import { asyncHandler } from '@shared/middleware/validation';
import { parseNum } from '@shared/utils/numbers';

export class FamilyController {
  constructor(
    private readonly createFamilyUseCase: CreateFamilyUseCase,
    private readonly getFamilyByIdUseCase: GetFamilyByIdUseCase,
    private readonly getAllFamiliesUseCase: GetAllFamiliesUseCase,
    private readonly updateFamilyUseCase: UpdateFamilyUseCase,
    private readonly deleteFamilyUseCase: DeleteFamilyUseCase,
    private readonly assignDocumentsFromFamilyUseCase: AssignDocumentsFromFamilyUseCase,
    private readonly getFamiliesByContractUseCase: GetFamiliesByContractUseCase,
  ) {}

  public createFamily = asyncHandler(async (req: Request, res: Response) => {
    const groupId = req.body.groupId;
    const family = await this.createFamilyUseCase.execute({ ...req.body, groupId });
    res.status(201).json({
      success: true,
      data: family.toJSON(),
      message: 'Familia creada exitosamente',
    });
  });

  public getFamilyById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const family = await this.getFamilyByIdUseCase.execute(id);
    res.status(200).json({
      success: true,
      data: family.toJSON(),
    });
  });

  public getAllFamilies = asyncHandler(async (req: Request, res: Response) => {
    const groupId = parseNum(req.query.groupId) || req.auth?.groupId;

    const families = await this.getAllFamiliesUseCase.execute(groupId);
    res.status(200).json({
      success: true,
      data: families.map(family => family.toJSON()),
      count: families.length,
    });
  });

  public getFamiliesByContract = asyncHandler(async (req: Request, res: Response) => {
    const { contractId } = req.params;
    const groupId = req.auth.groupId;
    const families = await this.getFamiliesByContractUseCase.execute(contractId, groupId);
    res.status(200).json({
      success: true,
      data: families.map(family => family.toJSON()),
      count: families.length,
    });
  });

  public updateFamily = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const family = await this.updateFamilyUseCase.execute(id, req.body);
    res.status(200).json({
      success: true,
      data: family.toJSON(),
      message: 'Familia actualizada exitosamente',
    });
  });

  public deleteFamily = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.deleteFamilyUseCase.execute(id);
    res.status(200).json({
      success: true,
      message: 'Familia eliminada exitosamente',
    });
  });

  public assignDocumentsFromFamily = asyncHandler(async (req: Request, res: Response) => {
    const { familyId, colaboratorIds, comment } = req.body;
    const createdBy = (req as any).user?.id || 'system';

    const result = await this.assignDocumentsFromFamilyUseCase.execute({
      familyId,
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
