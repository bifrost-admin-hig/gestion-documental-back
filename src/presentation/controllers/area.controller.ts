import { Request, Response } from 'express';
import { CreateAreaUseCase } from '@domains/area/use-cases/create-area.use-case';
import { GetAreaUseCase } from '@domains/area/use-cases/get-area.use-case';
import { ListAreasUseCase } from '@domains/area/use-cases/list-areas.use-case';
import { UpdateAreaUseCase } from '@domains/area/use-cases/update-area.use-case';
import { DeleteAreaUseCase } from '@domains/area/use-cases/delete-area.use-case';
import { asyncHandler } from '@shared/middleware/validation';

export class AreaController {
  constructor(
    public readonly createAreaUseCase: CreateAreaUseCase,
    public readonly getAreaUseCase: GetAreaUseCase,
    public readonly listAreasUseCase: ListAreasUseCase,
    public readonly updateAreaUseCase: UpdateAreaUseCase,
    public readonly deleteAreaUseCase: DeleteAreaUseCase,
  ) {}

  public createArea = asyncHandler(async (req: Request, res: Response) => {
    const area = await this.createAreaUseCase.execute(req.body);
    res.status(201).json({
      success: true,
      data: area.toJSON(),
      message: 'Area created successfully',
    });
  });

  public getAreaById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const area = await this.getAreaUseCase.execute(id);
    res.status(200).json({
      success: true,
      data: area.toJSON(),
    });
  });

  public listAreas = asyncHandler(async (req: Request, res: Response) => {
    const groupId = req.auth?.groupId;
    const areas = await this.listAreasUseCase.execute(groupId);
    res.status(200).json({
      success: true,
      data: areas.map((area) => area.toJSON()),
    });
  });

  public updateArea = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const area = await this.updateAreaUseCase.execute({
      id,
      ...req.body,
    });
    res.status(200).json({
      success: true,
      data: area.toJSON(),
      message: 'Area updated successfully',
    });
  });

  public deleteArea = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.deleteAreaUseCase.execute(id);
    res.status(200).json({
      success: true,
      message: 'Area deleted successfully',
    });
  });
}
