import { Request, Response } from 'express';
import { SaveColaboratorGroupUseCase } from '@domains/colaborator-group/use-cases/save-colaborator-group.use-case';
import { GetColaboratorGroupByIdUseCase, GetAllColaboratorGroupsUseCase } from '@domains/colaborator-group/use-cases/get-colaborator-group.use-case';
import { UpdateColaboratorGroupUseCase, DeleteColaboratorGroupUseCase } from '@domains/colaborator-group/use-cases/update-colaborator-group.use-case';
import { AssignColaboratorsToGroupUseCase } from '@domains/colaborator-group/use-cases/assign-colaborators-to-group.use-case';
import { GetColaboratorsFromGroupUseCase } from '@domains/colaborator-group/use-cases/get-colaborators-from-group.use-case';
import { asyncHandler } from '@shared/middleware/validation';

export class ColaboratorGroupController {
  constructor(
    public readonly saveColaboratorGroupUseCase: SaveColaboratorGroupUseCase,
    public readonly getColaboratorGroupByIdUseCase: GetColaboratorGroupByIdUseCase,
    public readonly getAllColaboratorGroupsUseCase: GetAllColaboratorGroupsUseCase,
    public readonly updateColaboratorGroupUseCase: UpdateColaboratorGroupUseCase,
    public readonly deleteColaboratorGroupUseCase: DeleteColaboratorGroupUseCase,
    public readonly assignColaboratorsToGroupUseCase: AssignColaboratorsToGroupUseCase,
    public readonly getColaboratorsFromGroupUseCase: GetColaboratorsFromGroupUseCase,
  ) {}

  public createGroup = asyncHandler(async (req: Request, res: Response) => {
    const group = await this.saveColaboratorGroupUseCase.execute(req.body);
    res.status(201).json({
      success: true,
      data: group.toJSON(),
      message: 'Colaborator group created successfully',
    });
  });

  public getGroupById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const group = await this.getColaboratorGroupByIdUseCase.execute(Number(id));
    res.status(200).json({
      success: true,
      data: group.toJSON(),
    });
  });

  public getGroups = asyncHandler(async (req: Request, res: Response) => {
    const groups = await this.getAllColaboratorGroupsUseCase.execute(req.auth?.groupId);
    res.status(200).json({
      success: true,
      data: groups.map(g => g.toJSON()),
      count: groups.length,
    });
  });

  public updateGroup = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const group = await this.updateColaboratorGroupUseCase.execute({ id: Number(id), ...req.body });
    res.status(200).json({
      success: true,
      data: group.toJSON(),
      message: 'Colaborator group updated successfully',
    });
  });

  public deleteGroup = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.deleteColaboratorGroupUseCase.execute(Number(id));
    res.status(200).json({
      success: true,
      message: 'Colaborator group deleted successfully',
    });
  });

  public assignColaborators = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { colaboratorIds } = req.body;
    const group = await this.assignColaboratorsToGroupUseCase.execute({ groupId: Number(id), colaboratorIds });
    res.status(200).json({
      success: true,
      data: group.toJSON(),
      message: 'Colaborators assigned successfully',
    });
  });

  public getColaborators = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const colaborators = await this.getColaboratorsFromGroupUseCase.execute(Number(id));
    res.status(200).json({
      success: true,
      data: colaborators.map(c => c.toJSON()),
      count: colaborators.length,
    });
  });
}
