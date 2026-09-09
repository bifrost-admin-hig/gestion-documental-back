import { Request, Response } from 'express';
import { CreateDivisionUseCase } from '@domains/division/use-cases/create-division.use-case';
import { GetDivisionUseCase } from '@domains/division/use-cases/get-division.use-case';
import { ListDivisionsUseCase } from '@domains/division/use-cases/list-divisions.use-case';
import { UpdateDivisionUseCase } from '@domains/division/use-cases/update-division.use-case';
import { DeleteDivisionUseCase } from '@domains/division/use-cases/delete-division.use-case';
import { asyncHandler } from '@shared/middleware/validation';

export class DivisionController {
  constructor(
    public readonly createDivisionUseCase: CreateDivisionUseCase,
    public readonly getDivisionUseCase: GetDivisionUseCase,
    public readonly listDivisionsUseCase: ListDivisionsUseCase,
    public readonly updateDivisionUseCase: UpdateDivisionUseCase,
    public readonly deleteDivisionUseCase: DeleteDivisionUseCase,
  ) {}

  public createDivision = asyncHandler(async (req: Request, res: Response) => {
    const division = await this.createDivisionUseCase.execute(req.body);
    res.status(201).json({
      success: true,
      data: division.toJSON(),
      message: 'Division created successfully',
    });
  });

  public getDivisionById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const division = await this.getDivisionUseCase.execute(id);
    res.status(200).json({
      success: true,
      data: division.toJSON(),
    });
  });

  public listDivisions = asyncHandler(async (req: Request, res: Response) => {
    const groupId = req.auth?.groupId;
    const divisions = await this.listDivisionsUseCase.execute(groupId);
    res.status(200).json({
      success: true,
      data: divisions.map((division) => division.toJSON()),
    });
  });

  public updateDivision = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const division = await this.updateDivisionUseCase.execute({
      id,
      ...req.body,
    });
    res.status(200).json({
      success: true,
      data: division.toJSON(),
      message: 'Division updated successfully',
    });
  });

  public deleteDivision = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.deleteDivisionUseCase.execute(id);
    res.status(200).json({
      success: true,
      message: 'Division deleted successfully',
    });
  });
}
